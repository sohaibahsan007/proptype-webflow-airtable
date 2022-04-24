// get chart dom
const chartDom = document.getElementById('chart');

// init echart instance
const chart = echarts.init(chartDom);

window.onload = function() {
  const form = document.querySelector("form");
  form.onsubmit = OnSubmit.bind(form);
  OnSubmit();
};
function getDates(startDate, endDate, interval) {
  const duration = endDate - startDate;
  const steps = duration / interval;
  return Array.from({length: steps+1}, (v,i) => new Date(startDate.valueOf() + (interval * i)));
  }
function OnSubmit(event){

  if(event) event.preventDefault();

  const fullName = document.getElementById('fullName').value;
  const email = document.getElementById('email').value;
  const startDate = document.getElementById('startDate').value;
  const currentDate = document.getElementById('currentDate').value;
  const startValue = document.getElementById('startValue').value;
  const currentValue = document.getElementById('currentValue').value;
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
  if(error == ""){
    const projectedData = prepareDateForProjection(formData);
    drawChart(projectedData,formData);
  }else{
    alert(error);
  }
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
    const color = ['#5470c6', '#ee6666',  '#3ba272','#3ba272','#3ba272','#3ba272','#3ba272','#3ba272'];
    const findCurrentProgress = projectedData?.find(item => item.goalAchievedOnIndex != null);
    const currentProgressIndex = projectedData?.findIndex(item => item.goalAchievedOnIndex != null);
    const findCurrentProgressNegative = projectedData?.find(item => item.goalAchievedOnIndexNegative != null);
    const currentProgress = findCurrentProgress ?? findCurrentProgressNegative;
    const achievementPoint = projectedData?.find(item => new Date(item?.date)?.toLocaleDateString("en-US") == new Date(formData.currentDate)?.toLocaleDateString("en-US"));
    const symbolRotateBasedOnProgress = 1 - currentProgressIndex/projectedData?.length;
    const markPoint ={
      data: [
        {
          name: 'insideStartTop',
          xAxis: currentProgress?.date,
          yAxis: currentProgress?.goalAchievedOnIndex ?? currentProgress?.goalAchievedOnIndexNegative,
          symbol: 'arrow',
          symbolSize: 16,
          symbolOffset: [0, 0] ,
          symbolRotate: -100*symbolRotateBasedOnProgress,
          itemStyle: {
            color: '#3ba272',
          },
          label: {
            formatter: 'Current Progress: ' +  formData?.currentValue,
            position: 'left',
            align: 'center',
            offset: [-70, 0],
            rotate: 0,
            color: '#fff',
            backgroundColor: '#3ba272',
            padding: 6,
            borderRadius: 6,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
            shadowBlur: 5
          },
        },
        {
          name: 'insideStartTop',
          xAxis: achievementPoint?.date,
          yAxis: achievementPoint?.startValue,
          symbol: 'circle',
          symbolSize: 14,
          itemStyle: {
            color: '#fbbc04',
          },
          // label: {
          //   formatter: parseFloat(achievementPoint?.startValue)?.toFixed(2),
          //   position: 'end'
          // }
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
                  fontSize: 15,
                  align: 'center',
                  color: '#fbbc04',
                },
                itemStyle: {
                  color: '#fbbc04',
                }
              }
            ]
      };
    const option = {
      xAxis: {
        type: 'category',
        data: projectedData?.map(d => d.date),
      },
      legend: {
        show: true,
      },
      grid: {
        top: 30,
        left: 200,
        right: 60,
        bottom: 40
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
      series: [
        {
          data: projectedData?.map(d => d.startValue),
          name: 'Projected 1% BETTER EVERY DAY',
          smooth: true,
          ...seriesSharedOption,
          markLine,
          markPoint
        },
        {
          data: projectedData?.map(d => d.startValueNegative),
          name: 'Projected 1% DECLINE EVERY DAY',
          ...seriesSharedOption,
          markPoint
        },
      ]
    };
    option && chart.setOption(option);
}
