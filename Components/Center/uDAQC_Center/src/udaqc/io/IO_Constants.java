package udaqc.io;

public class IO_Constants {
		
	public static class Command_IDs
	{
		public static final short system_description=1;
		public static final short group_description=2;
		public static final short emptynode_description=3;		
		public static final short value_description=4;		
		public static final short modifiablevalue_description=5;		
		public static final short data=6;
		public static final short handshake=7;
		public static final short auth_request=8;
		public static final short auth_provision=9;
		public static final short modifiablevalue_modification=10;
		public static final short request_subscription=11;
		public static final short history=12;
		public static final short passthrough=13;
		public static final short new_device_available=14;
		public static final short history_update=15;
		public static final short timesync_request=16;
		public static final short timesync_response=17;
		public static final short history_request=18;
	}
	
	public static class DataTypes
	{
		public static final short undefined=-1;
		public static final short signed_integer=1;		
		public static final short unsigned_integer=2;
		public static final short floating_point=3;	
		public static final short bool=4;
	}	
}
