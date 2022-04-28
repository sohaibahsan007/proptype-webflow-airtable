

/// this will go into body section
// get chart dom
const chartDom = document.getElementById('chart');
var Airtable = require('airtable');
  // setup airtable
const airtableBase = new Airtable({apiKey: 'keyVpI72WUwwks62v'}).base('appsE68H46tsOnWMG');
// init echart instance
const chart = echarts.init(chartDom);
let progressPercentage = null;

window.onload = function() {
  const form = document.getElementById("chart-form");
  form.onsubmit = OnSubmit.bind(form);
  form.onchange = OnSubmit.bind(form);
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1"){
    loadTestValue();
  }
  OnSubmit();
};


function getDates(startDate, endDate, interval) {
  const duration = endDate - startDate;
  const steps = duration / interval;
  return Array.from({length: steps+1}, (v,i) => new Date(startDate.valueOf() + (interval * i)));
}
function prepareDataForProjection(formData){
  const startDate = new Date(formData.startDate);
  const currentDate = new Date(formData.currentDate);
  let datesList = getDates(startDate, currentDate, 1000*60*60*24);
  const daysToAdd = (datesList?.length)/8;
  currentDate.setDate(currentDate.getDate() + daysToAdd);
  datesList = getDates(startDate, currentDate, 1000*60*60*24);
  const startValue = parseFloat(formData.startValue);
  const currentValue = parseFloat(formData.currentValue);
  const calculationValue = parseFloat(formData.calculationValue);

  // prepare the projection list
  let projectedList = prepareListForProjection(datesList, startValue, currentValue,calculationValue);

  // find max value available in projected list
  let nearestValue = projectedList[projectedList?.length-1]?.startValue;

  // compare with currentValue, if the difference is greater than 1, then repeat the process by adding 25% more dates into current projected list.
  // repeat until it is less than 1.
  // this will give us always a projection list which has greater value than current value.
  // which will make a good chart.
  let difference  = currentValue - nearestValue;

  if(difference < 0.1) return projectedList;

  do {
    currentDate.setDate(currentDate.getDate() + daysToAdd);
    datesList = getDates(startDate, currentDate, 1000*60*60*24);
    projectedList = prepareListForProjection(datesList, startValue, currentValue,calculationValue);
    nearestValue = projectedList[projectedList?.length-1]?.startValue;
    difference = currentValue - nearestValue;
  } while (difference > 0);
  return projectedList;

}
function prepareListForProjection(datesList, startValue, currentValue,calculationValue){
  const projectList = [];
  calculationValue = (calculationValue ?? 1)/100;
  // irritate by each date and prepare the data for the chart
  for(let i=0; i<datesList.length; i++){
    const date = datesList[i];

    // at 1% improvement, the value will be 1.01 times the previous value
    const improvementValue = i > 0 ? (projectList[i-1].startValue+ (projectList[i-1].startValue*calculationValue)): 0;

    // at 1% decline, the value will be 0.99 times the previous value
    const declineValue  = i > 0 ? (projectList[i-1].startValueNegative - (projectList[i-1].startValueNegative*calculationValue)): 0;

    const _startValue = i == 0 ?  startValue : improvementValue;
    const _startValueNegative = i == 0 ?  startValue : declineValue;
    const _currentValue =  i == 0 ? null : ((currentValue < projectList[i-1].startValue || date == null || _startValue == null) ? null : improvementValue);
    const _currentValueNegative = startValue < currentValue ? null :
    (i == 0 ? startValue : ((currentValue > projectList[i-1].startValueNegative || date == null || _startValueNegative == null) ? null : declineValue));

    projectList.push({
      id: i+1,
      date: date?.toLocaleDateString("en-US"),
      startValue: _startValue,
      startValueNegative: _startValueNegative,
      progressValue: _startValue,
      progressValueNegative: _startValueNegative,
      currentValue: _currentValue,
      currentValueNegative: _currentValueNegative,
      goalAchievedOnIndex: _currentValue > currentValue ? _currentValue : null,
      goalAchievedOnIndexNegative: _currentValueNegative < currentValue ? _currentValueNegative : null,
    });
  }
  return projectList;
}
function loadTestValue(){
  document.getElementById('fullName').value = 'Sohaib Ahsan';
  document.getElementById('email').value = 's@s.com';
  document.getElementById('startDate').value = '2022-01-01';
  document.getElementById('currentDate').value = '2022-12-31';
  document.getElementById('startValue').value = 2;
  // document.getElementById('currentValue').value = 60;
}
function clearForm(){
  document.getElementById('fullName').value = '';
  document.getElementById('email').value = '';
  document.getElementById('startDate').value = '';
  document.getElementById('currentDate').value = '';
  document.getElementById('startValue').value = '';
  document.getElementById('currentValue').value = '';
}
function OnSubmit(event){

  if(event) event.preventDefault();
  const fullName = document.getElementById('fullName')?.value;
  const email = document.getElementById('email')?.value;
  const startDate = document.getElementById('startDate')?.value;
  const currentDate = document.getElementById('currentDate')?.value;
  const startValue = document.getElementById('startValue')?.value;
  const currentValue = document.getElementById('currentValue')?.value;
  let calculationValue = document.getElementById('calculationValue')?.value;
  calculationValue = calculationValue < 0.1 ? 0.1 : calculationValue;
  document.getElementById('calculationValueLabel').innerHTML = calculationValue + '%';
  const formData = {fullName, email, startDate, currentDate, startValue, currentValue,calculationValue};
  let error = "";
  if(fullName == "" || fullName == undefined){
    error += "Please enter your full name.\n";
  }
  if(email == "" || email == undefined){
    error += "Please enter your email.\n";
  }
  if(startDate == "" || startDate == undefined){
    error += "Please enter your start date.\n";
  }else if(currentDate == "" || currentDate == undefined){
    const date = new Date(startDate);
    const date_NextYear = new Date(date.setDate(date.getDate() + 365));
    document.getElementById('currentDate').value = date_NextYear?.toJSON()?.slice(0,10);
  }
  if(currentDate == "" || currentDate == undefined){
    error += "Please enter your current date.\n";
  }
  if(startValue == "" || startValue == undefined){
    error += "Please enter your start value.\n";
  }
  if(startValue != "" && currentValue != "" && startValue == currentValue){
    error += "Start value and current value cannot be same.\n";
    alert("Start value and current value cannot be same.\n");
  }

  if(startDate != "" && currentDate != ""){
    let validate7DaysDifference = new Date(startDate);
    validate7DaysDifference = validate7DaysDifference.setDate(validate7DaysDifference.getDate() + 7);

    if(new Date(validate7DaysDifference) >= new Date(currentDate)){
      error += "Start date cannot be less than current date.\n";
       alert("Current date must have atleast 7 days of difference from Start date.\n");
    }
  }

  if(error == ""){
    document.getElementById('submitBtn').disabled = false;
    const projectedData = prepareDataForProjection(formData);
    drawChart(projectedData,formData);

    if(event?.type == "submit"){
      document.getElementById('submitBtn').disabled = true;
       submitRecordToAirTable(formData);
    }
  }else if(error != "" && event?.type == "submit"){
    alert(error);
  }else if(error != "" && event?.type == "change"){
    console.error(error);
    document.getElementById('submitBtn').disabled = true;
  }
}
function nFormatter(num, digits) {
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" }
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var item = lookup.slice().reverse().find(function(item) {
    return num >= item?.value;
  });
  return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
}
function submitRecordToAirTable(formData){
  airtableBase('User_Data').create([
    {
      "fields": {
        "full_name": formData?.fullName,
        "email": formData?.email,
        "score_percentage": progressPercentage/100,
        "type": progressPercentage > -1 ? "Improvement" : "Decline",
      }
    },
  ], function(err) {
    document.getElementById('submitBtn').disabled = false;
    if (err) {
      alert(err);
      return;
    }
    clearForm();
    alert('Succefully Submitted');
  });
}
const seriesSharedOption = {
  symbol: "none",
  symbolSize: 2,
  type: 'line',
  smooth: true,
  clip: true,
  lineStyle: {
    width: 3,
  },
  emphasis: {
    focus: "series",
  },
};
const progressMarkLineStyle={
  lineStyle: {
    width: 5,
    color: '#4285f4',
    type: 'solid',
    curveness: 1,
    shadowBlur: 6,
    shadowOffsetX: 3,
    shadowOffsetY: 3,
    shadowColor: 'rgba(0,0,0,0.2)'
  },
  symbolSize: 0
};

