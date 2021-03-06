

/// this will go into body section
// get chart dom
const chartDom = document.getElementById('chart');
var Airtable = require('airtable');
  // setup airtable
const airtableBase = new Airtable({apiKey: 'keyVpI72WUwwks62v'}).base('appsE68H46tsOnWMG');
// init echart instance
const chart = echarts.init(chartDom);
let progressPercentage = null;
let formData = {};
let showRemainingLine = true;

window.onload = function() {
if(localStorage?.formData){
  formData = JSON.parse(localStorage?.formData);
  if(!formData){
    window.location = 'index.html';
  }
  if(formData?.existing){
    drawForLogin(formData);
  }else{
    drawForRegister(formData);
  }

}else{
  window.location = 'index.html';
}

// bind submitForm event

const form = document.getElementById("updateForm");
  form.onsubmit = updateSubmit.bind(form);
  form.onchange = updateSubmit.bind(form);
};

function drawForLogin(formData){
  document.getElementById('updateForm').hidden = false;
  document.getElementById('sMessage').hidden = true;
  if(formData?.updated){
    hideForm();
  }
  loadGoalRecords(formData?.id);
  const projectedData = prepareDataForProjection(formData);
  addHistory(formData);
  drawChart(projectedData,formData);
}
function drawForRegister(formData){
  document.getElementById('updateForm').hidden = true;
  document.getElementById('sMessage').hidden = false;
  document.getElementById('sMessage').innerHTML = 'Your data has been submitted. you can know view Performance Chart in left. Return back after few days to report the progress.';
  const projectedData = prepareDataForProjection(formData);
  addHistory(formData);
  drawChart(projectedData,formData);
}

function updateSubmit(event){
  if(event) event.preventDefault();
  let error = '';
  const currentValue = document.getElementById('currentValue')?.value;
  if(currentValue == "" || currentValue == undefined){
    error += "Please enter your progress update.\n";
  }
  if(error == ""){
    document.getElementById('submitBtn').disabled = false;
    if(event?.type == "submit"){
      document.getElementById('submitBtn').disabled = true;
      formData.currentValue = currentValue;
      const projectedData = prepareDataForProjection(formData);
      drawChart(projectedData,formData);
      submitRecordToAirTable(currentValue);
    }
  }else if(error != "" && event?.type == "submit"){
    alert(error);
  } else if(error != "" && event?.type == "change"){
    console.error(error);
    document.getElementById('submitBtn').disabled = true;
  }

}

function getDates(startDate, endDate, interval) {
  const duration = endDate - startDate;
  const steps = duration / interval;
  return Array.from({length: steps+1}, (v,i) => new Date(startDate.valueOf() + (interval * i)));
}
function prepareDataForProjection(formData){
  formData.calculationValue = 1;
  const startDate = new Date(formData.startDate);
  const goalDate = new Date(formData.goalDate);
  let datesList = getDates(startDate, goalDate, 1000*60*60*24);
  const daysToAdd = (datesList?.length)/8;
  goalDate.setDate(goalDate.getDate() + daysToAdd);
  datesList = getDates(startDate, goalDate, 1000*60*60*24);
  const startValue = parseFloat(formData.startValue);
  const currentValue = parseFloat(formData.currentValue);
  const calculationValue = parseFloat(formData.calculationValue);
  document.getElementById('unitLabel').innerHTML =`(${formData?.unit})`;

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
    goalDate.setDate(goalDate.getDate() + daysToAdd);
    datesList = getDates(startDate, goalDate, 1000*60*60*24);
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
  return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : num;
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
    disabled: true,
    focus: "series",
  },

};

