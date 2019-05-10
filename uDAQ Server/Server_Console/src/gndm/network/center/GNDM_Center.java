package gndm.network.center;

import java.io.IOException;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Path;
import java.util.TreeMap;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.apache.commons.lang.exception.ExceptionUtils;
import org.apache.mina.core.buffer.IoBuffer;
import org.apache.mina.core.session.IdleStatus;
import org.apache.mina.core.session.IoSession;

import gndm.io.IO_Constants;
import gndm.io.IO_Constants.Command_IDs;
import gndm.io.log.IO_System_Logged;
import gndm.network.center.command.Command;
import gndm.network.passthrough.Secondary_Server;
import gndm.network.passthrough.command.PT_Command;
import network.tcp.server.TCP_Server;
import network.udp.UDP_Sender;
import logging.Loghandler_File;

public class GNDM_Center extends TCP_Server
{
	protected Secondary_Server passthrough_server = null;

	public GNDM_Handler handler = null;

	private Logger log;
	private Loghandler_File loghandler; // only record warning level output

	private TreeMap<Long,GNDM_DirectDevice> devices = new TreeMap<Long,GNDM_DirectDevice>();

	private Path path;

	public GNDM_Center(String Threadname, Path path, GNDM_Handler handler)
	{
		super(Threadname, true, false);
		
		this.handler = handler;
		this.path = path;
				
		passthrough_server = new Secondary_Server(Threadname, this);

		// super(Threadname, IO_Constants.Constants.tcp_id_port);
		IO_System_Logged.LoadSavedSystems(path);
		
		handler.ClientListUpdate();

		log = Logger.getLogger(Threadname);
		loghandler = new Loghandler_File(Level.WARNING);

		loghandler.addlog(log);
		log.setLevel(Level.INFO); // Show info level logging on system.out

		System.out.println("Starting " + Threadname);
		
		this.start();
	}

	@Override
	public void serverinitialized()
	{
		try
		{
			System.out.println("Sending multicast.");

			IoBuffer message = IoBuffer.allocate(Integer.BYTES);
			message.order(ByteOrder.LITTLE_ENDIAN);
			message.putInt(this.Port());
			Command c = new Command(IO_Constants.Command_IDs.request_subscription, message.array());

			UDP_Sender.send(c, IO_Constants.Constants.udp_broadcast);
		} catch (IOException e)
		{
			System.out.println(e.getMessage());
		}
	}

	@Override
	public void messageReceived(IoSession session, Object message)
	{
		Command c = (Command) message;
		
		Passthrough_to_Secondaries(session, c);
		
		ByteBuffer data = c.getmessage();

		switch (c.Header().command_id)
		{
			case Command_IDs.group_description:
			{
				//The only time a group description command ID is received in this setting is when an entire IO_System is being sent.
				//Initialize as an IO_System, not an IO_Group. IO_Groups within IO_Groups are all initialized within the function call to construct an IO_System
				
				GNDM_DirectDevice new_device = new GNDM_DirectDevice(path, data, this, session);
				devices.put(session.getId(), new_device);
				
				if (handler != null)
				{
					handler.ClientListUpdate();
				}
				
				log.info("Group description message for " + new_device.System().Name() + " received.");
			}
			break;
		  case Command_IDs.emptyreporter_description:
			log.info("Empty reporter description message from server: " + c.getString());
			break;
		  case Command_IDs.value_description:
			log.info("Value description message from server: " + c.getString());
			break;
		  case Command_IDs.modifiablevalue_description:
			log.info("Modifiable value description message from server: " + c.getString());
			break;
		  case Command_IDs.data:
		  {
			IO_System_Logged system = devices.get(session.getId()).System();
			if(system != null)
			{				
				handler.ReceivingDataUpdate();
				system.ReceiveData(data);
				handler.ReceivedDataUpdate();
				
				log.info("Received data from " + system.Name());
			}
		  }
		  break;
		  default:
			System.out.println("Received command " + c.Header().command_id);
			break;
		}
	}

	@Override
	public void sessionIdle(IoSession session, IdleStatus status)
	{// throws Exception
		super.sessionIdle(session, status);
		Command c = new Command(Command_IDs.handshake);
		System.out.println("Sending manual handshake.");
		session.write(c);
	}

	@Override
	public void sessionClosed(IoSession session)
	{
		super.sessionClosed(session);
		devices.get(session.getId()).System().ClientDisconnected();
		devices.remove(session.getId());
	}

	@Override
	public void sessionOpened(IoSession session)
	{
		super.sessionOpened(session);
	}

	@Override
	public void exceptionCaught(IoSession session, Throwable cause)
	{// throws Exception{
		if (cause.getClass().equals(java.io.IOException.class) && cause.getMessage().equals("Connection reset by peer"))
		{
			return;
		}
		if (cause.getClass().equals(org.apache.mina.core.write.WriteToClosedSessionException.class))
		{
			return;
		}
		try
		{
			super.exceptionCaught(session, cause);
		} catch (Exception e)
		{
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		log.severe(ExceptionUtils.getStackTrace(cause));
	}

	public void Passthrough_to_Secondaries(IoSession session, Command c)
	{
		if(passthrough_server!=null)
		{
			GNDM_DirectDevice dd = devices.get(session.getId());
			if(dd!=null)
			{
				IO_System_Logged system = dd.System();
				PT_Command ptc = new PT_Command(system.getSystemID(),c);
				passthrough_server.broadcast(ptc);
			}
		}
	}
	
	public void Passthrough_from_Secondary(PT_Command ptc)
	{
		Command c = ptc.containedCommand();
		IO_System_Logged.getSystem(ptc.source_id).Device().Send_Command(c);
	}
}