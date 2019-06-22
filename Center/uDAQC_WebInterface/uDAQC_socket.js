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

class Epochs{
  constructor(value_count)
  {
    this.current_epoch_index = 0;
    this.timestamps = [];
    this.values = new Array(value_count);
    for(let n = 0; n<this.values.length;n++)
    {
      this.values[n]=[];
    }
    //this.startNewEpoch();
  }
  startNewEpoch()
  {
    if(this.timestamps.length)
    {
      this.current_epoch_index = this.timestamps.length;
      this.timestamps.push(this.timestamps[this.timestamps.length-1]);
      for(let n = 0; n<this.values.length;n++)
      {
        this.values[n].push(null);
      }
    }
  }

  mergeLastAndFirst()
  {
    console.log("Merging first and last.");

    if(this.current_epoch_index<=0 || this.current_epoch_index>=this.timestamps.length-1)
    {
      return;
    }

    Epochs.reorder(this.timestamps,this.current_epoch_index);
    for(let n = 0; n<this.values.length;n++)
    {
      Epochs.reorder(this.timestamps[n],this.current_epoch_index);
    }
    this.current_epoch_index=this.timestamps.length;
  }

  static reorder(array, index)
  {
    let first = array.slice(0,index);
    let last = array.slice(index);
    array = last.concat(first);
  }

  processEntry(message)
  {
    const new_epoch_flag = Math.pow(2,0);
    const split_epoch_flag = Math.pow(2,1);

    let flag = message.getInt8();

    console.log("Flag = " + flag);

    if(flag&new_epoch_flag){
        //Start a new epoch
        console.log("New epoch flag.");
        this.startNewEpoch();
    }

    if(flag&split_epoch_flag){
      //Merge with first epoch
      console.log("Split flag.");
      this.mergeLastAndFirst();
    }

    let millis=message.getInt64();

    let seconds=millis/1000;
    let millis_remainder=millis%1000;
    let timestamp=moment.unix(seconds);
    timestamp.milliseconds(millis_remainder);

    this.timestamps.push(timestamp);

    for(let n=0;n<this.values.length;n++)
    {
      //this.value_arrays[n][this.value_arrays[n].length-1].push(message.getFloat32());
      this.values[n].push(message.getFloat32());
    }
  }
  earliestTime()
  {
    let retval=this.timestamps[0];
    for(let n=0;n<this.timestamps.length;n++)
    {
      if(retval.isAfter(this.timestamps[n]))
      {
        retval = this.timestamps[n];
      }
    }
    return retval;
  }
  latestTime()
  {
    let retval=this.timestamps[0];
    for(let n=0;n<this.timestamps.length;n++)
    {
      if(retval.isBefore(this.timestamps[n]))
      {
        retval = this.timestamps[n];
      }
    }
    return retval;
  }
}

function handleHistory(ptcom)
{
  let regime = ptcom.message.getInt32();
  let max_size = ptcom.message.getInt64();


  if(regime!==0){console.debug("Not processing non-live history.");return;}

  console.log("Regime " + regime);
  console.log("Max size is " + max_size);
  console.log("Received size is " + ptcom.message.Remaining());

  let device = IO.devices.get(ptcom.source_ID);
  let entry_size = 1 + 8 + device.system.ioValueCount * 4;

  let epochs = new Epochs(device.system.ioValueCount);

  let test_count=0;
  while(ptcom.message.Remaining()>entry_size)
  {
    console.log("Processing entry.");
    epochs.processEntry(ptcom.message);
    test_count++;
    if(test_count===3)
    {
      console.debug("Test breakup of data");
      epochs.startNewEpoch();
    }
  }

  console.log("History interpretation finished.");
  console.log(epochs);

  //This is working but it isn't a good way to load data into charts.

  //chart.labels = epochs[0].
  //chart.datasets[0].data=;
  let values = device.system.getIOValues();
  for(let i=0;i<values.length;i++)
  {

    values[i].chart.data.labels = epochs.timestamps;
    values[i].chart.options.scales.xAxes[0].ticks.suggestedMin = epochs.earliestTime();
    values[i].chart.options.scales.xAxes[0].ticks.suggestedMin = epochs.latestTime();

    values[i].chart.data.datasets=
    [
      {
        label: "Data",
        fill: false, //no filling under the curve
        //backgroundColor: "rgb(0,0,0,0)", //transparent (this fills under the curve)
        borderColor: "rgb(255, 0, 0, 255)",
        data: epochs.values[i],
        labels: epochs.timestamps,
        //pointRadius: 0 //don't render points, but if this is don't you can't hover to get value
        //pointBackgroundColor: "rgb(0,0,0,0)",
        pointBorderColor: "rgb(0,0,0,0)", //transparent
        spanGaps: false
      }
    ];

    values[i].chart.update();

    console.log(values[i].chart.data);
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
        console.log("Passthrough command received. Nested command is " + ptcom.PTcommand_ID + ".");
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