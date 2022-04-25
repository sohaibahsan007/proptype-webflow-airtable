function getDates(startDate, endDate, interval) {
  const duration = endDate - startDate;
  const steps = duration / interval;
  return Array.from({length: steps+1}, (v,i) => new Date(startDate.valueOf() + (interval * i)));
}
function prepareDateForProjection(formData){
  const startDate = new Date(formData.startDate);
  const currentDate = new Date(formData.currentDate);
  let datesList = getDates(startDate, currentDate, 1000*60*60*24);
  const daysToAdd = (datesList?.length)/8;
  currentDate.setDate(currentDate.getDate() + daysToAdd);
  datesList = getDates(startDate, currentDate, 1000*60*60*24);
  const startValue = parseFloat(formData.startValue);
  const currentValue = parseFloat(formData.currentValue);

  // prepare the projection list
  let projectedList = prepareListForProjection(datesList, startValue, currentValue);

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
    projectedList = prepareListForProjection(datesList, startValue, currentValue);
    nearestValue = projectedList[projectedList?.length-1]?.startValue;
    difference = currentValue - nearestValue;
  } while (difference > 0);
  return projectedList;

}
function prepareListForProjection(datesList, startValue, currentValue){
  const projectList = [];
  // irritate by each date and prepare the data for the chart
  for(let i=0; i<datesList.length; i++){
    const date = datesList[i];

    // at 1% improvement, the value will be 1.01 times the previous value
    const improvementValue = i > 0 ? (projectList[i-1].startValue+ (projectList[i-1].startValue*0.01)): 0;

    // at 1% decline, the value will be 0.99 times the previous value
    const declineValue  = i > 0 ? (projectList[i-1].startValueNegative - (projectList[i-1].startValueNegative*0.01)): 0;

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
  document.getElementById('startValue').value = 1;
 document.getElementById('currentValue').value = 37;
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
  const fullName = document.getElementById('fullName').value;
  const email = document.getElementById('email').value;
  const startDate = document.getElementById('startDate').value;
  const currentDate = document.getElementById('currentDate').value;
  const startValue = document.getElementById('startValue').value;
  const currentValue = document.getElementById('currentValue').value;
  // const currentValueRange = document.getElementById('currentValueRange').value;
  const formData = {fullName, email, startDate, currentDate, startValue, currentValue};
  let error = "";
  if(fullName == ""){
    error += "Please enter your full name.\n";
  }
  if(email == ""){
    error += "Please enter your email.\n";
  }
  if(startDate == ""){
    error += "Please enter your start date.\n";
  }else if(currentDate == ""){
    const date = new Date(startDate);
    const date_NextYear = new Date(date.setDate(date.getDate() + 365));
    document.getElementById('currentDate').value = date_NextYear?.toJSON()?.slice(0,10);
  }
  if(currentDate == ""){
    error += "Please enter your current date.\n";
  }
  if(startValue == ""){
    error += "Please enter your start value.\n";
  }
  if(currentValue == ""){
    error += "Please enter your current value.\n";
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
    const projectedData = prepareDateForProjection(formData);
    drawChart(projectedData,formData);

    if(event?.type == "submit"){
      document.getElementById('submitBtn').disabled = true;
       submitRecordToAirTable(formData);
    }
  }else if(error != "" && event?.type == "submit"){
    alert(error);
  }else if(error != "" && event?.type == "change"){
    document.getElementById('submitBtn').disabled = true;
  }
}


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
  // loadTestValue();
  OnSubmit();
};