function drawChart(projectedData,formData){
  try {
  const color = ['#fbbc0480', '#ee666680',  '#3ba272','#3ba272','#3ba272','#3ba272','#3ba272','#3ba272'];
  const findCurrentProgress = projectedData?.find(item => item?.goalAchievedOnIndex != null);
  const currentProgressIndex = projectedData?.findIndex(item => item?.goalAchievedOnIndex != null);
  const findCurrentProgressNegative = projectedData?.find(item => item?.goalAchievedOnIndexNegative != null);
  const currentProgress = (findCurrentProgress ?? findCurrentProgressNegative) ?? projectedData?.[0];
  const achievementPoint = projectedData?.find(item => new Date(item?.date)?.toLocaleDateString("en-US") == new Date(formData.goalDate)?.toLocaleDateString("en-US"));
  const symbolRotateBasedOnProgress = 1 - currentProgressIndex/projectedData?.length;
  const achievementPercentage = (((findCurrentProgress?.startValue - formData?.startValue)/ (achievementPoint?.startValue - formData?.startValue))*100);
  const achievementPercentageNegative = (((formData?.startValue - findCurrentProgressNegative?.startValueNegative)/(formData?.startValue - achievementPoint?.startValueNegative))*100);
  progressPercentage = parseFloat((parseFloat(achievementPercentage > -1 ? achievementPercentage : -1*achievementPercentageNegative) || 0)?.toFixed(2));
  const progressRemaining = (100 - (progressPercentage < 0 ? 0 : progressPercentage)).toFixed(2);
  const daysRemaining = parseInt(achievementPoint?.id - currentProgress?.id);
  const scoreRemaining = parseFloat(achievementPoint?.startValue - currentProgress?.startValue).toFixed(2);
  const remainingProgress = JSON.parse(JSON.stringify(currentProgress));
  remainingProgress.date = currentProgress?.currentValue ? currentProgress?.date : projectedData?.[0].date;
  remainingProgress.currentValue = currentProgress?.currentValue ?? projectedData?.[0].startValue;
  const daysSpentRaw = Math.abs(new Date() - new Date(formData?.startDate));
  const daysSpent =  Math.ceil(daysSpentRaw / (1000 * 60 * 60 * 24));
  const rich = {
    bold: {
        fontWeight: 'bold',
    },
    small: {
        fontSize: 10,
        color: '#999',
  },
   };
  const markPositionSwitch = (progressPercentage < 0  ? -1*progressPercentage: progressPercentage) > 50 ? true: false ;
  const markPoint ={
    data: [
      {
        xAxis: currentProgress?.date,
        yAxis: currentProgress?.goalAchievedOnIndex ?? currentProgress?.goalAchievedOnIndexNegative,
        symbol: 'arrow',
        symbolSize: 20,
        symbolOffset: markPositionSwitch ? [-5, 0] :[2, progressPercentage < 0 ? -5: 5]  ,
        symbolRotate: (markPositionSwitch ? (progressPercentage < 0 ? -90: -110) : (progressPercentage < 0 ? 120: 50))-symbolRotateBasedOnProgress,
        itemStyle: {
          color: '#4285f4',
          shadowColor: 'rgb(13 110 253 / 50%)',
          shadowBlur: 5
        },
        label: {
          formatter: `Current position: {bold|${nFormatter(formData?.currentValue,2)}} ${formData?.unit? `(${formData?.unit})`: ''} \n Progress compared to schedule: {bold|${progressPercentage < 0 ? -1*progressPercentage : progressPercentage}%}`,
          position: markPositionSwitch ? 'left':'right',
          align: markPositionSwitch ? 'right': 'left',
          lineHeight: 20,
          offset: [0,0],
          rotate: 0,
          color:  `#fff`,
          backgroundColor: '#4285f4',
          padding: 6,
          borderRadius: 6,
          shadowColor: 'rgb(13 110 253 / 50%)',
          shadowBlur: 5,
          rich: rich,
          overflow: 'breakAll',
          appendToBody: true ,
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
          formatter: `${nFormatter(formData?.calculationValue,2)}% \n Decline Goal: ` + parseFloat(achievementPoint?.startValueNegative).toFixed(2) + ` ${formData?.unit? `(${formData?.unit})`: ''}`,
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
  const progressMarkLineStyle={
    lineStyle: {
      width: 4,
      color: scoreRemaining >= 0 ? '#4285f4' : '#3ba272',
      type: 'solid',
      curveness: 1,
      shadowBlur: 6,
      shadowOffsetX: 3,
      shadowOffsetY: 3,
      shadowColor: 'rgba(0,0,0,0.2)'
    },
    symbolSize: 0,
    emphasis: {
      label: {
        formatter: scoreRemaining >= 0 ? [
          `Remaining : {bold|${scoreRemaining < 0? -1*(progressRemaining) : progressRemaining}%}`,
          `Day # : {bold|${daysSpent}} of {bold|${formData?.daysToTrack}}`,
          `#Days needed to achieve goal at this progress rate: {bold|${scoreRemaining < 0? -1*daysRemaining: daysRemaining}}`].join('\n'): 'Goal achieved',
      }
    }
  };
  const remaningMarkLineData =  [
    {
      coord: [remainingProgress?.date, remainingProgress?.currentValue],
      label: {
        position: markPositionSwitch ? 'insideMiddleBottom' : 'insideMiddleTop',
        //backgroundColor: '#fff',
        padding: 5,
        formatter: scoreRemaining >= 0 ? [
          `Remaining : {bold|${scoreRemaining < 0? -1*(progressRemaining) : progressRemaining}%}`,
          `Day # : {bold|${daysSpent}} of {bold|${formData?.daysToTrack}}`,
          `#Days needed: {bold|${scoreRemaining < 0? -1*daysRemaining: daysRemaining}}`].join('\n'): 'Goal achieved',
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
  ];
  const markLine = {
          data: [
            {
              name: 'insideStartTop',
              xAxis: achievementPoint?.date,
              yAxis: achievementPoint?.startValue,
              label: {
                formatter: `{bold|${formData?.calculationValue}%} Improvement Goal: {bold|${nFormatter(achievementPoint?.startValue,2)}} ${formData?.unit}, \n {small|(e.g # of pages to read)}`,
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
              },
              emphasis: {
                disabled: true
              }
            },
            [
              showRemainingLine ? remaningMarkLineData[0]: {},
              showRemainingLine ?remaningMarkLineData[1]: {},
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
      },
      axisPointer: {
        value: new Date()?.toLocaleDateString("en-US"),
        snap: true,
        status: 'show',
        lineStyle: {
          color: '#969696',
          width: 2
        },
        label: {
          show: true,
          formatter: function (params) {
            return params.value;
          },
          backgroundColor: '#969696',
        },
        handle: {
          show: true,
          color: '#969696',
        }
      },
    },
    tooltip: {
      triggerOn: 'item',
      alwaysShowContent: true,
      formatter: (params) => {
        if(params[2]?.seriesName){
          return `
          ${params[2]?.marker} ${params[2]?.seriesName} on this date:  <b>${parseFloat(params[0]?.value?.toLocaleString())?.toFixed(2)}</b>`;
        }

      },
      position: function (pt) {
        return [pt[0], pt[1]];
      }
    },
    legend: {
      show: true,
      bottom: 'bottom',
      data: [{
        name: `Projected ${formData?.calculationValue}% BETTER EVERY DAY`,
    },{
      name: `Projected ${formData?.calculationValue}% DECLINE EVERY DAY`,
  },{
    name: `1% Improvement Goal`,
},{
  name: 'Current Position',
  itemStyle: {
    color: '#4285f4',
  }
}]
    },
    grid: {
      top: 30,
      left: 100,
      right: 100,
      bottom: 150
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
    // graphic: [
    //   {
    //     type: 'group',
    //     left: '12%',
    //     top: '5%',
    //     draggable: true,
    //     children: [
    //       {
    //         type: 'rect',
    //         z: 100,
    //         left: 'center',
    //         top: 'middle',
    //         shape: {
    //           width: 460,
    //           height: 130,
    //           r: 6,
    //         },
    //         style: {
    //           fill: progressPercentage < 0 ? '#ee666680': (scoreRemaining < 0 ? '#3ba272': '#fff') ,
    //           lineWidth: 1,
    //           shadowBlur: 8,
    //           shadowOffsetX: 3,
    //           shadowOffsetY: 3,
    //           shadowColor: 'rgba(0,0,0,0.2)'
    //         }
    //       },
    //       {
    //         type: 'text',
    //         z: 100,
    //         left: 'center',
    //         top: 'middle',
    //         style: {
    //           fill: (scoreRemaining < -1 ? '#fff': '#000'),
    //           width: 420,
    //           //overflow: 'break',
    //           lineHeight: 25,
    //           fontSize: 16,
    //           text:
    //           [
    //             `You have achieved {bold|${progressPercentage < 0 ? -1*progressPercentage : progressPercentage}%} of Daily {bold|${formData?.calculationValue}%} ${progressPercentage > -1 ? 'Improvement': 'Decline'} Goal`,
    //             `${scoreRemaining < 0 ? 'Achieved': 'Remaining'} By: {bold|${scoreRemaining < 0? -1*(progressRemaining) : progressRemaining}%}`,
    //                 `${scoreRemaining < 0 ? 'Achieved By #Days' : '#Days Left'}: {bold|${scoreRemaining < 0? -1*daysRemaining: daysRemaining}days}`,
    //                 `${scoreRemaining < 0 ? 'Extra Score': 'Score To Go'}: {bold|${scoreRemaining < 0 ? -1*scoreRemaining: scoreRemaining}}`].join('\n'),
    //           rich: {
    //             bold: {
    //                 fontWeight: 'bold',
    //                 fontSize: 16,
    //             },
    //            },
    //         },
    //       }
    //     ]
    //   },
    // ],
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
        name: `1% Improvement Goal`,
        data: projectedData?.filter(item => item.startValue <= achievementPoint?.startValue)?.map(d => parseFloat(d.startValue) ),
        ...seriesSharedOption,
      },
      {
        name: `Current Position`,
        ...seriesSharedOption,
      },
    ]
  };
  option && chart.setOption(option);
  chart.on('legendselectchanged', function (params) {
    if(params.name === 'Current Position'){
      showRemainingLine = params?.selected['Current Position'];
      drawChart(projectedData,formData);
    }
});
  } catch (error) {
      alert('Error in chart rendering');
      console.error('Error in chart rendering',error);
  }

}
function addHistory(formData){
  const dataHtml = `
  <div class="recent-activity">
  <div class="date-time-info">
    <div class="date-time">
      <span class="date-info">${new Date(formData?.createdOn).toLocaleDateString()}</span>
      <span class="time-info">${new Date(formData?.createdOn).toLocaleTimeString()}</span>
    </div>
    <div class="recent">
      <div class="outer-border"><span class="point"></span></div>
    </div>
  </div>

  <div dir="auto" class="activity-details">
    <p class="header-p"></p>
    <p class="activity-p">
    <span class="start-position"><span>Start Date :</span> ${new Date(formData?.startDate).toLocaleDateString()}</span>
  </p>
    <p class="activity-p">
      <span class="start-position"><span>Start position :</span> ${formData?.startValue} ${formData?.unit}</span>
    </p>
    <p class="activity-p">
    <span class="start-position"><span>Goal Date :</span> ${new Date(formData?.goalDate).toLocaleDateString()}</span>
  </p>
    <p class="activity-p">
      <span class="start-position"><span>Attachment :</span> image.jpeg</span>
    </p>
  </div>
</div>
`;
  const historyContainer = document.querySelector('.history-container');
  historyContainer.insertAdjacentHTML('afterbegin', dataHtml);
}
function addUpdateHistory(formData){
  const dataHtml = `
  <div class="recent-activity">
  <div class="date-time-info">
    <div class="date-time">
      <span class="date-info">${new Date(formData?.createdOn).toLocaleDateString()}</span>
      <span class="time-info">${new Date(formData?.createdOn).toLocaleTimeString()}</span>
    </div>
    <div class="recent">
      <div class="outer-border"><span class="point"></span></div>
    </div>
  </div>

  <div dir="auto" class="activity-details">
    <p class="header-p"></p>
    <p class="activity-p">
      <span class="start-position"><span>Current position :</span> ${formData?.currentValue || '...'}  ${formData?.unit}</span>
    </p>
    <p class="activity-p">
      <span class="start-position"><span>Attachment :</span> image.jpeg</span>
    </p>
  </div>
</div>
`;
  const historyContainer = document.querySelector('.history-container');
  historyContainer.insertAdjacentHTML('afterbegin', dataHtml);
}
function submitRecordToAirTable(currentValue){
  airtableBase('Goal_Record').create([
    {
      "fields": {
        "user_id": formData?.id,
        "currentValue": parseFloat(currentValue),
        "progressPercentage": progressPercentage/100,
      }
    },
  ], function(err, records) {
    document.getElementById('submitBtn').disabled = false;
    if (err) {
      alert(err);
      return;
    }
    const record = records[0]?.fields;
    record.unit = formData?.unit;
    addUpdateHistory(record);
    formData.updated = true;
    localStorage.formData = JSON.stringify(formData);
    hideForm();
  });
}
function hideForm(){
  document.getElementById('updateForm').hidden = true;
    document.getElementById('sMessage').hidden = false;
    document.getElementById('sMessage').innerHTML = 'Progress updated successfully';
}
function loadGoalRecords(user_id){
    let currentValue = null;
    airtableBase('Goal_Record').select({
      // Selecting the first 3 records in Grid view:
      maxRecords: 100,
      view: "Grid view",
      sort: [{field: "id", direction: "desc"}],
      filterByFormula: `{user_id} = "${user_id}"`
  }).eachPage(function page(records, fetchNextPage) {
      if(!currentValue){
        const sorted = records?.sort((a, b) => b?.fields?.id - a?.fields?.id);
        currentValue = sorted?.[0]?.fields?.currentValue;
        formData.currentValue = currentValue;
        formData.currentDate = sorted?.[0]?.fields?.createdOn;
        const projectedData = prepareDataForProjection(formData);
        drawChart(projectedData,formData);
      }
      records?.sort((a, b) => a?.fields?.id - b?.fields?.id).forEach(function(record) {
          const _record = record.fields;
          _record.unit = formData?.unit;
          addUpdateHistory(_record);
      });
      fetchNextPage();
  }, function done(err) {
      if (err) { console.error(err); return; }
  });
}
