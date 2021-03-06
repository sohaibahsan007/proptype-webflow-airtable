var Airtable = require('airtable');
  // setup airtable
const airtableBase = new Airtable({apiKey: 'keyVpI72WUwwks62v'}).base('appsE68H46tsOnWMG');

const loginBtn = document.querySelector(".login-btn");
const newUserBtn = document.querySelector(".new-user-btn");
const loginForm = document.querySelector(".login-form");
const newUserForm = document.querySelector(".new-user-form");

newUserBtn.classList.add('current');
newUserForm.style.display = "block";
loginBtn.addEventListener("click", function () {
  loginBtn.classList.add('current');
  newUserBtn.classList.remove('current');
  loginForm.style.display = "block";
  newUserForm.style.display = "none";
});
newUserBtn.addEventListener("click", function () {
  newUserBtn.classList.add('current');
  loginBtn.classList.remove('current');
  loginForm.style.display = "none";
  newUserForm.style.display = "block";
});

window.onload = function() {
  localStorage.formData = null;
  const form = document.getElementById("register");
  form.onsubmit = OnSubmit.bind(form);
  form.onchange = OnSubmit.bind(form);
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1"){
   loadTestValue();
  }
  const loginForm = document.getElementById("login");
  loginForm.onsubmit = loginSubmit.bind(loginForm);
};
function OnSubmit(event){

  if(event) event.preventDefault();
  const name = document.getElementById('name')?.value;
  const email = document.getElementById('email')?.value;
  const startDate = document.getElementById('startDate')?.value;
  const daysToTrack = document.getElementById('daysToTrack')?.value;
  let goalDate;
  const startValue = document.getElementById('startValue')?.value;
  const currentValue = document.getElementById('currentValue')?.value;
  const unit = document.getElementById('unit')?.value;
  const goalDetail = document.getElementById('goalDetail')?.value;

  let error = "";
  if(name == "" || name == undefined){
    error += "Please enter your full name.\n";
  }
  if(email == "" || email == undefined){
    error += "Please enter your email.\n";
  }

  if(goalDetail == "" || goalDetail == undefined){
    error += "Please enter your goal detail.\n";
  }

  if(daysToTrack == "" || daysToTrack == undefined){
    error += "Please enter number of days to track.\n";
  }

  if(startDate == "" || startDate == undefined){
    error += "Please enter your start date.\n";
  }else if(goalDate == "" || goalDate == undefined){
    const date = new Date(startDate);
    const date_NextYear = new Date(date.setDate(date.getDate() + parseInt(daysToTrack)));
    goalDate = date_NextYear;
  }
  if(goalDate == "" || goalDate == undefined){
    error += "Please enter your current date.\n";
  }
  if(startValue == "" || startValue == undefined){
    error += "Please enter your start value.\n";
  }
  if(startValue != "" && currentValue != "" && startValue == currentValue){
    error += "Start value and current value cannot be same.\n";
    alert("Start value and current value cannot be same.\n");
  }

  if(startDate != "" && goalDate != ""){
    let validate7DaysDifference = new Date(startDate);
    validate7DaysDifference = validate7DaysDifference.setDate(validate7DaysDifference.getDate() + 7);

    if(new Date(validate7DaysDifference) >= new Date(goalDate)){
      error += "Start date cannot be less than current date.\n";
       alert("Current date must have atleast 7 days of difference from Start date.\n");
    }
  }
  if(error == ""){
    const formData = {name, email, startDate, goalDate, startValue, currentValue,daysToTrack,goalDetail,unit};
    document.getElementById('submitRegisterBtn').disabled = false;
    if(event?.type == "submit"){
        document.getElementById('submitRegisterBtn').disabled = true;
        submitRecordToAirTable(formData);
    }else{
      localStorage.formData = null;
    }
  }else if(error != "" && event?.type == "submit"){
    alert(error);
  }else if(error != "" && event?.type == "change"){
    console.error(error);
    document.getElementById('submitRegisterBtn').disabled = true;
  }
}
function loadTestValue(){
  document.getElementById('name').value = 'Sohaib Ahsan';
  document.getElementById('email').value = 'test01@forenax.com';
  document.getElementById('startDate').value = '2022-01-01';
  document.getElementById('daysToTrack').value = 30;
  document.getElementById('startValue').value = 1;
  document.getElementById('goalDetail').value = "I'm going to track my daily book reading habbits.";
  // document.getElementById('currentValue').value = 60;
}
function submitRecordToAirTable(formData){
  airtableBase('User_Data').create([
    {
      "fields": {
        "name": formData?.name,
        "email": formData?.email,
        "startDate": new Date(formData?.startDate).toISOString(),
        "goalDate": new Date(formData?.goalDate).toISOString(),
        "startValue": parseFloat(formData?.startValue),
        "daysToTrack": parseInt(formData?.daysToTrack),
        "goalDetail": formData?.goalDetail,
        "unit": formData?.unit,
      }
    },
  ], function(err, records) {
    document.getElementById('submitRegisterBtn').disabled = false;
    if (err) {
      alert(err);
      return;
    }
    localStorage.formData = JSON.stringify(records?.[0].fields);
    window.location = "submitted.html";
  });
}
function loginSubmit(event){
  if(event) event.preventDefault();
  let error = '';
  const email = document.getElementById('email_login')?.value;

  if(email == "" || email == undefined){
    error += "Please enter your email.\n";
  }

  if(error == ""){
    if(event?.type == "submit"){
      document.getElementById('submitLoginBtn').disabled = true;
      airtableBase('User_Data').select({
        maxRecords: 1,
        view: "Grid view",
        sort: [{field: "id", direction: "desc"}],
        filterByFormula: `{email} = "${email}"`
      })
      .firstPage((err, records) => {
           document.getElementById('submitLoginBtn').disabled = false;
          if (err) {
              alert('Login error, Please try again.');
              console.log(err);
          }
          if(records.length > 0){
              records[0].fields.existing = true;
              localStorage.formData = JSON.stringify(records[0].fields);
              window.location = "submitted.html";
          }else{
            alert('Email not found.');
            newUserBtn.click();
          }
      });

    }else{
      localStorage.formData = null;
    }
  }else if(error != "" && event?.type == "submit"){
    alert(error);
  }

}
