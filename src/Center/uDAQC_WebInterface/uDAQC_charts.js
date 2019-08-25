"use strict";
function createChart(canvas)
{
  return new Chart(canvas.getContext("2d"),
    {
      // The type of chart we want to create
      type: "line",

      // The data for our dataset
      data: {
          labels: [
            moment().add(0, "d").toDate(),
            moment().add(1, "d").toDate()
          ],
          datasets: [{
              label: "My First dataset",
              fill: false, //no filling under the curve
              //backgroundColor: "rgb(0,0,0,0)", //transparent (this fills under the curve)
              borderColor: "rgb(255, 0, 0, 255)",
              data: [
                1,
                10
              ],
              //pointRadius: 0 //don't render points, but if this is don't you can't hover to get value
              //pointBackgroundColor: "rgb(0,0,0,0)",
              pointBorderColor: "rgb(0,0,0,0)" //transparent
          }]
      },

      // Configuration options go here
      options:
      {
        legend:
        {
          display: true,
          position: "bottom"
        },
        scales:
        {
          xAxes: [{
            type: "time",
            time:{
              min:0,
              max:0
            }
          }]
        },
        animation:false,
        elements:{line:{tension:0}}
      }
  });
}

function changeRegime(regime)
{
  console.log("Changing regime to " + regime);
  Globals.current_regime=regime;
  console.log(IO.devices);
  for(let n=0;n<IO.devices.length;n++)
  {
    IO.devices[n].system.setChartRegime(regime);
  }

  for(let key of IO.devices.keys())
  {
    let device = IO.devices.get(key);
    device.system.setChartRegime(regime);
  }
}

let x_adjust;
let adjustX = function()
{
  let array = x_adjust.element.dataset.value.split(",").map(Number);

  for(let key of IO.devices.keys())
  {
    let device = IO.devices.get(key);
    device.system.updateChartXAxis(array[0],array[1]);
  }
};

let trimX = function(e)
{
  console.log("Trim x function called.");
  for(let key of IO.devices.keys())
  {
    let device = IO.devices.get(key);
    device.system.trimChartXAxis();
  }
  x_adjust.setValue([0,1]);
};

let resetX = function(e)
{
  console.log("Reset x function called.");
  for(let key of IO.devices.keys())
  {
    let device = IO.devices.get(key);
    device.system.resetChartXAxis();
  }
  x_adjust.setValue([0,1]);
};

window.onload=function(){
  console.log("Window loaded.");
  document.getElementById("ul_regime_live").onclick=function(){changeRegime(Regimes.live);};
  document.getElementById("ul_regime_minute").onclick=function(){changeRegime(Regimes.minute);};
  document.getElementById("ul_regime_hour").onclick=function(){changeRegime(Regimes.hour);};
  document.getElementById("ul_regime_day").onclick=function(){changeRegime(Regimes.day);};
  x_adjust = $("#x_adjust_rangeselector").slider().on("slideStop", adjustX).data("slider");

  $("#x_trim_button").on("click",trimX);
  $("#x_reset_button").on("click",resetX);
};