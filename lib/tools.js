let Ajv = require("ajv");
//Date-time functions and helpers
module.exports.monthList = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
module.exports.weekDayList = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
/**
 * Adds zero before number if number is less than 10
 * @param {integer} num Number to which leading zeros should be added
 */
function leadZero(num) {
  return (num < 10 ? "0" : "") + num;
}
module.exports.leadZero = leadZero;

/**
 * Returns result of object validation across one or several nested schemas
 * @param {object} testData Object to be validated
 * @param {object} schema Schema across which object should be validated
 * @param {object[]=} extraSchemaList Any extra schema list which should be used for validation
 * @returns {boolean} Result of object validation
 */
function DataVsSchemaResult(testData, schema, extraSchemaList) {
  //TODO: to be optimized with removeSchema(/.*/)
  var ajv = new Ajv();
  /* istanbul ignore else  */
  if(extraSchemaList)
    extraSchemaList.forEach(function(e) { ajv.addSchema(e); }); 
  let validate = ajv.compile(schema);
  return validate(testData);
}
module.exports.DataVsSchemaResult = DataVsSchemaResult;

/**
 * Returns result of object validation across one or several nested schemas
 * @param {object} testData Object to be validated
 * @param {object} schema Schema across which object should be validated
 * @param {object[]=} extraSchemaList Any extra schema list which should be used for validation
 * @returns {string} List of errors
 */
function DataVsSchemaErrors(testData, schema, extraSchema) {
  //TODO: to be optimized with removeSchema(/.*/)
  var ajv = new Ajv();
  /* istanbul ignore else  */
  if(extraSchema)
    extraSchema.forEach(function(e) { ajv.addSchema(e); }); 
  let validate = ajv.compile(schema);
  validate(testData);
  return ajv.errorsText(validate.errors);
}
module.exports.DataVsSchemaErrors = DataVsSchemaErrors;
/**
 * Return date-time in a proper format
 * @returns {object} Date-time
 */
function getDateTime() { 
  return new Date();
}
module.exports.getDateTime = getDateTime;
/**
 * Extract from date and time and return time in a format HH:MM:SS. Current date time will be taken in case if dateTime is not provided
 * @param {object} dateTime Date and time object which should be used for time extraction
 * @returns {string} Time in a format HH:MM:SS
 */
function getTimefromDateTime(dateTime) { 
  let currentDateTime;
  if(dateTime && dateTime instanceof Date)
    currentDateTime = dateTime;
  else
    currentDateTime = getDateTime();
  let hours = leadZero(currentDateTime.getUTCHours());
  let minutes = leadZero(currentDateTime.getUTCMinutes());
  let seconds = leadZero(currentDateTime.getUTCSeconds());   
  return hours + ":" + minutes + ":" + seconds;
}
module.exports.getTimefromDateTime = getTimefromDateTime;
/**
 * Returns new date based on date and added number of years, months, days, hours, minutes or seconds
 * @param {object} date Date value to which date-time intervals should be added
 * @param {number} years Number of years to add
 * @param {number} months Number of months to add
 * @param {number} days Number of days to add
 * @param {number} hours Number of hours to add
 * @param {number} minutes Number of minutes to add
 * @param {number} seconds Number of seconds to add
 * @returns {object} New date with added number of days
 */
function addDate(date, years, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0) {  
  let result = parseDateTime("2000-01-01T00:00:00.000Z");
    
  result.setUTCFullYear(date.getUTCFullYear() + years);
  result.setUTCMonth(date.getUTCMonth() + months);
  result.setUTCDate(date.getUTCDate() + days);    
  result.setUTCHours(date.getUTCHours() + hours);         
  result.setUTCMinutes(date.getUTCMinutes() + minutes);    
  result.setUTCSeconds(date.getUTCSeconds() + seconds);    
  result.setUTCMilliseconds(date.getUTCMilliseconds());
   
  return new Date(result);
}
module.exports.addDate = addDate;
/**
 * Convert string represented date and time to native date-time format
 * @param {string} stringDateTime UTC date and time represented as a sting. Example: '2018-01-31T20:54:23.071Z'
 * @returns {datetime} Date and time object
 */
function parseDateTime(stringDateTime) {
  let preDate = Date.parse(stringDateTime);
  if(!isNaN(preDate)) 
    return new Date(preDate);            
  else
    return null;
}
module.exports.parseDateTime = parseDateTime;

/**
 * 
 * @param {string} value Date-time value
 * @param {string} options Optional. A locale string or array of locale (see Date.toLocaleString)
 * @param {Object} locale Optional. An object that contains one or more properties that specify comparison options (see Date.toLocaleString)
 * @returns {string} Formated date and time
 */
function formatDateTime(value, options, locale) {  
  let dateTime = new Date(value);
  return value === null ? '' : dateTime.toLocaleString(locale, options);  
}
module.exports.formatDateTime = formatDateTime;