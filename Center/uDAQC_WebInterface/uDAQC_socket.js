"use strict";

//let wsUri = "wss://echo.websocket.org/"; //wss is SSL, unsecure would be ws://
//let wsUri = "wss://localhost:49154/socket/"
let websocket;

function init()
{
  testWebSocket();
}

function testWebSocket()
{
  let ws_header = "wss://";
  let ws_loc = ":49154/socket/";
  let websocket_url = ws_header + window.location.hostname + ws_loc;
  console.log("Websocket address " + String(websocket_url));

  websocket = new WebSocket(websocket_url);
  websocket.binaryType = "arraybuffer";
  websocket.onopen = function(evt) { onOpen(evt); };
  websocket.onclose = function(evt) { onClose(evt); };
  websocket.onmessage = function(evt) { onMessage(evt); };
  websocket.onerror = function(evt) { onError(evt); };
}

function onOpen(evt)
{
  let x = document.getElementById("connection_alert");
  x.className = "alert alert-success";
  x.innerHTML = "Connected";
  console.log(evt);
}

function onClose(evt)
{
  let x = document.getElementById("connection_alert");
  x.className = "alert alert-warning";
  x.innerHTML = "No connection";
  console.log(evt);
}

function handlePassthroughCommand(ptcom)
{
  switch(ptcom.PTcommand_ID)
  {
    case IO_Constants.group_description:
      new IO_Device(ptcom.message,ptcom.source_ID);
      update_devices();
      break;
    case IO_Constants.history:
      handleHistory(ptcom);
      break;
    default:
    console.log("Unexpected nested command in passthrough " +  ptcom.PTcommand_ID + ".");
  }
}

function handleHistory(ptcom)
{
  let regime = ptcom.message.getInt32();
  let max_size = ptcom.message.getInt64();

  console.log("History received for regime " + regime);

  let device = IO.devices.get(ptcom.source_ID);
  let entry_size = 1 + 8 + device.system.ioValueCount * 4;

  let epochs = device.system.getEpochs(regime);

  let test_count=0;
  while(ptcom.message.Remaining()>entry_size)
  {
    //console.log("Processing entry.");
    epochs.processEntry(ptcom.message);
    test_count++;
    if(test_count===3)
    {
      //console.debug("Test breakup of data");
      epochs.startNewEpoch();
    }
  }

  //console.log("History interpretation finished.");

  if(regime===0){
    console.debug("Setting to live regime.");
    device.system.setChartRegime(regime);
  }


}

function onMessage(evt)
{
  let c = new Command(evt.data);

  //All commands should be passthrough as of now
  switch(c.command_ID)
  {
    case IO_Constants.passthrough:
      {
        let ptcom = new PTCommand(c);
        //console.log("Passthrough command received. Nested command is " + ptcom.PTcommand_ID + ".");
        handlePassthroughCommand(ptcom);
      }
      break;
    default:
      console.log("Unexpected command " + c.command_ID + " of length " + c.message_length + " received.");
  }
}

function update_devices()
{
  let new_data = [];
  console.log("Updating devices.");

  //Clear the charts
  let dashboard = document.getElementById("chart_space");
  while(dashboard.firstChild)
  {
    dashboard.removeChild(dashboard.firstChild);
  }

  for(let key of IO.devices.keys())
  {
    let device = IO.devices.get(key);

    //Add this to the jsTree list
    new_data = new_data.concat(device.system.toNode());

    //Add thsi to the chart nodes
    dashboard.appendChild(device.system.createDashboard());
  }
  console.log("Changing nodes with " + new_data.length + " members.");
  console.log(new_data);
  changeNodes(new_data);
}

function onError(evt)
{
  console.log(evt.data);
  let x = document.getElementById("connection_alert");
  x.className = "alert alert-danger";
  x.innerHTML = "Error. Check console.";
}

window.addEventListener("load", init, false);
