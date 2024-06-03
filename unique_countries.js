let availableKeywords = ["Afghanistan", "Albania", "Algeria", "American Samoa", 
    "Andorra", "Angola", "Anguilla", "Antigua and Barbuda", "Argentina", "Armenia", 
    "Aruba", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", 
    "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bonaire, Sint Eustatius and Saba",   
    "Bosnia and Herzegovina", "Botswana", "Brazil", "British Virgin Islands", "Brunei Darussalam", "Bulgaria", 
    "Burkina Faso", "Burundi", "Cape Verde", "Cambodia", "Cameroon", "Canada", "Cayman Islands", 
    "Central African Republic", "Chad", "Chile", "China", "Hong Kong", "Taiwan", "Colombia", "Comoros",
     "Republic of the Congo", "Cook Islands", "Costa Rica", "Ivory Coast", "Croatia", "Cuba", "Cura\ufffdao", 
     "Cyprus", "Czechia", "Democratic People's Republic of Korea", "Democratic Republic of the Congo", "Denmark", 
    "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", 
     "Estonia", "Eswatini", "Ethiopia", "Falkland Islands (Malvinas)", "Faroe Islands", "Fiji", "Finland", "France", 
     "French Guiana", "French Polynesia", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Greenland", "Grenada",
     "Guadeloupe", "Guam", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India",
    "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
    "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Lithuania", 
    "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Martinique",
     "Mauritania", "Mauritius", "Mayotte", "Mexico", "Micronesia (Federated States of)", "Mongolia", "Montenegro",
      "Montserrat", "Morocco", "Mozambique", "Myanmar (Burma)", "Namibia", "Nauru", "Nepal", "Netherlands", 
      "New Caledonia", "New Zealand", "Nicaragua", "Niger", "Nigeria", "Niue", "North Macedonia", "Norway", 
      "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", 
      "Portugal", "Puerto Rico", "Qatar", "Republic of Korea", "Moldova", "Reunion", "Romania", "Russia", "Rwanda",
       "Saint-Barth\u00e9lemy", "Saint Kitts and Nevis", "Saint Lucia", "Saint Martin (French Part)", 
       "Saint Pierre and Miquelon", "Saint Vincent and the Grenadines", "Samoa", "Sao Tome and Principe", 
       "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Sint Maarten", "Slovakia", 
       "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Georgia and the South Sandwich Islands", 
       "South Sudan", "Spain", "Sri Lanka", "State of Palestine", "Sudan", "Suriname", "Sweden", "Switzerland", 
       "Syria", "Tajikistan", "Thailand", "Timor-Leste", "Togo", "Tokelau", "Tonga", "Trinidad and Tobago", "Tunisia",
        "Turkey", "Turkmenistan", "Turks and Caicos Islands", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
         "United Kingdom", "Tanzania", "United States", "Virgin Islands", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela",
          "Vietnam", "Yemen", "Zambia", "Zimbabwe"];

const resultsBox = document.querySelector(".result-box"); 
const inputBox = document.getElementById("input-box"); 

inputBox.onkeyup = function(){
    let result = [];
    let input = inputBox.value;
    if(input.length){
        result =avaliableKeywords.filter((keyword) =>{
            keyword.toLowerCase().includes(input.toLowerCase()); 
        });
        console.log(result);
    }
    display(result); 
    if (!result.length){
        resultsBox.innerHTML = ' '; 
    }
}
function display(result){
    const content = result.map((list)=>{
        return "<li onclick=selectInput(this)>" + list + "</li>"; 
    })
    resultsBox.innerHTML = "<ul>" + content.join(' ') + "</ul>";
}

function selectInput(list){
    inputBox.value = list.innerHTML; 
    resultsBox.innerHTML= ''; 
}