function drawChart(projectedData,formData){

  try {
  const color = ['#fbbc04', '#ee6666',  '#3ba272','#3ba272','#3ba272','#3ba272','#3ba272','#3ba272'];
  const findCurrentProgress = projectedData?.find(item => item?.goalAchievedOnIndex != null);
  const currentProgressIndex = projectedData?.findIndex(item => item?.goalAchievedOnIndex != null);
  const findCurrentProgressNegative = projectedData?.find(item => item?.goalAchievedOnIndexNegative != null);
  const currentProgress = (findCurrentProgress ?? findCurrentProgressNegative) ?? projectedData?.[0];
  const achievementPoint = projectedData?.find(item => new Date(item?.date)?.toLocaleDateString("en-US") == new Date(formData.currentDate)?.toLocaleDateString("en-US"));
  const symbolRotateBasedOnProgress = 1 - currentProgressIndex/projectedData?.length;
  const achievementPercentage = ((findCurrentProgress?.startValue/ achievementPoint?.startValue)*100);
  const achievementPercentageNegative = ((achievementPoint?.startValueNegative/findCurrentProgressNegative?.startValueNegative)*100);
  progressPercentage = (parseFloat(achievementPercentage > -1 ? achievementPercentage : -1*achievementPercentageNegative) || 0)?.toFixed(2);
  const progressRemaining = (100 - (progressPercentage < 0 ? 0 : progressPercentage)).toFixed(2);
  const daysRemaining = parseInt(achievementPoint?.id - currentProgress?.id);
  const scoreRemaining = parseFloat(achievementPoint?.startValue - currentProgress?.startValue).toFixed(2);
  const remainingProgress = JSON.parse(JSON.stringify(currentProgress));
  remainingProgress.date = currentProgress?.currentValue ? currentProgress?.date : projectedData?.[0].date;
  remainingProgress.currentValue = currentProgress?.currentValue ?? projectedData?.[0].startValue;
  const rich = {
    bold: {
        fontWeight: 'bold',
    },
   };
  const markPoint ={
    data: [
      {
        xAxis: currentProgress?.date,
        yAxis: currentProgress?.goalAchievedOnIndex ?? currentProgress?.goalAchievedOnIndexNegative,
        symbol: 'arrow',
        symbolSize: 20,
        symbolOffset: [-5, 0] ,
        symbolRotate: (progressPercentage < 0 ? -90: -110)-symbolRotateBasedOnProgress,
        itemStyle: {
          color: '#4285f4',
          shadowColor: 'rgb(13 110 253 / 50%)',
          shadowBlur: 5
        },
        label: {
          formatter: `Current Progress Score: {bold|${nFormatter(formData?.currentValue,2)}} \n Current Progress (%): {bold|${progressPercentage < 0 ? -1*progressPercentage : progressPercentage}%}`,
          position: 'left',
          align: 'right',
          lineHeight: 20,
          offset: [0, 0],
          rotate: 0,
          color:  `#fff`,
          backgroundColor: '#4285f4',
          padding: 6,
          borderRadius: 6,
          shadowColor: 'rgb(13 110 253 / 50%)',
          shadowBlur: 5,
          rich: rich,
        },
      },
      {
        xAxis: achievementPoint?.date,
        yAxis: achievementPoint?.startValue,
        symbol: 'circle',
        symbolSize: 12,
        itemStyle: {
          color: 'green',
        },
      },
      {
        xAxis: achievementPoint?.date,
        yAxis: achievementPoint?.startValueNegative,
        symbol: 'circle',
        symbolSize: 12,
        itemStyle: {
          color: 'red',
        },
        label: {
          formatter: `${nFormatter(formData?.calculationValue,2)}% \n Decline Goal Score: ` + parseFloat(achievementPoint?.startValueNegative).toFixed(2),
          position: 'bottom',
          align: 'center',
          lineHeight: 14,
          distance: 20,
          rotate: 0,
          color: 'red'
        },
      }
    ]
  };
  const markLine = {
          data: [
            {
              name: 'insideStartTop',
              xAxis: achievementPoint?.date,
              yAxis: achievementPoint?.startValue,
              label: {
                formatter: `{bold|${formData?.calculationValue}%} \n Improvement Goal Score: {bold|${nFormatter(achievementPoint?.startValue,2)}}`,
                position: 'insideMiddleTop',
                padding: [3, 400, 5, 6],
                fontSize: 15,
                lineHeight: 20,
                align: 'center',
                color: 'green',
                rich: rich,
              },
              itemStyle: {
                color: 'green',
              }
            },
            [
              {
                coord: [remainingProgress?.date, remainingProgress?.currentValue],
                label: {
                  position: 'insideMiddleBottom',
                  //backgroundColor: '#fff',
                  padding: 5,
                  formatter: [
                    `${scoreRemaining < 0 ? 'Acheived': 'Remaining'} By: {bold|${scoreRemaining < 0? -1*(progressRemaining) : progressRemaining}%}`,
                    `${scoreRemaining < 0 ? 'Acheived By #Days' : '#Days Left'}: {bold|${scoreRemaining < 0? -1*daysRemaining: daysRemaining}days}`,
                    `${scoreRemaining < 0 ? 'Extra Score': 'Score To Go'}: {bold|${scoreRemaining < 0 ? -1*scoreRemaining: scoreRemaining}}`].join('\n'),
                  rich: {
                    bold: {
                      color: progressRemaining < 0 ? '#3ba272' : '#000',
                      fontWeight: 'bold',
                    }
                  },
                  lineHeight:16
                },
                ...progressMarkLineStyle

              },
              {
                coord: [achievementPoint?.date, achievementPoint?.startValue],
                ...progressMarkLineStyle
              }
            ]
          ],
    };
  const option = {
    xAxis: {
      type: 'category',
      data: projectedData?.map(d => d.date),
      axisLine:{
        show: false,
      },
      axisTick:{
        show: false,
      },
      axisLabel:{
         margin: 80,
      }
    },
    legend: {
      show: true,
    },
    grid: {
      top: 30,
      left: 100,
      right: 100,
      bottom: 100
    },
    textStyle: {
      fontFamily: 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans","Liberation Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"' ,

    },
    yAxis:  {
      type: 'value',
      scale: true,
      axisLabel: {
        formatter: function (value, index) {
          return nFormatter(value,2);
      }
      }
    },
    dataZoom: [
      {
        show: true,
        type: 'inside',
        filterMode: 'none',
        xAxisIndex: [0],
      },
    ],
    color,
    graphic: [
      {
        type: 'group',
        left: '12%',
        top: '5%',
        draggable: true,
        children: [
          {
            type: 'rect',
            z: 100,
            left: 'center',
            top: 'middle',
            shape: {
              width: 460,
              height: 130,
              r: 6,
            },
            style: {
              fill: progressPercentage < 0 ? '#ee6666': (scoreRemaining < 0 ? '#3ba272': '#fff') ,
              lineWidth: 1,
              shadowBlur: 8,
              shadowOffsetX: 3,
              shadowOffsetY: 3,
              shadowColor: 'rgba(0,0,0,0.2)'
            }
          },
          {
            type: 'text',
            z: 100,
            left: 'center',
            top: 'middle',
            style: {
              fill: (scoreRemaining < -1 ? '#fff': '#000'),
              width: 420,
              //overflow: 'break',
              lineHeight: 25,
              fontSize: 16,
              text:
              [
                `You have achieved {bold|${progressPercentage < 0 ? -1*progressPercentage : progressPercentage}%} of Daily {bold|${formData?.calculationValue}%} ${progressPercentage > -1 ? 'Improvement': 'Decline'} Goal`,
                `${scoreRemaining < 0 ? 'Acheived': 'Remaining'} By: {bold|${scoreRemaining < 0? -1*(progressRemaining) : progressRemaining}%}`,
                    `${scoreRemaining < 0 ? 'Acheived By #Days' : '#Days Left'}: {bold|${scoreRemaining < 0? -1*daysRemaining: daysRemaining}days}`,
                    `${scoreRemaining < 0 ? 'Extra Score': 'Score To Go'}: {bold|${scoreRemaining < 0 ? -1*scoreRemaining: scoreRemaining}}`].join('\n'),
              rich: {
                bold: {
                    fontWeight: 'bold',
                    fontSize: 16,
                },
               },
            },
          }
        ]
      },
    ],
    series: [
      {
        data: projectedData?.map(d => parseFloat(d.startValue)),
        name: `Projected ${formData?.calculationValue}% BETTER EVERY DAY`,
        smooth: true,
        ...seriesSharedOption,
        markLine,
        markPoint
      },
      {
        data: projectedData?.map(d => parseFloat(d.startValueNegative) ),
        name: `Projected ${formData?.calculationValue}% DECLINE EVERY DAY`,
        ...seriesSharedOption,
        markPoint
      },
      {
        data: projectedData?.filter(item => item.startValue <= achievementPoint?.startValue)?.map(d => parseFloat(d.startValue)?.toFixed(2) ),
        ...seriesSharedOption,
      },
    ]
  };
  option && chart.setOption(option);
  } catch (error) {
      alert('Error in chart rendering');
      console.error('Error in chart rendering',error);
  }

}