function drawChart(projectedData,formData){

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
    const color = ['#fbbc04', '#ee6666',  '#3ba272','#3ba272','#3ba272','#3ba272','#3ba272','#3ba272'];
    const findCurrentProgress = projectedData?.find(item => item.goalAchievedOnIndex != null);
    const currentProgressIndex = projectedData?.findIndex(item => item.goalAchievedOnIndex != null);
    const findCurrentProgressNegative = projectedData?.find(item => item.goalAchievedOnIndexNegative != null);
    const currentProgress = findCurrentProgress ?? findCurrentProgressNegative;
    const achievementPoint = projectedData?.find(item => new Date(item?.date)?.toLocaleDateString("en-US") == new Date(formData.currentDate)?.toLocaleDateString("en-US"));
    const symbolRotateBasedOnProgress = 1 - currentProgressIndex/projectedData?.length;
    const achievementPercentage = (findCurrentProgress?.startValue/ achievementPoint?.startValue)*100;
    const achievementPercentageNegative = (achievementPoint?.startValueNegative/findCurrentProgressNegative?.startValueNegative)*100;
    progressPercentage = parseFloat(achievementPercentage > -1 ? achievementPercentage : -1*achievementPercentageNegative)?.toFixed(2);
    const markPoint ={
      data: [
        {
          xAxis: currentProgress?.date,
          yAxis: currentProgress?.goalAchievedOnIndex ?? currentProgress?.goalAchievedOnIndexNegative,
          symbol: 'arrow',
          symbolSize: 20,
          symbolOffset: [0, 0] ,
          symbolRotate: -100*symbolRotateBasedOnProgress,
          itemStyle: {
            color: '#4285f4',
            shadowColor: 'rgb(13 110 253 / 50%)',
            shadowBlur: 5
          },
          label: {
            formatter: `Current Progress Score: ${formData?.currentValue} \n Current Progress (%): ${progressPercentage}%`,
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
            shadowBlur: 5
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
            formatter: '1% \n Decline Goal Score: ' + parseFloat(achievementPoint?.startValueNegative).toFixed(2),
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
                  formatter: '1% \n Improvement Goal Score: ' + parseFloat(achievementPoint?.startValue)?.toFixed(2),
                  position: 'insideMiddleTop',
                  padding: [3, 400, 5, 6],
                  fontSize: 15,
                  lineHeight: 20,
                  align: 'center',
                  color: 'green',
                },
                itemStyle: {
                  color: 'green',
                }
              },
            ]
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
           margin: 80
        }
      },
      legend: {
        show: true,
      },
      grid: {
        top: 30,
        left: 100,
        right: 60,
        bottom: 100
      },
      textStyle: {
        fontFamily: 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans","Liberation Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"' ,
      },
      yAxis:  {
        type: 'value',
        scale: true,
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
          left: '3%',
          top: '5%',
          draggable: true,
          children: [
            {
              type: 'rect',
              z: 100,
              left: 'center',
              top: 'middle',
              shape: {
                width: 440,
                height: 40,
                r: 6,
              },
              style: {
                fill: achievementPercentage > -1 ? '#3ba272' : '#ee6666',
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
                fill: '#fff',
                width: 220,
                //overflow: 'break',
                lineHeight: 25,
                fontSize: 16,
                text: `You have achieved ${progressPercentage}% of 1% Daily ${achievementPercentage > -1 ? 'Improvement': 'Decline'} Goal`,
              },
            }
          ]
        },
      ],
      series: [
        {
          data: projectedData?.map(d => parseFloat(d.startValue)?.toFixed(2) ),
          name: 'Projected 1% BETTER EVERY DAY',
          smooth: true,
          ...seriesSharedOption,
          markLine,
          markPoint
        },
        {
          data: projectedData?.map(d => parseFloat(d.startValueNegative)?.toFixed(2) ),
          name: 'Projected 1% DECLINE EVERY DAY',
          ...seriesSharedOption,
          markPoint
        },
      ]
    };
    option && chart.setOption(option);
}
function getAirTableRecords(){
  airtableBase('User_Data').select({
    maxRecords: 3,
    view: 'Grid view'
  }).eachPage(function page(records, fetchNextPage) {
    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
        console.log('Retrieved', record.get('full_name'));
    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();
}, function done(err) {
    if (err) { console.error(err); return; }
});
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

