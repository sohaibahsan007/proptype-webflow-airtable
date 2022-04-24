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
    prepareDateForProjection(formData);
  }else{
    alert(error);
  }
}

function prepareDateForProjection(formData){
  const startDate = new Date(formData.startDate);
  const currentDate = new Date(formData.currentDate);
  const startValue = parseInt(formData.startValue);
  const currentValue = parseInt(formData.currentValue);
  const datesList = getDates(startDate, currentDate, 1000*60*60*24);
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
    const _currentValue =  i == 0 ? startValue : ((currentValue < projectList[i-1].startValue || date == null || _startValue == null) ? null : improvementValue);
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
      goalAchievedOnIndexNegative: _currentValueNegative > currentValue ?_currentValueNegative : null,
    });
  }

  console.table(projectList);

}
