(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
window.schedule = require('../lib/schedule');
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_cbaadd55.js","/")
},{"../lib/schedule":3,"buffer":48,"pBGvAp":53}],2:[function(require,module,exports){
module.exports={
    "scheduleSchema": {
        "$id": "http://example.com/schedule",
        "oneOf": [
            {"$ref": "#/definitions/oneTime"},
            {"$ref": "#/definitions/daily"},
            {"$ref": "#/definitions/weekly"},
            {"$ref": "#/definitions/monthly"}
        ],
        "definitions": {
            "oneTime": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "enabled": {"type": "boolean"},
                    "oneTime": {"type": "string", "format": "date-time"}
                },
                "additionalProperties": false,
                "required": ["oneTime"]  
            },
            "daily": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "enabled": {"type": "boolean"},
                    "startDateTime": {"type": "string", "format": "date-time"},
                    "endDateTime": {"type": "string", "format": "date-time"},
                    "eachNDay": {"type": "integer", "minimum": 1},
                    "dailyFrequency": {"$ref": "daily#/"}
                },
                "additionalProperties": false,
                "required": ["startDateTime", "eachNDay", "dailyFrequency"]
            },
            "weekly": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "enabled": {"type": "boolean"},
                    "startDateTime": {"type": "string", "format": "date-time"},
                    "endDateTime": {"type": "string", "format": "date-time"},
                    "eachNWeek": {"type": "integer", "minimum": 1},
                    "dayOfWeek": {
                        "type": "array",
                        "uniqueItems": true,
                        "items": { "enum": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] },
                        "additionalItems": false
                    },
                    "dailyFrequency": {"$ref": "daily#/"}
                },
                "additionalProperties": false,
                "required": ["startDateTime", "eachNWeek", "dayOfWeek", "dailyFrequency"]
            },
            "monthly": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "enabled": {"type": "boolean"},
                    "startDateTime": {"type": "string", "format": "date-time"},
                    "endDateTime": {"type": "string", "format": "date-time"},
                    "month": {
                        "type": "array",
                        "uniqueItems": true,
                        "items": { "enum": ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] },
                        "additionalItems": false
                    },
                    "day": {
                        "type": "array",
                        "uniqueItems": true,
                        "items": {"type": "integer", "minimum": 1, "maximum": 31},
                        "additionalItems": false
                    },
                    "dailyFrequency": {"$ref": "daily#/"}
                },
                "additionalProperties": false,
                "required": ["startDateTime", "month", "day", "dailyFrequency"]
            }
        }
    }
,
  "scheduleSchemaDaily": {
        "$id": "http://example.com/daily",
        "oneOf": [
            {"$ref": "#/definitions/once"},
            {"$ref": "#/definitions/every"}
        ],
        "definitions": {
            "once": {
                "type": "object", 
                "properties": { "occursOnceAt": {"type": "string", "format": "time"}},
                "additionalProperties": false,
                "required": ["occursOnceAt"]
            },
            "every": {
                "type": "object", 
                "properties": {
                    "start": {"type": "string", "format": "time"},
                    "end": {"type": "string", "format": "time"},
                    "occursEvery": { 
                        "type": "object", 
                        "properties": {                         
                            "intervalValue": {"type": "integer", "minimum": 1},
                            "intervalType": { "type": "string", "enum": ["minute", "hour"] }            
                        },
                        "additionalProperties": false,
                        "required": ["intervalValue", "intervalType"]
                    }
                },
                "additionalProperties": false,
                "required": ["start", "occursEvery"]
            }
        }
    }
}
},{}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* eslint-disable no-prototype-builtins */
//Schedule main engine
let getDateTime = require("./tools").getDateTime;
let addDate = require("./tools").addDate;
let parseDateTime = require("./tools").parseDateTime;
let formatDateTime = require("./tools").formatDateTime;
let monthList = require("./tools").monthList;
let weekDayList = require("./tools").weekDayList;
let scheduleModel = require("./models.json");
var Ajv = require("ajv");
let ajv = new Ajv();
ajv.addSchema(scheduleModel.scheduleSchemaDaily);

/**
 * Calculates next run time for already calculated day
 * @param {Object} schedule Schedule for which next run time should be calculated
 * @param {Object} runDate Day of next run with 00:00 time
 * @returns {Object} Next run date and time or null in case if next run time is out of runDate range (e.g. attempt to calculate 'each 13 hours' at 19:00) 
 * or already in past (e.g. attempt to calculate '11:00' at 11:05)
 */
function calculateTimeOfRun(schedule, runDate) {  
  //as with simple = ref will be created we need to clone Date object
  let runDateTime = new Date(runDate);    

  if(schedule.dailyFrequency.hasOwnProperty("occursOnceAt")) {
    let time = schedule.dailyFrequency.occursOnceAt.split(":");
    runDateTime.setUTCHours(time[0], time[1], time[2]); //it should put time in UTC, but it puts it in local        
    if(runDateTime > getDateTime() && runDateTime >= parseDateTime(schedule.startDateTime))
      return runDateTime;
    else
      return null;                                   
  }

  /* istanbul ignore else  */
  if(schedule.dailyFrequency.hasOwnProperty("occursEvery")) {

    let time = schedule.dailyFrequency.start.split(":");
    //milliseconds should be removed?
    runDateTime.setUTCHours(time[0], time[1], time[2], 0);
    while(runDateTime < getDateTime()) {
      //TODO nice to have interval like 03:30 (both hour and minutes)
      switch(schedule.dailyFrequency.occursEvery.intervalType) {
      case "minute":
        runDateTime = addDate(runDateTime, 0, 0, 0, 0, schedule.dailyFrequency.occursEvery.intervalValue);
        break;
      case "hour":
        runDateTime = addDate(runDateTime, 0, 0, 0, schedule.dailyFrequency.occursEvery.intervalValue);
        break;
      }
    }

    if(schedule.dailyFrequency.hasOwnProperty("end")) {
      let startTime = schedule.dailyFrequency.start.split(":");
      let endTime = schedule.dailyFrequency.end.split(":");
      let dailyStartDateTime = addDate(runDate, 0, 0, 0, startTime[0], startTime[1], startTime[2], 0);
      let dailyEndDateTime = addDate(runDate, 0, 0, 0, endTime[0], endTime[1], endTime[2], 0);
            
      //daily schedule start time is late or same as end time OR calculated time of run is later than daily schedule end time
      if(dailyStartDateTime >= dailyEndDateTime || runDateTime >= dailyEndDateTime)
        return null;
    }

    if(runDate.getUTCDate() == runDateTime.getUTCDate())        
      return runDateTime;   
    else
      return null;
        
  }
}
/**
 * Scans week which starts with weekStart and tries to find date for run
 * @param {Object} schedule Schedule for which next run time should be calculated
 * @param {Object} weekStart Date of sunday (0 day of week)
 * @returns {Object} Date or next run or null in case if date was not calculated
 */
function calculateWeekDayOfRun(schedule, weekStart) {
  let currentDay = weekStart;
  let weekDayLastIndex = 0;
  //sort list of week days in correct order
  schedule.dayOfWeek = schedule.dayOfWeek.sort((a, b) => weekDayList.indexOf(a) - weekDayList.indexOf(b));   
  for (let i = 0; i < schedule.dayOfWeek.length; i++) {
    let weekDayIndex = weekDayList.indexOf(schedule.dayOfWeek[i]);
    /* istanbul ignore else  */
    if(weekDayIndex != -1) {
      currentDay = addDate(currentDay, 0, 0, weekDayIndex - weekDayLastIndex);
      weekDayLastIndex = weekDayIndex;
      //day calculating time found - don't go next
      let calculationResult = calculateTimeOfRun(schedule, currentDay);
      if(calculationResult) {         
        /* istanbul ignore else */   
        if(calculationResult > parseDateTime(schedule.startDateTime))
          return calculationResult;
        currentDay = calculationResult;
      }
    }        
  }   
  return null;
}
/**
 * @typedef {Object} nextOccurrenceResult
 * @property {Object} result Calculation result. UTC date and time of nearest next occurrence of scheduleObject in ISO format (e.g. 2019-01-01T01:00:00.000Z)
 * @property {string} error Error message in case next occurrence calculation failed
 */
/**
 * Calculates next run date and time 
 * @param {Object} schedule Schedule for which next run date and time should be calculated
 * @returns {nextOccurrenceResult} Result of next occurrence calculation
 */ 
module.exports.nextOccurrence = (schedule) => {     
  //check if schedule is a valid JSON object    
  let validate = ajv.compile(scheduleModel.scheduleSchema);
  let valid = validate(schedule);
  /* istanbul ignore if */
  if(!valid)
    return {"result": null, "error": "schema is incorrect: " + ajv.errorsText(validate.errors)};

  if(schedule.hasOwnProperty("enabled"))
    if(!schedule.enabled)
      return {"result": null, "error": "schedule is disabled"};

  let result = null;     
  //oneTime
  if(schedule.hasOwnProperty("oneTime")) {        
    let oneTime = schedule.oneTime;        
    /* istanbul ignore else  */
    if(parseDateTime(oneTime) > getDateTime())
      result = oneTime;
  }
  //eachNDay 
  if(schedule.hasOwnProperty("eachNDay")) {        
    //searching for a day of run        
    let currentDate = new Date(getDateTime().setUTCHours(0, 0, 0, 0));
    //due to save milliseconds and not link newDateTime object with schedule.startDateTime
    let newDateTime = parseDateTime(schedule.startDateTime);
    newDateTime.setUTCHours(0, 0, 0, 0);
    while(newDateTime < currentDate) {
      newDateTime = addDate(newDateTime, 0, 0, schedule.eachNDay);
    }        
    //as far as day was found - start to search moment in a day for run
    result = calculateTimeOfRun(schedule, newDateTime);
        
    //day overwhelming after adding interval or already happend, go to future, to next N day
    if(result == null) {
      newDateTime = addDate(newDateTime, 0, 0, schedule.eachNDay);
      newDateTime.setUTCHours(0, 0, 0, 0);
      result = calculateTimeOfRun(schedule, newDateTime);
    }
  }    
  //eachNWeek
  if(schedule.hasOwnProperty("eachNWeek")) {               
    //due to save milliseconds and not link newDateTime object with schedule.startDateTime
    let newDateTime = new Date(parseDateTime(schedule.startDateTime));
    newDateTime.setUTCHours(0, 0, 0, 0);
    //find Sunday of start week 
    newDateTime = addDate(newDateTime, 0, 0, -newDateTime.getUTCDay());
    //make start point as Sunday of start week + (eachNWeek-1) weeks due to find first sunday for checking            
    newDateTime = addDate(newDateTime, 0, 0, 7*(schedule.eachNWeek - 1));
    //find Sunday of current week    
    let currentDate = new Date((new Date()).setUTCHours(0, 0, 0, 0));
    let currentWeekSunday = addDate(currentDate, 0, 0, -currentDate.getUTCDay());            
    //find Sunday of week where next run day(s) are        
    while(newDateTime < currentWeekSunday) {
      newDateTime = addDate(newDateTime, 0, 0, 7*schedule.eachNWeek);
    }          
        
    let calculationResult = calculateWeekDayOfRun(schedule, newDateTime);
    if(calculationResult)
      newDateTime = calculationResult;

    //as far as begining of the week was found - start to search day for execution
    while(newDateTime < parseDateTime(schedule.startDateTime) || newDateTime < getDateTime()) {
      newDateTime = addDate(newDateTime, 0, 0, 7*schedule.eachNWeek);   
      calculationResult = calculateWeekDayOfRun(schedule, newDateTime);       
      /* istanbul ignore else  */
      if(calculationResult)
        newDateTime = calculationResult;
    }        

    result = newDateTime;      
  }  
  //month
  if(schedule.hasOwnProperty("month")) {                               
    let newDateTime = new Date(parseDateTime(schedule.startDateTime));
    let currentDatetime = getDateTime();
    /* istanbul ignore else  */
    if(newDateTime < currentDatetime)             
      newDateTime = currentDatetime;
            
    let dayList = schedule.day.sort((a, b) => a - b);   

    newDateTime.setUTCHours(0, 0, 0, 0);
    let monthIndex = getDateTime().getMonth();
    //make 1 year round. If date is not found within 1 year - next run can not be calculated
    monthLoop:
    for(let i=0; i<13; i++) {
      if(schedule.month.includes(monthList[monthIndex])) {
        //month found, start to check day list         
        for(let i=0; i<dayList.length; i++) {
          newDateTime.setMonth(monthIndex, dayList[i]);
          //as far as day was found - start to search moment in a day for run
          let calculationResult = calculateTimeOfRun(schedule, newDateTime);
          if(calculationResult && calculationResult > getDateTime()) {
            result = calculationResult;
            break monthLoop;
          }
        }
      }
      monthIndex++;
      if(monthIndex == 12) {
        monthIndex = 0;
        newDateTime = addDate(newDateTime, 1);
      }
    }                 
  }     
  //check for end date-time restriction
  if(schedule.endDateTime && result) {
    if(result > parseDateTime(schedule.endDateTime)) 
      return {"result": null, "error": "calculated date-time earlier than endDateTime"};
    else
      return {"result": result, "error": null};           
  }
  else {
    if(result != null)
      return {"result": parseDateTime(result), "error": null};
    else
      return {"result": null, "error": "not able to calculate next run date-time"};
  }
};
/**
 * Prints summary of schedule object in human readable format. E.g. "Each 2 day(s) at 11:30:00"
 * @param {Object} schedule Schedule for which summary should be printed
 * @param {string} [options] Optional. A locale string or array of locale (see Date.toLocaleString)  
 * @param {Object} [locale] Optional. An object that contains one or more properties that specify comparison options (see Date.toLocaleString)
 * @returns {string} String with summary
 */
module.exports.summary = (schedule, locale, options) => {
  let result = '';
	
  if(Object.prototype.hasOwnProperty.call(schedule, 'oneTime')) {
    result = `Once at ${formatDateTime(schedule.oneTime)}`;
  }
	
  if(Object.prototype.hasOwnProperty.call(schedule, 'eachNDay')) {
    result = `Each ${schedule.eachNDay} day(s), ${getDailyFrequency(schedule.dailyFrequency)}, ${getStartEnd(schedule)}`;
  }
	
  if(Object.prototype.hasOwnProperty.call(schedule, 'eachNWeek')) {
    result = `Each ${schedule.eachNWeek} week(s) on ${getWeekDays(schedule.dayOfWeek)}, ${getDailyFrequency(schedule.dailyFrequency)}, ${getStartEnd(schedule)}`;
  }
	
  if(Object.prototype.hasOwnProperty.call(schedule, 'month')) {
    result = `In ${getMonths(schedule.month)} each ${getMonthDays(schedule.day)} day, ${getDailyFrequency(schedule.dailyFrequency)}, ${getStartEnd(schedule)}`;
  }

  return result;
}
/**
 * 
 * @param {Object} dailyFrequency Daily frequency object
 * @returns {string} Human readable value of daily frequency
 */
function getDailyFrequency(dailyFrequency) {
  if(dailyFrequency.hasOwnProperty('occursOnceAt')) {
    return `at ${dailyFrequency.occursOnceAt}`;
  } else {
    let dailyEnd = dailyFrequency.end === undefined ? '23:59:59' : dailyFrequency.end;
    return `every ${dailyFrequency.occursEvery.intervalValue} ${dailyFrequency.occursEvery.intervalType}(s) between ${dailyFrequency.start} and ${dailyEnd}`;
  }
}
/**
 * Callback for array.reduce. Returns human readable and beautiful enumeration of list like "x, y, z and a"
 * @returns {string} String which represents list in a format "x, y, z and a"
 */
function listReducer(acc, cur, ind, arr) {
  let result = `${acc}${cur}`;
  if(arr.length > 2 && ind < arr.length - 2)
    result = `${result}, `;
  if(ind === arr.length - 2)
    result = `${result} and `;

  return result;
}
/**
 * Formats weekday list in a format "x, y, z and a"
 * @param {Array} weekDays Array with week days
 * @returns {string} Human readable value of week days list
 */
function getWeekDays(weekDays) {
  let weekDayList = {
    "sun": "Sunday", 
    "mon": "Monday", 
    "tue": "Tuesday", 
    "wed": "Wednesday", 
    "thu": "Thursday", 
    "fri": "Friday", 
    "sat": "Saturday"
  };

  let choosenWeekDays = weekDays.map((val) => weekDayList[val]);
	
  return choosenWeekDays.reduce(listReducer, '');
}
/**
 * Formats months list in a format "x, y, z and a"
 * @param {Array} weekDays Array with months
 * @returns {string} Human readable value of months list
 */
function getMonths(months) {
  let monthList = {
    "jan": "January", 
    "feb": "February", 
    "mar": "March", 
    "apr": "April", 
    "may": "May", 
    "jun": "June", 
    "jul": "July", 
    "aug": "August", 
    "sep": "September", 
    "oct": "October", 
    "nov": "November", 
    "dec": "December"
  };
	
  let choosenMonths = months.map((val) => monthList[val]);
  return choosenMonths.reduce(listReducer, '');
}
/**
 * Formats month days list in a format "x, y, z and a"
 * @param {Array} weekDays Array with month days
 * @returns {string} Human readable value of month days list
 */
function getMonthDays(monthDays) {
  return monthDays.reduce(listReducer, '');
}
/**
 * Returns human readable string with information about star and end date-time
 * @param {Object} schedule Schedule object
 * @returns {string} Human readable string
 */
function getStartEnd(schedule) {
  let result = '';
	
  if(schedule.hasOwnProperty('startDateTime')) {
    result = `starting ${formatDateTime(schedule.startDateTime)}`; 
  }
  if(schedule.hasOwnProperty('endDateTime')) {
    result = `${result} and till ${formatDateTime(schedule.endDateTime)}`; 
  }
	
  return result;
}
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/schedule.js","/")
},{"./models.json":2,"./tools":4,"ajv":5,"buffer":48,"pBGvAp":53}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
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
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/tools.js","/")
},{"ajv":5,"buffer":48,"pBGvAp":53}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var compileSchema = require('./compile')
  , resolve = require('./compile/resolve')
  , Cache = require('./cache')
  , SchemaObject = require('./compile/schema_obj')
  , stableStringify = require('fast-json-stable-stringify')
  , formats = require('./compile/formats')
  , rules = require('./compile/rules')
  , $dataMetaSchema = require('./data')
  , util = require('./compile/util');

module.exports = Ajv;

Ajv.prototype.validate = validate;
Ajv.prototype.compile = compile;
Ajv.prototype.addSchema = addSchema;
Ajv.prototype.addMetaSchema = addMetaSchema;
Ajv.prototype.validateSchema = validateSchema;
Ajv.prototype.getSchema = getSchema;
Ajv.prototype.removeSchema = removeSchema;
Ajv.prototype.addFormat = addFormat;
Ajv.prototype.errorsText = errorsText;

Ajv.prototype._addSchema = _addSchema;
Ajv.prototype._compile = _compile;

Ajv.prototype.compileAsync = require('./compile/async');
var customKeyword = require('./keyword');
Ajv.prototype.addKeyword = customKeyword.add;
Ajv.prototype.getKeyword = customKeyword.get;
Ajv.prototype.removeKeyword = customKeyword.remove;
Ajv.prototype.validateKeyword = customKeyword.validate;

var errorClasses = require('./compile/error_classes');
Ajv.ValidationError = errorClasses.Validation;
Ajv.MissingRefError = errorClasses.MissingRef;
Ajv.$dataMetaSchema = $dataMetaSchema;

var META_SCHEMA_ID = 'http://json-schema.org/draft-07/schema';

var META_IGNORE_OPTIONS = [ 'removeAdditional', 'useDefaults', 'coerceTypes', 'strictDefaults' ];
var META_SUPPORT_DATA = ['/properties'];

/**
 * Creates validator instance.
 * Usage: `Ajv(opts)`
 * @param {Object} opts optional options
 * @return {Object} ajv instance
 */
function Ajv(opts) {
  if (!(this instanceof Ajv)) return new Ajv(opts);
  opts = this._opts = util.copy(opts) || {};
  setLogger(this);
  this._schemas = {};
  this._refs = {};
  this._fragments = {};
  this._formats = formats(opts.format);

  this._cache = opts.cache || new Cache;
  this._loadingSchemas = {};
  this._compilations = [];
  this.RULES = rules();
  this._getId = chooseGetId(opts);

  opts.loopRequired = opts.loopRequired || Infinity;
  if (opts.errorDataPath == 'property') opts._errorDataPathProperty = true;
  if (opts.serialize === undefined) opts.serialize = stableStringify;
  this._metaOpts = getMetaSchemaOptions(this);

  if (opts.formats) addInitialFormats(this);
  if (opts.keywords) addInitialKeywords(this);
  addDefaultMetaSchema(this);
  if (typeof opts.meta == 'object') this.addMetaSchema(opts.meta);
  if (opts.nullable) this.addKeyword('nullable', {metaSchema: {type: 'boolean'}});
  addInitialSchemas(this);
}



/**
 * Validate data using schema
 * Schema will be compiled and cached (using serialized JSON as key. [fast-json-stable-stringify](https://github.com/epoberezkin/fast-json-stable-stringify) is used to serialize.
 * @this   Ajv
 * @param  {String|Object} schemaKeyRef key, ref or schema object
 * @param  {Any} data to be validated
 * @return {Boolean} validation result. Errors from the last validation will be available in `ajv.errors` (and also in compiled schema: `schema.errors`).
 */
function validate(schemaKeyRef, data) {
  var v;
  if (typeof schemaKeyRef == 'string') {
    v = this.getSchema(schemaKeyRef);
    if (!v) throw new Error('no schema with key or ref "' + schemaKeyRef + '"');
  } else {
    var schemaObj = this._addSchema(schemaKeyRef);
    v = schemaObj.validate || this._compile(schemaObj);
  }

  var valid = v(data);
  if (v.$async !== true) this.errors = v.errors;
  return valid;
}


/**
 * Create validating function for passed schema.
 * @this   Ajv
 * @param  {Object} schema schema object
 * @param  {Boolean} _meta true if schema is a meta-schema. Used internally to compile meta schemas of custom keywords.
 * @return {Function} validating function
 */
function compile(schema, _meta) {
  var schemaObj = this._addSchema(schema, undefined, _meta);
  return schemaObj.validate || this._compile(schemaObj);
}


/**
 * Adds schema to the instance.
 * @this   Ajv
 * @param {Object|Array} schema schema or array of schemas. If array is passed, `key` and other parameters will be ignored.
 * @param {String} key Optional schema key. Can be passed to `validate` method instead of schema object or id/ref. One schema per instance can have empty `id` and `key`.
 * @param {Boolean} _skipValidation true to skip schema validation. Used internally, option validateSchema should be used instead.
 * @param {Boolean} _meta true if schema is a meta-schema. Used internally, addMetaSchema should be used instead.
 * @return {Ajv} this for method chaining
 */
function addSchema(schema, key, _skipValidation, _meta) {
  if (Array.isArray(schema)){
    for (var i=0; i<schema.length; i++) this.addSchema(schema[i], undefined, _skipValidation, _meta);
    return this;
  }
  var id = this._getId(schema);
  if (id !== undefined && typeof id != 'string')
    throw new Error('schema id must be string');
  key = resolve.normalizeId(key || id);
  checkUnique(this, key);
  this._schemas[key] = this._addSchema(schema, _skipValidation, _meta, true);
  return this;
}


/**
 * Add schema that will be used to validate other schemas
 * options in META_IGNORE_OPTIONS are alway set to false
 * @this   Ajv
 * @param {Object} schema schema object
 * @param {String} key optional schema key
 * @param {Boolean} skipValidation true to skip schema validation, can be used to override validateSchema option for meta-schema
 * @return {Ajv} this for method chaining
 */
function addMetaSchema(schema, key, skipValidation) {
  this.addSchema(schema, key, skipValidation, true);
  return this;
}


/**
 * Validate schema
 * @this   Ajv
 * @param {Object} schema schema to validate
 * @param {Boolean} throwOrLogError pass true to throw (or log) an error if invalid
 * @return {Boolean} true if schema is valid
 */
function validateSchema(schema, throwOrLogError) {
  var $schema = schema.$schema;
  if ($schema !== undefined && typeof $schema != 'string')
    throw new Error('$schema must be a string');
  $schema = $schema || this._opts.defaultMeta || defaultMeta(this);
  if (!$schema) {
    this.logger.warn('meta-schema not available');
    this.errors = null;
    return true;
  }
  var valid = this.validate($schema, schema);
  if (!valid && throwOrLogError) {
    var message = 'schema is invalid: ' + this.errorsText();
    if (this._opts.validateSchema == 'log') this.logger.error(message);
    else throw new Error(message);
  }
  return valid;
}


function defaultMeta(self) {
  var meta = self._opts.meta;
  self._opts.defaultMeta = typeof meta == 'object'
                            ? self._getId(meta) || meta
                            : self.getSchema(META_SCHEMA_ID)
                              ? META_SCHEMA_ID
                              : undefined;
  return self._opts.defaultMeta;
}


/**
 * Get compiled schema from the instance by `key` or `ref`.
 * @this   Ajv
 * @param  {String} keyRef `key` that was passed to `addSchema` or full schema reference (`schema.id` or resolved id).
 * @return {Function} schema validating function (with property `schema`).
 */
function getSchema(keyRef) {
  var schemaObj = _getSchemaObj(this, keyRef);
  switch (typeof schemaObj) {
    case 'object': return schemaObj.validate || this._compile(schemaObj);
    case 'string': return this.getSchema(schemaObj);
    case 'undefined': return _getSchemaFragment(this, keyRef);
  }
}


function _getSchemaFragment(self, ref) {
  var res = resolve.schema.call(self, { schema: {} }, ref);
  if (res) {
    var schema = res.schema
      , root = res.root
      , baseId = res.baseId;
    var v = compileSchema.call(self, schema, root, undefined, baseId);
    self._fragments[ref] = new SchemaObject({
      ref: ref,
      fragment: true,
      schema: schema,
      root: root,
      baseId: baseId,
      validate: v
    });
    return v;
  }
}


function _getSchemaObj(self, keyRef) {
  keyRef = resolve.normalizeId(keyRef);
  return self._schemas[keyRef] || self._refs[keyRef] || self._fragments[keyRef];
}


/**
 * Remove cached schema(s).
 * If no parameter is passed all schemas but meta-schemas are removed.
 * If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
 * Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
 * @this   Ajv
 * @param  {String|Object|RegExp} schemaKeyRef key, ref, pattern to match key/ref or schema object
 * @return {Ajv} this for method chaining
 */
function removeSchema(schemaKeyRef) {
  if (schemaKeyRef instanceof RegExp) {
    _removeAllSchemas(this, this._schemas, schemaKeyRef);
    _removeAllSchemas(this, this._refs, schemaKeyRef);
    return this;
  }
  switch (typeof schemaKeyRef) {
    case 'undefined':
      _removeAllSchemas(this, this._schemas);
      _removeAllSchemas(this, this._refs);
      this._cache.clear();
      return this;
    case 'string':
      var schemaObj = _getSchemaObj(this, schemaKeyRef);
      if (schemaObj) this._cache.del(schemaObj.cacheKey);
      delete this._schemas[schemaKeyRef];
      delete this._refs[schemaKeyRef];
      return this;
    case 'object':
      var serialize = this._opts.serialize;
      var cacheKey = serialize ? serialize(schemaKeyRef) : schemaKeyRef;
      this._cache.del(cacheKey);
      var id = this._getId(schemaKeyRef);
      if (id) {
        id = resolve.normalizeId(id);
        delete this._schemas[id];
        delete this._refs[id];
      }
  }
  return this;
}


function _removeAllSchemas(self, schemas, regex) {
  for (var keyRef in schemas) {
    var schemaObj = schemas[keyRef];
    if (!schemaObj.meta && (!regex || regex.test(keyRef))) {
      self._cache.del(schemaObj.cacheKey);
      delete schemas[keyRef];
    }
  }
}


/* @this   Ajv */
function _addSchema(schema, skipValidation, meta, shouldAddSchema) {
  if (typeof schema != 'object' && typeof schema != 'boolean')
    throw new Error('schema should be object or boolean');
  var serialize = this._opts.serialize;
  var cacheKey = serialize ? serialize(schema) : schema;
  var cached = this._cache.get(cacheKey);
  if (cached) return cached;

  shouldAddSchema = shouldAddSchema || this._opts.addUsedSchema !== false;

  var id = resolve.normalizeId(this._getId(schema));
  if (id && shouldAddSchema) checkUnique(this, id);

  var willValidate = this._opts.validateSchema !== false && !skipValidation;
  var recursiveMeta;
  if (willValidate && !(recursiveMeta = id && id == resolve.normalizeId(schema.$schema)))
    this.validateSchema(schema, true);

  var localRefs = resolve.ids.call(this, schema);

  var schemaObj = new SchemaObject({
    id: id,
    schema: schema,
    localRefs: localRefs,
    cacheKey: cacheKey,
    meta: meta
  });

  if (id[0] != '#' && shouldAddSchema) this._refs[id] = schemaObj;
  this._cache.put(cacheKey, schemaObj);

  if (willValidate && recursiveMeta) this.validateSchema(schema, true);

  return schemaObj;
}


/* @this   Ajv */
function _compile(schemaObj, root) {
  if (schemaObj.compiling) {
    schemaObj.validate = callValidate;
    callValidate.schema = schemaObj.schema;
    callValidate.errors = null;
    callValidate.root = root ? root : callValidate;
    if (schemaObj.schema.$async === true)
      callValidate.$async = true;
    return callValidate;
  }
  schemaObj.compiling = true;

  var currentOpts;
  if (schemaObj.meta) {
    currentOpts = this._opts;
    this._opts = this._metaOpts;
  }

  var v;
  try { v = compileSchema.call(this, schemaObj.schema, root, schemaObj.localRefs); }
  catch(e) {
    delete schemaObj.validate;
    throw e;
  }
  finally {
    schemaObj.compiling = false;
    if (schemaObj.meta) this._opts = currentOpts;
  }

  schemaObj.validate = v;
  schemaObj.refs = v.refs;
  schemaObj.refVal = v.refVal;
  schemaObj.root = v.root;
  return v;


  /* @this   {*} - custom context, see passContext option */
  function callValidate() {
    /* jshint validthis: true */
    var _validate = schemaObj.validate;
    var result = _validate.apply(this, arguments);
    callValidate.errors = _validate.errors;
    return result;
  }
}


function chooseGetId(opts) {
  switch (opts.schemaId) {
    case 'auto': return _get$IdOrId;
    case 'id': return _getId;
    default: return _get$Id;
  }
}

/* @this   Ajv */
function _getId(schema) {
  if (schema.$id) this.logger.warn('schema $id ignored', schema.$id);
  return schema.id;
}

/* @this   Ajv */
function _get$Id(schema) {
  if (schema.id) this.logger.warn('schema id ignored', schema.id);
  return schema.$id;
}


function _get$IdOrId(schema) {
  if (schema.$id && schema.id && schema.$id != schema.id)
    throw new Error('schema $id is different from id');
  return schema.$id || schema.id;
}


/**
 * Convert array of error message objects to string
 * @this   Ajv
 * @param  {Array<Object>} errors optional array of validation errors, if not passed errors from the instance are used.
 * @param  {Object} options optional options with properties `separator` and `dataVar`.
 * @return {String} human readable string with all errors descriptions
 */
function errorsText(errors, options) {
  errors = errors || this.errors;
  if (!errors) return 'No errors';
  options = options || {};
  var separator = options.separator === undefined ? ', ' : options.separator;
  var dataVar = options.dataVar === undefined ? 'data' : options.dataVar;

  var text = '';
  for (var i=0; i<errors.length; i++) {
    var e = errors[i];
    if (e) text += dataVar + e.dataPath + ' ' + e.message + separator;
  }
  return text.slice(0, -separator.length);
}


/**
 * Add custom format
 * @this   Ajv
 * @param {String} name format name
 * @param {String|RegExp|Function} format string is converted to RegExp; function should return boolean (true when valid)
 * @return {Ajv} this for method chaining
 */
function addFormat(name, format) {
  if (typeof format == 'string') format = new RegExp(format);
  this._formats[name] = format;
  return this;
}


function addDefaultMetaSchema(self) {
  var $dataSchema;
  if (self._opts.$data) {
    $dataSchema = require('./refs/data.json');
    self.addMetaSchema($dataSchema, $dataSchema.$id, true);
  }
  if (self._opts.meta === false) return;
  var metaSchema = require('./refs/json-schema-draft-07.json');
  if (self._opts.$data) metaSchema = $dataMetaSchema(metaSchema, META_SUPPORT_DATA);
  self.addMetaSchema(metaSchema, META_SCHEMA_ID, true);
  self._refs['http://json-schema.org/schema'] = META_SCHEMA_ID;
}


function addInitialSchemas(self) {
  var optsSchemas = self._opts.schemas;
  if (!optsSchemas) return;
  if (Array.isArray(optsSchemas)) self.addSchema(optsSchemas);
  else for (var key in optsSchemas) self.addSchema(optsSchemas[key], key);
}


function addInitialFormats(self) {
  for (var name in self._opts.formats) {
    var format = self._opts.formats[name];
    self.addFormat(name, format);
  }
}


function addInitialKeywords(self) {
  for (var name in self._opts.keywords) {
    var keyword = self._opts.keywords[name];
    self.addKeyword(name, keyword);
  }
}


function checkUnique(self, id) {
  if (self._schemas[id] || self._refs[id])
    throw new Error('schema with key or id "' + id + '" already exists');
}


function getMetaSchemaOptions(self) {
  var metaOpts = util.copy(self._opts);
  for (var i=0; i<META_IGNORE_OPTIONS.length; i++)
    delete metaOpts[META_IGNORE_OPTIONS[i]];
  return metaOpts;
}


function setLogger(self) {
  var logger = self._opts.logger;
  if (logger === false) {
    self.logger = {log: noop, warn: noop, error: noop};
  } else {
    if (logger === undefined) logger = console;
    if (!(typeof logger == 'object' && logger.log && logger.warn && logger.error))
      throw new Error('logger must implement log, warn and error methods');
    self.logger = logger;
  }
}


function noop() {}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/ajv.js","/../node_modules/ajv/lib")
},{"./cache":6,"./compile":10,"./compile/async":7,"./compile/error_classes":8,"./compile/formats":9,"./compile/resolve":11,"./compile/rules":12,"./compile/schema_obj":13,"./compile/util":15,"./data":16,"./keyword":44,"./refs/data.json":45,"./refs/json-schema-draft-07.json":46,"buffer":48,"fast-json-stable-stringify":50,"pBGvAp":53}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';


var Cache = module.exports = function Cache() {
  this._cache = {};
};


Cache.prototype.put = function Cache_put(key, value) {
  this._cache[key] = value;
};


Cache.prototype.get = function Cache_get(key) {
  return this._cache[key];
};


Cache.prototype.del = function Cache_del(key) {
  delete this._cache[key];
};


Cache.prototype.clear = function Cache_clear() {
  this._cache = {};
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/cache.js","/../node_modules/ajv/lib")
},{"buffer":48,"pBGvAp":53}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var MissingRefError = require('./error_classes').MissingRef;

module.exports = compileAsync;


/**
 * Creates validating function for passed schema with asynchronous loading of missing schemas.
 * `loadSchema` option should be a function that accepts schema uri and returns promise that resolves with the schema.
 * @this  Ajv
 * @param {Object}   schema schema object
 * @param {Boolean}  meta optional true to compile meta-schema; this parameter can be skipped
 * @param {Function} callback an optional node-style callback, it is called with 2 parameters: error (or null) and validating function.
 * @return {Promise} promise that resolves with a validating function.
 */
function compileAsync(schema, meta, callback) {
  /* eslint no-shadow: 0 */
  /* global Promise */
  /* jshint validthis: true */
  var self = this;
  if (typeof this._opts.loadSchema != 'function')
    throw new Error('options.loadSchema should be a function');

  if (typeof meta == 'function') {
    callback = meta;
    meta = undefined;
  }

  var p = loadMetaSchemaOf(schema).then(function () {
    var schemaObj = self._addSchema(schema, undefined, meta);
    return schemaObj.validate || _compileAsync(schemaObj);
  });

  if (callback) {
    p.then(
      function(v) { callback(null, v); },
      callback
    );
  }

  return p;


  function loadMetaSchemaOf(sch) {
    var $schema = sch.$schema;
    return $schema && !self.getSchema($schema)
            ? compileAsync.call(self, { $ref: $schema }, true)
            : Promise.resolve();
  }


  function _compileAsync(schemaObj) {
    try { return self._compile(schemaObj); }
    catch(e) {
      if (e instanceof MissingRefError) return loadMissingSchema(e);
      throw e;
    }


    function loadMissingSchema(e) {
      var ref = e.missingSchema;
      if (added(ref)) throw new Error('Schema ' + ref + ' is loaded but ' + e.missingRef + ' cannot be resolved');

      var schemaPromise = self._loadingSchemas[ref];
      if (!schemaPromise) {
        schemaPromise = self._loadingSchemas[ref] = self._opts.loadSchema(ref);
        schemaPromise.then(removePromise, removePromise);
      }

      return schemaPromise.then(function (sch) {
        if (!added(ref)) {
          return loadMetaSchemaOf(sch).then(function () {
            if (!added(ref)) self.addSchema(sch, ref, undefined, meta);
          });
        }
      }).then(function() {
        return _compileAsync(schemaObj);
      });

      function removePromise() {
        delete self._loadingSchemas[ref];
      }

      function added(ref) {
        return self._refs[ref] || self._schemas[ref];
      }
    }
  }
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/compile/async.js","/../node_modules/ajv/lib/compile")
},{"./error_classes":8,"buffer":48,"pBGvAp":53}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var resolve = require('./resolve');

module.exports = {
  Validation: errorSubclass(ValidationError),
  MissingRef: errorSubclass(MissingRefError)
};


function ValidationError(errors) {
  this.message = 'validation failed';
  this.errors = errors;
  this.ajv = this.validation = true;
}


MissingRefError.message = function (baseId, ref) {
  return 'can\'t resolve reference ' + ref + ' from id ' + baseId;
};


function MissingRefError(baseId, ref, message) {
  this.message = message || MissingRefError.message(baseId, ref);
  this.missingRef = resolve.url(baseId, ref);
  this.missingSchema = resolve.normalizeId(resolve.fullPath(this.missingRef));
}


function errorSubclass(Subclass) {
  Subclass.prototype = Object.create(Error.prototype);
  Subclass.prototype.constructor = Subclass;
  return Subclass;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/compile/error_classes.js","/../node_modules/ajv/lib/compile")
},{"./resolve":11,"buffer":48,"pBGvAp":53}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var util = require('./util');

var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
var DAYS = [0,31,28,31,30,31,30,31,31,30,31,30,31];
var TIME = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i;
var HOSTNAME = /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i;
var URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
var URIREF = /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
// uri-template: https://tools.ietf.org/html/rfc6570
var URITEMPLATE = /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i;
// For the source: https://gist.github.com/dperini/729294
// For test cases: https://mathiasbynens.be/demo/url-regex
// @todo Delete current URL in favour of the commented out URL rule when this issue is fixed https://github.com/eslint/eslint/issues/7983.
// var URL = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u{00a1}-\u{ffff}0-9]+-)*[a-z\u{00a1}-\u{ffff}0-9]+)(?:\.(?:[a-z\u{00a1}-\u{ffff}0-9]+-)*[a-z\u{00a1}-\u{ffff}0-9]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu;
var URL = /^(?:(?:http[s\u017F]?|ftp):\/\/)(?:(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+(?::(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)?@)?(?:(?!10(?:\.[0-9]{1,3}){3})(?!127(?:\.[0-9]{1,3}){3})(?!169\.254(?:\.[0-9]{1,3}){2})(?!192\.168(?:\.[0-9]{1,3}){2})(?!172\.(?:1[6-9]|2[0-9]|3[01])(?:\.[0-9]{1,3}){2})(?:[1-9][0-9]?|1[0-9][0-9]|2[01][0-9]|22[0-3])(?:\.(?:1?[0-9]{1,2}|2[0-4][0-9]|25[0-5])){2}(?:\.(?:[1-9][0-9]?|1[0-9][0-9]|2[0-4][0-9]|25[0-4]))|(?:(?:(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+-)*(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+)(?:\.(?:(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+-)*(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+)*(?:\.(?:(?:[a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]){2,})))(?::[0-9]{2,5})?(?:\/(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)?$/i;
var UUID = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
var JSON_POINTER = /^(?:\/(?:[^~/]|~0|~1)*)*$/;
var JSON_POINTER_URI_FRAGMENT = /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i;
var RELATIVE_JSON_POINTER = /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/;


module.exports = formats;

function formats(mode) {
  mode = mode == 'full' ? 'full' : 'fast';
  return util.copy(formats[mode]);
}


formats.fast = {
  // date: http://tools.ietf.org/html/rfc3339#section-5.6
  date: /^\d\d\d\d-[0-1]\d-[0-3]\d$/,
  // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
  time: /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i,
  'date-time': /^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i,
  // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
  uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
  'uri-reference': /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
  'uri-template': URITEMPLATE,
  url: URL,
  // email (sources from jsen validator):
  // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
  // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'willful violation')
  email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
  hostname: HOSTNAME,
  // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
  ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  // optimized http://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses
  ipv6: /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
  regex: regex,
  // uuid: http://tools.ietf.org/html/rfc4122
  uuid: UUID,
  // JSON-pointer: https://tools.ietf.org/html/rfc6901
  // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
  'json-pointer': JSON_POINTER,
  'json-pointer-uri-fragment': JSON_POINTER_URI_FRAGMENT,
  // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
  'relative-json-pointer': RELATIVE_JSON_POINTER
};


formats.full = {
  date: date,
  time: time,
  'date-time': date_time,
  uri: uri,
  'uri-reference': URIREF,
  'uri-template': URITEMPLATE,
  url: URL,
  email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
  hostname: HOSTNAME,
  ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  ipv6: /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
  regex: regex,
  uuid: UUID,
  'json-pointer': JSON_POINTER,
  'json-pointer-uri-fragment': JSON_POINTER_URI_FRAGMENT,
  'relative-json-pointer': RELATIVE_JSON_POINTER
};


function isLeapYear(year) {
  // https://tools.ietf.org/html/rfc3339#appendix-C
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}


function date(str) {
  // full-date from http://tools.ietf.org/html/rfc3339#section-5.6
  var matches = str.match(DATE);
  if (!matches) return false;

  var year = +matches[1];
  var month = +matches[2];
  var day = +matches[3];

  return month >= 1 && month <= 12 && day >= 1 &&
          day <= (month == 2 && isLeapYear(year) ? 29 : DAYS[month]);
}


function time(str, full) {
  var matches = str.match(TIME);
  if (!matches) return false;

  var hour = matches[1];
  var minute = matches[2];
  var second = matches[3];
  var timeZone = matches[5];
  return ((hour <= 23 && minute <= 59 && second <= 59) ||
          (hour == 23 && minute == 59 && second == 60)) &&
         (!full || timeZone);
}


var DATE_TIME_SEPARATOR = /t|\s/i;
function date_time(str) {
  // http://tools.ietf.org/html/rfc3339#section-5.6
  var dateTime = str.split(DATE_TIME_SEPARATOR);
  return dateTime.length == 2 && date(dateTime[0]) && time(dateTime[1], true);
}


var NOT_URI_FRAGMENT = /\/|:/;
function uri(str) {
  // http://jmrware.com/articles/2009/uri_regexp/URI_regex.html + optional protocol + required "."
  return NOT_URI_FRAGMENT.test(str) && URI.test(str);
}


var Z_ANCHOR = /[^\\]\\Z/;
function regex(str) {
  if (Z_ANCHOR.test(str)) return false;
  try {
    new RegExp(str);
    return true;
  } catch(e) {
    return false;
  }
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/compile/formats.js","/../node_modules/ajv/lib/compile")
},{"./util":15,"buffer":48,"pBGvAp":53}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var resolve = require('./resolve')
  , util = require('./util')
  , errorClasses = require('./error_classes')
  , stableStringify = require('fast-json-stable-stringify');

var validateGenerator = require('../dotjs/validate');

/**
 * Functions below are used inside compiled validations function
 */

var ucs2length = util.ucs2length;
var equal = require('fast-deep-equal');

// this error is thrown by async schemas to return validation errors via exception
var ValidationError = errorClasses.Validation;

module.exports = compile;


/**
 * Compiles schema to validation function
 * @this   Ajv
 * @param  {Object} schema schema object
 * @param  {Object} root object with information about the root schema for this schema
 * @param  {Object} localRefs the hash of local references inside the schema (created by resolve.id), used for inline resolution
 * @param  {String} baseId base ID for IDs in the schema
 * @return {Function} validation function
 */
function compile(schema, root, localRefs, baseId) {
  /* jshint validthis: true, evil: true */
  /* eslint no-shadow: 0 */
  var self = this
    , opts = this._opts
    , refVal = [ undefined ]
    , refs = {}
    , patterns = []
    , patternsHash = {}
    , defaults = []
    , defaultsHash = {}
    , customRules = [];

  root = root || { schema: schema, refVal: refVal, refs: refs };

  var c = checkCompiling.call(this, schema, root, baseId);
  var compilation = this._compilations[c.index];
  if (c.compiling) return (compilation.callValidate = callValidate);

  var formats = this._formats;
  var RULES = this.RULES;

  try {
    var v = localCompile(schema, root, localRefs, baseId);
    compilation.validate = v;
    var cv = compilation.callValidate;
    if (cv) {
      cv.schema = v.schema;
      cv.errors = null;
      cv.refs = v.refs;
      cv.refVal = v.refVal;
      cv.root = v.root;
      cv.$async = v.$async;
      if (opts.sourceCode) cv.source = v.source;
    }
    return v;
  } finally {
    endCompiling.call(this, schema, root, baseId);
  }

  /* @this   {*} - custom context, see passContext option */
  function callValidate() {
    /* jshint validthis: true */
    var validate = compilation.validate;
    var result = validate.apply(this, arguments);
    callValidate.errors = validate.errors;
    return result;
  }

  function localCompile(_schema, _root, localRefs, baseId) {
    var isRoot = !_root || (_root && _root.schema == _schema);
    if (_root.schema != root.schema)
      return compile.call(self, _schema, _root, localRefs, baseId);

    var $async = _schema.$async === true;

    var sourceCode = validateGenerator({
      isTop: true,
      schema: _schema,
      isRoot: isRoot,
      baseId: baseId,
      root: _root,
      schemaPath: '',
      errSchemaPath: '#',
      errorPath: '""',
      MissingRefError: errorClasses.MissingRef,
      RULES: RULES,
      validate: validateGenerator,
      util: util,
      resolve: resolve,
      resolveRef: resolveRef,
      usePattern: usePattern,
      useDefault: useDefault,
      useCustomRule: useCustomRule,
      opts: opts,
      formats: formats,
      logger: self.logger,
      self: self
    });

    sourceCode = vars(refVal, refValCode) + vars(patterns, patternCode)
                   + vars(defaults, defaultCode) + vars(customRules, customRuleCode)
                   + sourceCode;

    if (opts.processCode) sourceCode = opts.processCode(sourceCode, _schema);
    // console.log('\n\n\n *** \n', JSON.stringify(sourceCode));
    var validate;
    try {
      var makeValidate = new Function(
        'self',
        'RULES',
        'formats',
        'root',
        'refVal',
        'defaults',
        'customRules',
        'equal',
        'ucs2length',
        'ValidationError',
        sourceCode
      );

      validate = makeValidate(
        self,
        RULES,
        formats,
        root,
        refVal,
        defaults,
        customRules,
        equal,
        ucs2length,
        ValidationError
      );

      refVal[0] = validate;
    } catch(e) {
      self.logger.error('Error compiling schema, function code:', sourceCode);
      throw e;
    }

    validate.schema = _schema;
    validate.errors = null;
    validate.refs = refs;
    validate.refVal = refVal;
    validate.root = isRoot ? validate : _root;
    if ($async) validate.$async = true;
    if (opts.sourceCode === true) {
      validate.source = {
        code: sourceCode,
        patterns: patterns,
        defaults: defaults
      };
    }

    return validate;
  }

  function resolveRef(baseId, ref, isRoot) {
    ref = resolve.url(baseId, ref);
    var refIndex = refs[ref];
    var _refVal, refCode;
    if (refIndex !== undefined) {
      _refVal = refVal[refIndex];
      refCode = 'refVal[' + refIndex + ']';
      return resolvedRef(_refVal, refCode);
    }
    if (!isRoot && root.refs) {
      var rootRefId = root.refs[ref];
      if (rootRefId !== undefined) {
        _refVal = root.refVal[rootRefId];
        refCode = addLocalRef(ref, _refVal);
        return resolvedRef(_refVal, refCode);
      }
    }

    refCode = addLocalRef(ref);
    var v = resolve.call(self, localCompile, root, ref);
    if (v === undefined) {
      var localSchema = localRefs && localRefs[ref];
      if (localSchema) {
        v = resolve.inlineRef(localSchema, opts.inlineRefs)
            ? localSchema
            : compile.call(self, localSchema, root, localRefs, baseId);
      }
    }

    if (v === undefined) {
      removeLocalRef(ref);
    } else {
      replaceLocalRef(ref, v);
      return resolvedRef(v, refCode);
    }
  }

  function addLocalRef(ref, v) {
    var refId = refVal.length;
    refVal[refId] = v;
    refs[ref] = refId;
    return 'refVal' + refId;
  }

  function removeLocalRef(ref) {
    delete refs[ref];
  }

  function replaceLocalRef(ref, v) {
    var refId = refs[ref];
    refVal[refId] = v;
  }

  function resolvedRef(refVal, code) {
    return typeof refVal == 'object' || typeof refVal == 'boolean'
            ? { code: code, schema: refVal, inline: true }
            : { code: code, $async: refVal && !!refVal.$async };
  }

  function usePattern(regexStr) {
    var index = patternsHash[regexStr];
    if (index === undefined) {
      index = patternsHash[regexStr] = patterns.length;
      patterns[index] = regexStr;
    }
    return 'pattern' + index;
  }

  function useDefault(value) {
    switch (typeof value) {
      case 'boolean':
      case 'number':
        return '' + value;
      case 'string':
        return util.toQuotedString(value);
      case 'object':
        if (value === null) return 'null';
        var valueStr = stableStringify(value);
        var index = defaultsHash[valueStr];
        if (index === undefined) {
          index = defaultsHash[valueStr] = defaults.length;
          defaults[index] = value;
        }
        return 'default' + index;
    }
  }

  function useCustomRule(rule, schema, parentSchema, it) {
    if (self._opts.validateSchema !== false) {
      var deps = rule.definition.dependencies;
      if (deps && !deps.every(function(keyword) {
        return Object.prototype.hasOwnProperty.call(parentSchema, keyword);
      }))
        throw new Error('parent schema must have all required keywords: ' + deps.join(','));

      var validateSchema = rule.definition.validateSchema;
      if (validateSchema) {
        var valid = validateSchema(schema);
        if (!valid) {
          var message = 'keyword schema is invalid: ' + self.errorsText(validateSchema.errors);
          if (self._opts.validateSchema == 'log') self.logger.error(message);
          else throw new Error(message);
        }
      }
    }

    var compile = rule.definition.compile
      , inline = rule.definition.inline
      , macro = rule.definition.macro;

    var validate;
    if (compile) {
      validate = compile.call(self, schema, parentSchema, it);
    } else if (macro) {
      validate = macro.call(self, schema, parentSchema, it);
      if (opts.validateSchema !== false) self.validateSchema(validate, true);
    } else if (inline) {
      validate = inline.call(self, it, rule.keyword, schema, parentSchema);
    } else {
      validate = rule.definition.validate;
      if (!validate) return;
    }

    if (validate === undefined)
      throw new Error('custom keyword "' + rule.keyword + '"failed to compile');

    var index = customRules.length;
    customRules[index] = validate;

    return {
      code: 'customRule' + index,
      validate: validate
    };
  }
}


/**
 * Checks if the schema is currently compiled
 * @this   Ajv
 * @param  {Object} schema schema to compile
 * @param  {Object} root root object
 * @param  {String} baseId base schema ID
 * @return {Object} object with properties "index" (compilation index) and "compiling" (boolean)
 */
function checkCompiling(schema, root, baseId) {
  /* jshint validthis: true */
  var index = compIndex.call(this, schema, root, baseId);
  if (index >= 0) return { index: index, compiling: true };
  index = this._compilations.length;
  this._compilations[index] = {
    schema: schema,
    root: root,
    baseId: baseId
  };
  return { index: index, compiling: false };
}


/**
 * Removes the schema from the currently compiled list
 * @this   Ajv
 * @param  {Object} schema schema to compile
 * @param  {Object} root root object
 * @param  {String} baseId base schema ID
 */
function endCompiling(schema, root, baseId) {
  /* jshint validthis: true */
  var i = compIndex.call(this, schema, root, baseId);
  if (i >= 0) this._compilations.splice(i, 1);
}


/**
 * Index of schema compilation in the currently compiled list
 * @this   Ajv
 * @param  {Object} schema schema to compile
 * @param  {Object} root root object
 * @param  {String} baseId base schema ID
 * @return {Integer} compilation index
 */
function compIndex(schema, root, baseId) {
  /* jshint validthis: true */
  for (var i=0; i<this._compilations.length; i++) {
    var c = this._compilations[i];
    if (c.schema == schema && c.root == root && c.baseId == baseId) return i;
  }
  return -1;
}


function patternCode(i, patterns) {
  return 'var pattern' + i + ' = new RegExp(' + util.toQuotedString(patterns[i]) + ');';
}


function defaultCode(i) {
  return 'var default' + i + ' = defaults[' + i + '];';
}


function refValCode(i, refVal) {
  return refVal[i] === undefined ? '' : 'var refVal' + i + ' = refVal[' + i + '];';
}


function customRuleCode(i) {
  return 'var customRule' + i + ' = customRules[' + i + '];';
}


function vars(arr, statement) {
  if (!arr.length) return '';
  var code = '';
  for (var i=0; i<arr.length; i++)
    code += statement(i, arr);
  return code;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/compile/index.js","/../node_modules/ajv/lib/compile")
},{"../dotjs/validate":43,"./error_classes":8,"./resolve":11,"./util":15,"buffer":48,"fast-deep-equal":49,"fast-json-stable-stringify":50,"pBGvAp":53}],11:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var URI = require('uri-js')
  , equal = require('fast-deep-equal')
  , util = require('./util')
  , SchemaObject = require('./schema_obj')
  , traverse = require('json-schema-traverse');

module.exports = resolve;

resolve.normalizeId = normalizeId;
resolve.fullPath = getFullPath;
resolve.url = resolveUrl;
resolve.ids = resolveIds;
resolve.inlineRef = inlineRef;
resolve.schema = resolveSchema;

/**
 * [resolve and compile the references ($ref)]
 * @this   Ajv
 * @param  {Function} compile reference to schema compilation funciton (localCompile)
 * @param  {Object} root object with information about the root schema for the current schema
 * @param  {String} ref reference to resolve
 * @return {Object|Function} schema object (if the schema can be inlined) or validation function
 */
function resolve(compile, root, ref) {
  /* jshint validthis: true */
  var refVal = this._refs[ref];
  if (typeof refVal == 'string') {
    if (this._refs[refVal]) refVal = this._refs[refVal];
    else return resolve.call(this, compile, root, refVal);
  }

  refVal = refVal || this._schemas[ref];
  if (refVal instanceof SchemaObject) {
    return inlineRef(refVal.schema, this._opts.inlineRefs)
            ? refVal.schema
            : refVal.validate || this._compile(refVal);
  }

  var res = resolveSchema.call(this, root, ref);
  var schema, v, baseId;
  if (res) {
    schema = res.schema;
    root = res.root;
    baseId = res.baseId;
  }

  if (schema instanceof SchemaObject) {
    v = schema.validate || compile.call(this, schema.schema, root, undefined, baseId);
  } else if (schema !== undefined) {
    v = inlineRef(schema, this._opts.inlineRefs)
        ? schema
        : compile.call(this, schema, root, undefined, baseId);
  }

  return v;
}


/**
 * Resolve schema, its root and baseId
 * @this Ajv
 * @param  {Object} root root object with properties schema, refVal, refs
 * @param  {String} ref  reference to resolve
 * @return {Object} object with properties schema, root, baseId
 */
function resolveSchema(root, ref) {
  /* jshint validthis: true */
  var p = URI.parse(ref)
    , refPath = _getFullPath(p)
    , baseId = getFullPath(this._getId(root.schema));
  if (Object.keys(root.schema).length === 0 || refPath !== baseId) {
    var id = normalizeId(refPath);
    var refVal = this._refs[id];
    if (typeof refVal == 'string') {
      return resolveRecursive.call(this, root, refVal, p);
    } else if (refVal instanceof SchemaObject) {
      if (!refVal.validate) this._compile(refVal);
      root = refVal;
    } else {
      refVal = this._schemas[id];
      if (refVal instanceof SchemaObject) {
        if (!refVal.validate) this._compile(refVal);
        if (id == normalizeId(ref))
          return { schema: refVal, root: root, baseId: baseId };
        root = refVal;
      } else {
        return;
      }
    }
    if (!root.schema) return;
    baseId = getFullPath(this._getId(root.schema));
  }
  return getJsonPointer.call(this, p, baseId, root.schema, root);
}


/* @this Ajv */
function resolveRecursive(root, ref, parsedRef) {
  /* jshint validthis: true */
  var res = resolveSchema.call(this, root, ref);
  if (res) {
    var schema = res.schema;
    var baseId = res.baseId;
    root = res.root;
    var id = this._getId(schema);
    if (id) baseId = resolveUrl(baseId, id);
    return getJsonPointer.call(this, parsedRef, baseId, schema, root);
  }
}


var PREVENT_SCOPE_CHANGE = util.toHash(['properties', 'patternProperties', 'enum', 'dependencies', 'definitions']);
/* @this Ajv */
function getJsonPointer(parsedRef, baseId, schema, root) {
  /* jshint validthis: true */
  parsedRef.fragment = parsedRef.fragment || '';
  if (parsedRef.fragment.slice(0,1) != '/') return;
  var parts = parsedRef.fragment.split('/');

  for (var i = 1; i < parts.length; i++) {
    var part = parts[i];
    if (part) {
      part = util.unescapeFragment(part);
      schema = schema[part];
      if (schema === undefined) break;
      var id;
      if (!PREVENT_SCOPE_CHANGE[part]) {
        id = this._getId(schema);
        if (id) baseId = resolveUrl(baseId, id);
        if (schema.$ref) {
          var $ref = resolveUrl(baseId, schema.$ref);
          var res = resolveSchema.call(this, root, $ref);
          if (res) {
            schema = res.schema;
            root = res.root;
            baseId = res.baseId;
          }
        }
      }
    }
  }
  if (schema !== undefined && schema !== root.schema)
    return { schema: schema, root: root, baseId: baseId };
}


var SIMPLE_INLINED = util.toHash([
  'type', 'format', 'pattern',
  'maxLength', 'minLength',
  'maxProperties', 'minProperties',
  'maxItems', 'minItems',
  'maximum', 'minimum',
  'uniqueItems', 'multipleOf',
  'required', 'enum'
]);
function inlineRef(schema, limit) {
  if (limit === false) return false;
  if (limit === undefined || limit === true) return checkNoRef(schema);
  else if (limit) return countKeys(schema) <= limit;
}


function checkNoRef(schema) {
  var item;
  if (Array.isArray(schema)) {
    for (var i=0; i<schema.length; i++) {
      item = schema[i];
      if (typeof item == 'object' && !checkNoRef(item)) return false;
    }
  } else {
    for (var key in schema) {
      if (key == '$ref') return false;
      item = schema[key];
      if (typeof item == 'object' && !checkNoRef(item)) return false;
    }
  }
  return true;
}


function countKeys(schema) {
  var count = 0, item;
  if (Array.isArray(schema)) {
    for (var i=0; i<schema.length; i++) {
      item = schema[i];
      if (typeof item == 'object') count += countKeys(item);
      if (count == Infinity) return Infinity;
    }
  } else {
    for (var key in schema) {
      if (key == '$ref') return Infinity;
      if (SIMPLE_INLINED[key]) {
        count++;
      } else {
        item = schema[key];
        if (typeof item == 'object') count += countKeys(item) + 1;
        if (count == Infinity) return Infinity;
      }
    }
  }
  return count;
}


function getFullPath(id, normalize) {
  if (normalize !== false) id = normalizeId(id);
  var p = URI.parse(id);
  return _getFullPath(p);
}


function _getFullPath(p) {
  return URI.serialize(p).split('#')[0] + '#';
}


var TRAILING_SLASH_HASH = /#\/?$/;
function normalizeId(id) {
  return id ? id.replace(TRAILING_SLASH_HASH, '') : '';
}


function resolveUrl(baseId, id) {
  id = normalizeId(id);
  return URI.resolve(baseId, id);
}


/* @this Ajv */
function resolveIds(schema) {
  var schemaId = normalizeId(this._getId(schema));
  var baseIds = {'': schemaId};
  var fullPaths = {'': getFullPath(schemaId, false)};
  var localRefs = {};
  var self = this;

  traverse(schema, {allKeys: true}, function(sch, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
    if (jsonPtr === '') return;
    var id = self._getId(sch);
    var baseId = baseIds[parentJsonPtr];
    var fullPath = fullPaths[parentJsonPtr] + '/' + parentKeyword;
    if (keyIndex !== undefined)
      fullPath += '/' + (typeof keyIndex == 'number' ? keyIndex : util.escapeFragment(keyIndex));

    if (typeof id == 'string') {
      id = baseId = normalizeId(baseId ? URI.resolve(baseId, id) : id);

      var refVal = self._refs[id];
      if (typeof refVal == 'string') refVal = self._refs[refVal];
      if (refVal && refVal.schema) {
        if (!equal(sch, refVal.schema))
          throw new Error('id "' + id + '" resolves to more than one schema');
      } else if (id != normalizeId(fullPath)) {
        if (id[0] == '#') {
          if (localRefs[id] && !equal(sch, localRefs[id]))
            throw new Error('id "' + id + '" resolves to more than one schema');
          localRefs[id] = sch;
        } else {
          self._refs[id] = fullPath;
        }
      }
    }
    baseIds[jsonPtr] = baseId;
    fullPaths[jsonPtr] = fullPath;
  });

  return localRefs;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/compile/resolve.js","/../node_modules/ajv/lib/compile")
},{"./schema_obj":13,"./util":15,"buffer":48,"fast-deep-equal":49,"json-schema-traverse":52,"pBGvAp":53,"uri-js":54}],12:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var ruleModules = require('../dotjs')
  , toHash = require('./util').toHash;

module.exports = function rules() {
  var RULES = [
    { type: 'number',
      rules: [ { 'maximum': ['exclusiveMaximum'] },
               { 'minimum': ['exclusiveMinimum'] }, 'multipleOf', 'format'] },
    { type: 'string',
      rules: [ 'maxLength', 'minLength', 'pattern', 'format' ] },
    { type: 'array',
      rules: [ 'maxItems', 'minItems', 'items', 'contains', 'uniqueItems' ] },
    { type: 'object',
      rules: [ 'maxProperties', 'minProperties', 'required', 'dependencies', 'propertyNames',
               { 'properties': ['additionalProperties', 'patternProperties'] } ] },
    { rules: [ '$ref', 'const', 'enum', 'not', 'anyOf', 'oneOf', 'allOf', 'if' ] }
  ];

  var ALL = [ 'type', '$comment' ];
  var KEYWORDS = [
    '$schema', '$id', 'id', '$data', '$async', 'title',
    'description', 'default', 'definitions',
    'examples', 'readOnly', 'writeOnly',
    'contentMediaType', 'contentEncoding',
    'additionalItems', 'then', 'else'
  ];
  var TYPES = [ 'number', 'integer', 'string', 'array', 'object', 'boolean', 'null' ];
  RULES.all = toHash(ALL);
  RULES.types = toHash(TYPES);

  RULES.forEach(function (group) {
    group.rules = group.rules.map(function (keyword) {
      var implKeywords;
      if (typeof keyword == 'object') {
        var key = Object.keys(keyword)[0];
        implKeywords = keyword[key];
        keyword = key;
        implKeywords.forEach(function (k) {
          ALL.push(k);
          RULES.all[k] = true;
        });
      }
      ALL.push(keyword);
      var rule = RULES.all[keyword] = {
        keyword: keyword,
        code: ruleModules[keyword],
        implements: implKeywords
      };
      return rule;
    });

    RULES.all.$comment = {
      keyword: '$comment',
      code: ruleModules.$comment
    };

    if (group.type) RULES.types[group.type] = group;
  });

  RULES.keywords = toHash(ALL.concat(KEYWORDS));
  RULES.custom = {};

  return RULES;
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/compile/rules.js","/../node_modules/ajv/lib/compile")
},{"../dotjs":32,"./util":15,"buffer":48,"pBGvAp":53}],13:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var util = require('./util');

module.exports = SchemaObject;

function SchemaObject(obj) {
  util.copy(obj, this);
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/compile/schema_obj.js","/../node_modules/ajv/lib/compile")
},{"./util":15,"buffer":48,"pBGvAp":53}],14:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

// https://mathiasbynens.be/notes/javascript-encoding
// https://github.com/bestiejs/punycode.js - punycode.ucs2.decode
module.exports = function ucs2length(str) {
  var length = 0
    , len = str.length
    , pos = 0
    , value;
  while (pos < len) {
    length++;
    value = str.charCodeAt(pos++);
    if (value >= 0xD800 && value <= 0xDBFF && pos < len) {
      // high surrogate, and there is a next character
      value = str.charCodeAt(pos);
      if ((value & 0xFC00) == 0xDC00) pos++; // low surrogate
    }
  }
  return length;
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/compile/ucs2length.js","/../node_modules/ajv/lib/compile")
},{"buffer":48,"pBGvAp":53}],15:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';


module.exports = {
  copy: copy,
  checkDataType: checkDataType,
  checkDataTypes: checkDataTypes,
  coerceToTypes: coerceToTypes,
  toHash: toHash,
  getProperty: getProperty,
  escapeQuotes: escapeQuotes,
  equal: require('fast-deep-equal'),
  ucs2length: require('./ucs2length'),
  varOccurences: varOccurences,
  varReplace: varReplace,
  schemaHasRules: schemaHasRules,
  schemaHasRulesExcept: schemaHasRulesExcept,
  schemaUnknownRules: schemaUnknownRules,
  toQuotedString: toQuotedString,
  getPathExpr: getPathExpr,
  getPath: getPath,
  getData: getData,
  unescapeFragment: unescapeFragment,
  unescapeJsonPointer: unescapeJsonPointer,
  escapeFragment: escapeFragment,
  escapeJsonPointer: escapeJsonPointer
};


function copy(o, to) {
  to = to || {};
  for (var key in o) to[key] = o[key];
  return to;
}


function checkDataType(dataType, data, strictNumbers, negate) {
  var EQUAL = negate ? ' !== ' : ' === '
    , AND = negate ? ' || ' : ' && '
    , OK = negate ? '!' : ''
    , NOT = negate ? '' : '!';
  switch (dataType) {
    case 'null': return data + EQUAL + 'null';
    case 'array': return OK + 'Array.isArray(' + data + ')';
    case 'object': return '(' + OK + data + AND +
                          'typeof ' + data + EQUAL + '"object"' + AND +
                          NOT + 'Array.isArray(' + data + '))';
    case 'integer': return '(typeof ' + data + EQUAL + '"number"' + AND +
                           NOT + '(' + data + ' % 1)' +
                           AND + data + EQUAL + data +
                           (strictNumbers ? (AND + OK + 'isFinite(' + data + ')') : '') + ')';
    case 'number': return '(typeof ' + data + EQUAL + '"' + dataType + '"' +
                          (strictNumbers ? (AND + OK + 'isFinite(' + data + ')') : '') + ')';
    default: return 'typeof ' + data + EQUAL + '"' + dataType + '"';
  }
}


function checkDataTypes(dataTypes, data, strictNumbers) {
  switch (dataTypes.length) {
    case 1: return checkDataType(dataTypes[0], data, strictNumbers, true);
    default:
      var code = '';
      var types = toHash(dataTypes);
      if (types.array && types.object) {
        code = types.null ? '(': '(!' + data + ' || ';
        code += 'typeof ' + data + ' !== "object")';
        delete types.null;
        delete types.array;
        delete types.object;
      }
      if (types.number) delete types.integer;
      for (var t in types)
        code += (code ? ' && ' : '' ) + checkDataType(t, data, strictNumbers, true);

      return code;
  }
}


var COERCE_TO_TYPES = toHash([ 'string', 'number', 'integer', 'boolean', 'null' ]);
function coerceToTypes(optionCoerceTypes, dataTypes) {
  if (Array.isArray(dataTypes)) {
    var types = [];
    for (var i=0; i<dataTypes.length; i++) {
      var t = dataTypes[i];
      if (COERCE_TO_TYPES[t]) types[types.length] = t;
      else if (optionCoerceTypes === 'array' && t === 'array') types[types.length] = t;
    }
    if (types.length) return types;
  } else if (COERCE_TO_TYPES[dataTypes]) {
    return [dataTypes];
  } else if (optionCoerceTypes === 'array' && dataTypes === 'array') {
    return ['array'];
  }
}


function toHash(arr) {
  var hash = {};
  for (var i=0; i<arr.length; i++) hash[arr[i]] = true;
  return hash;
}


var IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
var SINGLE_QUOTE = /'|\\/g;
function getProperty(key) {
  return typeof key == 'number'
          ? '[' + key + ']'
          : IDENTIFIER.test(key)
            ? '.' + key
            : "['" + escapeQuotes(key) + "']";
}


function escapeQuotes(str) {
  return str.replace(SINGLE_QUOTE, '\\$&')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\f/g, '\\f')
            .replace(/\t/g, '\\t');
}


function varOccurences(str, dataVar) {
  dataVar += '[^0-9]';
  var matches = str.match(new RegExp(dataVar, 'g'));
  return matches ? matches.length : 0;
}


function varReplace(str, dataVar, expr) {
  dataVar += '([^0-9])';
  expr = expr.replace(/\$/g, '$$$$');
  return str.replace(new RegExp(dataVar, 'g'), expr + '$1');
}


function schemaHasRules(schema, rules) {
  if (typeof schema == 'boolean') return !schema;
  for (var key in schema) if (rules[key]) return true;
}


function schemaHasRulesExcept(schema, rules, exceptKeyword) {
  if (typeof schema == 'boolean') return !schema && exceptKeyword != 'not';
  for (var key in schema) if (key != exceptKeyword && rules[key]) return true;
}


function schemaUnknownRules(schema, rules) {
  if (typeof schema == 'boolean') return;
  for (var key in schema) if (!rules[key]) return key;
}


function toQuotedString(str) {
  return '\'' + escapeQuotes(str) + '\'';
}


function getPathExpr(currentPath, expr, jsonPointers, isNumber) {
  var path = jsonPointers // false by default
              ? '\'/\' + ' + expr + (isNumber ? '' : '.replace(/~/g, \'~0\').replace(/\\//g, \'~1\')')
              : (isNumber ? '\'[\' + ' + expr + ' + \']\'' : '\'[\\\'\' + ' + expr + ' + \'\\\']\'');
  return joinPaths(currentPath, path);
}


function getPath(currentPath, prop, jsonPointers) {
  var path = jsonPointers // false by default
              ? toQuotedString('/' + escapeJsonPointer(prop))
              : toQuotedString(getProperty(prop));
  return joinPaths(currentPath, path);
}


var JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
var RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
function getData($data, lvl, paths) {
  var up, jsonPointer, data, matches;
  if ($data === '') return 'rootData';
  if ($data[0] == '/') {
    if (!JSON_POINTER.test($data)) throw new Error('Invalid JSON-pointer: ' + $data);
    jsonPointer = $data;
    data = 'rootData';
  } else {
    matches = $data.match(RELATIVE_JSON_POINTER);
    if (!matches) throw new Error('Invalid JSON-pointer: ' + $data);
    up = +matches[1];
    jsonPointer = matches[2];
    if (jsonPointer == '#') {
      if (up >= lvl) throw new Error('Cannot access property/index ' + up + ' levels up, current level is ' + lvl);
      return paths[lvl - up];
    }

    if (up > lvl) throw new Error('Cannot access data ' + up + ' levels up, current level is ' + lvl);
    data = 'data' + ((lvl - up) || '');
    if (!jsonPointer) return data;
  }

  var expr = data;
  var segments = jsonPointer.split('/');
  for (var i=0; i<segments.length; i++) {
    var segment = segments[i];
    if (segment) {
      data += getProperty(unescapeJsonPointer(segment));
      expr += ' && ' + data;
    }
  }
  return expr;
}


function joinPaths (a, b) {
  if (a == '""') return b;
  return (a + ' + ' + b).replace(/([^\\])' \+ '/g, '$1');
}


function unescapeFragment(str) {
  return unescapeJsonPointer(decodeURIComponent(str));
}


function escapeFragment(str) {
  return encodeURIComponent(escapeJsonPointer(str));
}


function escapeJsonPointer(str) {
  return str.replace(/~/g, '~0').replace(/\//g, '~1');
}


function unescapeJsonPointer(str) {
  return str.replace(/~1/g, '/').replace(/~0/g, '~');
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/compile/util.js","/../node_modules/ajv/lib/compile")
},{"./ucs2length":14,"buffer":48,"fast-deep-equal":49,"pBGvAp":53}],16:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var KEYWORDS = [
  'multipleOf',
  'maximum',
  'exclusiveMaximum',
  'minimum',
  'exclusiveMinimum',
  'maxLength',
  'minLength',
  'pattern',
  'additionalItems',
  'maxItems',
  'minItems',
  'uniqueItems',
  'maxProperties',
  'minProperties',
  'required',
  'additionalProperties',
  'enum',
  'format',
  'const'
];

module.exports = function (metaSchema, keywordsJsonPointers) {
  for (var i=0; i<keywordsJsonPointers.length; i++) {
    metaSchema = JSON.parse(JSON.stringify(metaSchema));
    var segments = keywordsJsonPointers[i].split('/');
    var keywords = metaSchema;
    var j;
    for (j=1; j<segments.length; j++)
      keywords = keywords[segments[j]];

    for (j=0; j<KEYWORDS.length; j++) {
      var key = KEYWORDS[j];
      var schema = keywords[key];
      if (schema) {
        keywords[key] = {
          anyOf: [
            schema,
            { $ref: 'https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#' }
          ]
        };
      }
    }
  }

  return metaSchema;
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/data.js","/../node_modules/ajv/lib")
},{"buffer":48,"pBGvAp":53}],17:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var metaSchema = require('./refs/json-schema-draft-07.json');

module.exports = {
  $id: 'https://github.com/ajv-validator/ajv/blob/master/lib/definition_schema.js',
  definitions: {
    simpleTypes: metaSchema.definitions.simpleTypes
  },
  type: 'object',
  dependencies: {
    schema: ['validate'],
    $data: ['validate'],
    statements: ['inline'],
    valid: {not: {required: ['macro']}}
  },
  properties: {
    type: metaSchema.properties.type,
    schema: {type: 'boolean'},
    statements: {type: 'boolean'},
    dependencies: {
      type: 'array',
      items: {type: 'string'}
    },
    metaSchema: {type: 'object'},
    modifying: {type: 'boolean'},
    valid: {type: 'boolean'},
    $data: {type: 'boolean'},
    async: {type: 'boolean'},
    errors: {
      anyOf: [
        {type: 'boolean'},
        {const: 'full'}
      ]
    }
  }
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/definition_schema.js","/../node_modules/ajv/lib")
},{"./refs/json-schema-draft-07.json":46,"buffer":48,"pBGvAp":53}],18:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate__limit(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $errorKeyword;
  var $data = 'data' + ($dataLvl || '');
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  var $isMax = $keyword == 'maximum',
    $exclusiveKeyword = $isMax ? 'exclusiveMaximum' : 'exclusiveMinimum',
    $schemaExcl = it.schema[$exclusiveKeyword],
    $isDataExcl = it.opts.$data && $schemaExcl && $schemaExcl.$data,
    $op = $isMax ? '<' : '>',
    $notOp = $isMax ? '>' : '<',
    $errorKeyword = undefined;
  if (!($isData || typeof $schema == 'number' || $schema === undefined)) {
    throw new Error($keyword + ' must be number');
  }
  if (!($isDataExcl || $schemaExcl === undefined || typeof $schemaExcl == 'number' || typeof $schemaExcl == 'boolean')) {
    throw new Error($exclusiveKeyword + ' must be number or boolean');
  }
  if ($isDataExcl) {
    var $schemaValueExcl = it.util.getData($schemaExcl.$data, $dataLvl, it.dataPathArr),
      $exclusive = 'exclusive' + $lvl,
      $exclType = 'exclType' + $lvl,
      $exclIsNumber = 'exclIsNumber' + $lvl,
      $opExpr = 'op' + $lvl,
      $opStr = '\' + ' + $opExpr + ' + \'';
    out += ' var schemaExcl' + ($lvl) + ' = ' + ($schemaValueExcl) + '; ';
    $schemaValueExcl = 'schemaExcl' + $lvl;
    out += ' var ' + ($exclusive) + '; var ' + ($exclType) + ' = typeof ' + ($schemaValueExcl) + '; if (' + ($exclType) + ' != \'boolean\' && ' + ($exclType) + ' != \'undefined\' && ' + ($exclType) + ' != \'number\') { ';
    var $errorKeyword = $exclusiveKeyword;
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ($errorKeyword || '_exclusiveLimit') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
      if (it.opts.messages !== false) {
        out += ' , message: \'' + ($exclusiveKeyword) + ' should be boolean\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' } else if ( ';
    if ($isData) {
      out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
    }
    out += ' ' + ($exclType) + ' == \'number\' ? ( (' + ($exclusive) + ' = ' + ($schemaValue) + ' === undefined || ' + ($schemaValueExcl) + ' ' + ($op) + '= ' + ($schemaValue) + ') ? ' + ($data) + ' ' + ($notOp) + '= ' + ($schemaValueExcl) + ' : ' + ($data) + ' ' + ($notOp) + ' ' + ($schemaValue) + ' ) : ( (' + ($exclusive) + ' = ' + ($schemaValueExcl) + ' === true) ? ' + ($data) + ' ' + ($notOp) + '= ' + ($schemaValue) + ' : ' + ($data) + ' ' + ($notOp) + ' ' + ($schemaValue) + ' ) || ' + ($data) + ' !== ' + ($data) + ') { var op' + ($lvl) + ' = ' + ($exclusive) + ' ? \'' + ($op) + '\' : \'' + ($op) + '=\'; ';
    if ($schema === undefined) {
      $errorKeyword = $exclusiveKeyword;
      $errSchemaPath = it.errSchemaPath + '/' + $exclusiveKeyword;
      $schemaValue = $schemaValueExcl;
      $isData = $isDataExcl;
    }
  } else {
    var $exclIsNumber = typeof $schemaExcl == 'number',
      $opStr = $op;
    if ($exclIsNumber && $isData) {
      var $opExpr = '\'' + $opStr + '\'';
      out += ' if ( ';
      if ($isData) {
        out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
      }
      out += ' ( ' + ($schemaValue) + ' === undefined || ' + ($schemaExcl) + ' ' + ($op) + '= ' + ($schemaValue) + ' ? ' + ($data) + ' ' + ($notOp) + '= ' + ($schemaExcl) + ' : ' + ($data) + ' ' + ($notOp) + ' ' + ($schemaValue) + ' ) || ' + ($data) + ' !== ' + ($data) + ') { ';
    } else {
      if ($exclIsNumber && $schema === undefined) {
        $exclusive = true;
        $errorKeyword = $exclusiveKeyword;
        $errSchemaPath = it.errSchemaPath + '/' + $exclusiveKeyword;
        $schemaValue = $schemaExcl;
        $notOp += '=';
      } else {
        if ($exclIsNumber) $schemaValue = Math[$isMax ? 'min' : 'max']($schemaExcl, $schema);
        if ($schemaExcl === ($exclIsNumber ? $schemaValue : true)) {
          $exclusive = true;
          $errorKeyword = $exclusiveKeyword;
          $errSchemaPath = it.errSchemaPath + '/' + $exclusiveKeyword;
          $notOp += '=';
        } else {
          $exclusive = false;
          $opStr += '=';
        }
      }
      var $opExpr = '\'' + $opStr + '\'';
      out += ' if ( ';
      if ($isData) {
        out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
      }
      out += ' ' + ($data) + ' ' + ($notOp) + ' ' + ($schemaValue) + ' || ' + ($data) + ' !== ' + ($data) + ') { ';
    }
  }
  $errorKeyword = $errorKeyword || $keyword;
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ($errorKeyword || '_limit') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { comparison: ' + ($opExpr) + ', limit: ' + ($schemaValue) + ', exclusive: ' + ($exclusive) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be ' + ($opStr) + ' ';
      if ($isData) {
        out += '\' + ' + ($schemaValue);
      } else {
        out += '' + ($schemaValue) + '\'';
      }
    }
    if (it.opts.verbose) {
      out += ' , schema:  ';
      if ($isData) {
        out += 'validate.schema' + ($schemaPath);
      } else {
        out += '' + ($schema);
      }
      out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += ' } ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/_limit.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],19:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate__limitItems(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $errorKeyword;
  var $data = 'data' + ($dataLvl || '');
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  if (!($isData || typeof $schema == 'number')) {
    throw new Error($keyword + ' must be number');
  }
  var $op = $keyword == 'maxItems' ? '>' : '<';
  out += 'if ( ';
  if ($isData) {
    out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
  }
  out += ' ' + ($data) + '.length ' + ($op) + ' ' + ($schemaValue) + ') { ';
  var $errorKeyword = $keyword;
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ($errorKeyword || '_limitItems') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { limit: ' + ($schemaValue) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT have ';
      if ($keyword == 'maxItems') {
        out += 'more';
      } else {
        out += 'fewer';
      }
      out += ' than ';
      if ($isData) {
        out += '\' + ' + ($schemaValue) + ' + \'';
      } else {
        out += '' + ($schema);
      }
      out += ' items\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema:  ';
      if ($isData) {
        out += 'validate.schema' + ($schemaPath);
      } else {
        out += '' + ($schema);
      }
      out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/_limitItems.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],20:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate__limitLength(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $errorKeyword;
  var $data = 'data' + ($dataLvl || '');
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  if (!($isData || typeof $schema == 'number')) {
    throw new Error($keyword + ' must be number');
  }
  var $op = $keyword == 'maxLength' ? '>' : '<';
  out += 'if ( ';
  if ($isData) {
    out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
  }
  if (it.opts.unicode === false) {
    out += ' ' + ($data) + '.length ';
  } else {
    out += ' ucs2length(' + ($data) + ') ';
  }
  out += ' ' + ($op) + ' ' + ($schemaValue) + ') { ';
  var $errorKeyword = $keyword;
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ($errorKeyword || '_limitLength') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { limit: ' + ($schemaValue) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT be ';
      if ($keyword == 'maxLength') {
        out += 'longer';
      } else {
        out += 'shorter';
      }
      out += ' than ';
      if ($isData) {
        out += '\' + ' + ($schemaValue) + ' + \'';
      } else {
        out += '' + ($schema);
      }
      out += ' characters\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema:  ';
      if ($isData) {
        out += 'validate.schema' + ($schemaPath);
      } else {
        out += '' + ($schema);
      }
      out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/_limitLength.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],21:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate__limitProperties(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $errorKeyword;
  var $data = 'data' + ($dataLvl || '');
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  if (!($isData || typeof $schema == 'number')) {
    throw new Error($keyword + ' must be number');
  }
  var $op = $keyword == 'maxProperties' ? '>' : '<';
  out += 'if ( ';
  if ($isData) {
    out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
  }
  out += ' Object.keys(' + ($data) + ').length ' + ($op) + ' ' + ($schemaValue) + ') { ';
  var $errorKeyword = $keyword;
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ($errorKeyword || '_limitProperties') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { limit: ' + ($schemaValue) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT have ';
      if ($keyword == 'maxProperties') {
        out += 'more';
      } else {
        out += 'fewer';
      }
      out += ' than ';
      if ($isData) {
        out += '\' + ' + ($schemaValue) + ' + \'';
      } else {
        out += '' + ($schema);
      }
      out += ' properties\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema:  ';
      if ($isData) {
        out += 'validate.schema' + ($schemaPath);
      } else {
        out += '' + ($schema);
      }
      out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/_limitProperties.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],22:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_allOf(it, $keyword, $ruleType) {
  var out = ' ';
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $currentBaseId = $it.baseId,
    $allSchemasEmpty = true;
  var arr1 = $schema;
  if (arr1) {
    var $sch, $i = -1,
      l1 = arr1.length - 1;
    while ($i < l1) {
      $sch = arr1[$i += 1];
      if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
        $allSchemasEmpty = false;
        $it.schema = $sch;
        $it.schemaPath = $schemaPath + '[' + $i + ']';
        $it.errSchemaPath = $errSchemaPath + '/' + $i;
        out += '  ' + (it.validate($it)) + ' ';
        $it.baseId = $currentBaseId;
        if ($breakOnError) {
          out += ' if (' + ($nextValid) + ') { ';
          $closingBraces += '}';
        }
      }
    }
  }
  if ($breakOnError) {
    if ($allSchemasEmpty) {
      out += ' if (true) { ';
    } else {
      out += ' ' + ($closingBraces.slice(0, -1)) + ' ';
    }
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/allOf.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],23:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_anyOf(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $noEmptySchema = $schema.every(function($sch) {
    return (it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all));
  });
  if ($noEmptySchema) {
    var $currentBaseId = $it.baseId;
    out += ' var ' + ($errs) + ' = errors; var ' + ($valid) + ' = false;  ';
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    var arr1 = $schema;
    if (arr1) {
      var $sch, $i = -1,
        l1 = arr1.length - 1;
      while ($i < l1) {
        $sch = arr1[$i += 1];
        $it.schema = $sch;
        $it.schemaPath = $schemaPath + '[' + $i + ']';
        $it.errSchemaPath = $errSchemaPath + '/' + $i;
        out += '  ' + (it.validate($it)) + ' ';
        $it.baseId = $currentBaseId;
        out += ' ' + ($valid) + ' = ' + ($valid) + ' || ' + ($nextValid) + '; if (!' + ($valid) + ') { ';
        $closingBraces += '}';
      }
    }
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += ' ' + ($closingBraces) + ' if (!' + ($valid) + ') {   var err =   '; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('anyOf') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should match some schema in anyOf\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError(vErrors); ';
      } else {
        out += ' validate.errors = vErrors; return false; ';
      }
    }
    out += ' } else {  errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; } ';
    if (it.opts.allErrors) {
      out += ' } ';
    }
  } else {
    if ($breakOnError) {
      out += ' if (true) { ';
    }
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/anyOf.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],24:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_comment(it, $keyword, $ruleType) {
  var out = ' ';
  var $schema = it.schema[$keyword];
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $comment = it.util.toQuotedString($schema);
  if (it.opts.$comment === true) {
    out += ' console.log(' + ($comment) + ');';
  } else if (typeof it.opts.$comment == 'function') {
    out += ' self._opts.$comment(' + ($comment) + ', ' + (it.util.toQuotedString($errSchemaPath)) + ', validate.root.schema);';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/comment.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],25:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_const(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  if (!$isData) {
    out += ' var schema' + ($lvl) + ' = validate.schema' + ($schemaPath) + ';';
  }
  out += 'var ' + ($valid) + ' = equal(' + ($data) + ', schema' + ($lvl) + '); if (!' + ($valid) + ') {   ';
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ('const') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { allowedValue: schema' + ($lvl) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be equal to constant\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += ' }';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/const.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],26:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_contains(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $idx = 'i' + $lvl,
    $dataNxt = $it.dataLevel = it.dataLevel + 1,
    $nextData = 'data' + $dataNxt,
    $currentBaseId = it.baseId,
    $nonEmptySchema = (it.opts.strictKeywords ? (typeof $schema == 'object' && Object.keys($schema).length > 0) || $schema === false : it.util.schemaHasRules($schema, it.RULES.all));
  out += 'var ' + ($errs) + ' = errors;var ' + ($valid) + ';';
  if ($nonEmptySchema) {
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    $it.schema = $schema;
    $it.schemaPath = $schemaPath;
    $it.errSchemaPath = $errSchemaPath;
    out += ' var ' + ($nextValid) + ' = false; for (var ' + ($idx) + ' = 0; ' + ($idx) + ' < ' + ($data) + '.length; ' + ($idx) + '++) { ';
    $it.errorPath = it.util.getPathExpr(it.errorPath, $idx, it.opts.jsonPointers, true);
    var $passData = $data + '[' + $idx + ']';
    $it.dataPathArr[$dataNxt] = $idx;
    var $code = it.validate($it);
    $it.baseId = $currentBaseId;
    if (it.util.varOccurences($code, $nextData) < 2) {
      out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
    } else {
      out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
    }
    out += ' if (' + ($nextValid) + ') break; }  ';
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += ' ' + ($closingBraces) + ' if (!' + ($nextValid) + ') {';
  } else {
    out += ' if (' + ($data) + '.length == 0) {';
  }
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ('contains') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should contain a valid item\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += ' } else { ';
  if ($nonEmptySchema) {
    out += '  errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; } ';
  }
  if (it.opts.allErrors) {
    out += ' } ';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/contains.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],27:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_custom(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $errorKeyword;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $errs = 'errs__' + $lvl;
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  var $rule = this,
    $definition = 'definition' + $lvl,
    $rDef = $rule.definition,
    $closingBraces = '';
  var $compile, $inline, $macro, $ruleValidate, $validateCode;
  if ($isData && $rDef.$data) {
    $validateCode = 'keywordValidate' + $lvl;
    var $validateSchema = $rDef.validateSchema;
    out += ' var ' + ($definition) + ' = RULES.custom[\'' + ($keyword) + '\'].definition; var ' + ($validateCode) + ' = ' + ($definition) + '.validate;';
  } else {
    $ruleValidate = it.useCustomRule($rule, $schema, it.schema, it);
    if (!$ruleValidate) return;
    $schemaValue = 'validate.schema' + $schemaPath;
    $validateCode = $ruleValidate.code;
    $compile = $rDef.compile;
    $inline = $rDef.inline;
    $macro = $rDef.macro;
  }
  var $ruleErrs = $validateCode + '.errors',
    $i = 'i' + $lvl,
    $ruleErr = 'ruleErr' + $lvl,
    $asyncKeyword = $rDef.async;
  if ($asyncKeyword && !it.async) throw new Error('async keyword in sync schema');
  if (!($inline || $macro)) {
    out += '' + ($ruleErrs) + ' = null;';
  }
  out += 'var ' + ($errs) + ' = errors;var ' + ($valid) + ';';
  if ($isData && $rDef.$data) {
    $closingBraces += '}';
    out += ' if (' + ($schemaValue) + ' === undefined) { ' + ($valid) + ' = true; } else { ';
    if ($validateSchema) {
      $closingBraces += '}';
      out += ' ' + ($valid) + ' = ' + ($definition) + '.validateSchema(' + ($schemaValue) + '); if (' + ($valid) + ') { ';
    }
  }
  if ($inline) {
    if ($rDef.statements) {
      out += ' ' + ($ruleValidate.validate) + ' ';
    } else {
      out += ' ' + ($valid) + ' = ' + ($ruleValidate.validate) + '; ';
    }
  } else if ($macro) {
    var $it = it.util.copy(it);
    var $closingBraces = '';
    $it.level++;
    var $nextValid = 'valid' + $it.level;
    $it.schema = $ruleValidate.validate;
    $it.schemaPath = '';
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    var $code = it.validate($it).replace(/validate\.schema/g, $validateCode);
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += ' ' + ($code);
  } else {
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = '';
    out += '  ' + ($validateCode) + '.call( ';
    if (it.opts.passContext) {
      out += 'this';
    } else {
      out += 'self';
    }
    if ($compile || $rDef.schema === false) {
      out += ' , ' + ($data) + ' ';
    } else {
      out += ' , ' + ($schemaValue) + ' , ' + ($data) + ' , validate.schema' + (it.schemaPath) + ' ';
    }
    out += ' , (dataPath || \'\')';
    if (it.errorPath != '""') {
      out += ' + ' + (it.errorPath);
    }
    var $parentData = $dataLvl ? 'data' + (($dataLvl - 1) || '') : 'parentData',
      $parentDataProperty = $dataLvl ? it.dataPathArr[$dataLvl] : 'parentDataProperty';
    out += ' , ' + ($parentData) + ' , ' + ($parentDataProperty) + ' , rootData )  ';
    var def_callRuleValidate = out;
    out = $$outStack.pop();
    if ($rDef.errors === false) {
      out += ' ' + ($valid) + ' = ';
      if ($asyncKeyword) {
        out += 'await ';
      }
      out += '' + (def_callRuleValidate) + '; ';
    } else {
      if ($asyncKeyword) {
        $ruleErrs = 'customErrors' + $lvl;
        out += ' var ' + ($ruleErrs) + ' = null; try { ' + ($valid) + ' = await ' + (def_callRuleValidate) + '; } catch (e) { ' + ($valid) + ' = false; if (e instanceof ValidationError) ' + ($ruleErrs) + ' = e.errors; else throw e; } ';
      } else {
        out += ' ' + ($ruleErrs) + ' = null; ' + ($valid) + ' = ' + (def_callRuleValidate) + '; ';
      }
    }
  }
  if ($rDef.modifying) {
    out += ' if (' + ($parentData) + ') ' + ($data) + ' = ' + ($parentData) + '[' + ($parentDataProperty) + '];';
  }
  out += '' + ($closingBraces);
  if ($rDef.valid) {
    if ($breakOnError) {
      out += ' if (true) { ';
    }
  } else {
    out += ' if ( ';
    if ($rDef.valid === undefined) {
      out += ' !';
      if ($macro) {
        out += '' + ($nextValid);
      } else {
        out += '' + ($valid);
      }
    } else {
      out += ' ' + (!$rDef.valid) + ' ';
    }
    out += ') { ';
    $errorKeyword = $rule.keyword;
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = '';
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ($errorKeyword || 'custom') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { keyword: \'' + ($rule.keyword) + '\' } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should pass "' + ($rule.keyword) + '" keyword validation\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    var def_customError = out;
    out = $$outStack.pop();
    if ($inline) {
      if ($rDef.errors) {
        if ($rDef.errors != 'full') {
          out += '  for (var ' + ($i) + '=' + ($errs) + '; ' + ($i) + '<errors; ' + ($i) + '++) { var ' + ($ruleErr) + ' = vErrors[' + ($i) + ']; if (' + ($ruleErr) + '.dataPath === undefined) ' + ($ruleErr) + '.dataPath = (dataPath || \'\') + ' + (it.errorPath) + '; if (' + ($ruleErr) + '.schemaPath === undefined) { ' + ($ruleErr) + '.schemaPath = "' + ($errSchemaPath) + '"; } ';
          if (it.opts.verbose) {
            out += ' ' + ($ruleErr) + '.schema = ' + ($schemaValue) + '; ' + ($ruleErr) + '.data = ' + ($data) + '; ';
          }
          out += ' } ';
        }
      } else {
        if ($rDef.errors === false) {
          out += ' ' + (def_customError) + ' ';
        } else {
          out += ' if (' + ($errs) + ' == errors) { ' + (def_customError) + ' } else {  for (var ' + ($i) + '=' + ($errs) + '; ' + ($i) + '<errors; ' + ($i) + '++) { var ' + ($ruleErr) + ' = vErrors[' + ($i) + ']; if (' + ($ruleErr) + '.dataPath === undefined) ' + ($ruleErr) + '.dataPath = (dataPath || \'\') + ' + (it.errorPath) + '; if (' + ($ruleErr) + '.schemaPath === undefined) { ' + ($ruleErr) + '.schemaPath = "' + ($errSchemaPath) + '"; } ';
          if (it.opts.verbose) {
            out += ' ' + ($ruleErr) + '.schema = ' + ($schemaValue) + '; ' + ($ruleErr) + '.data = ' + ($data) + '; ';
          }
          out += ' } } ';
        }
      }
    } else if ($macro) {
      out += '   var err =   '; /* istanbul ignore else */
      if (it.createErrors !== false) {
        out += ' { keyword: \'' + ($errorKeyword || 'custom') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { keyword: \'' + ($rule.keyword) + '\' } ';
        if (it.opts.messages !== false) {
          out += ' , message: \'should pass "' + ($rule.keyword) + '" keyword validation\' ';
        }
        if (it.opts.verbose) {
          out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
        }
        out += ' } ';
      } else {
        out += ' {} ';
      }
      out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
      if (!it.compositeRule && $breakOnError) {
        /* istanbul ignore if */
        if (it.async) {
          out += ' throw new ValidationError(vErrors); ';
        } else {
          out += ' validate.errors = vErrors; return false; ';
        }
      }
    } else {
      if ($rDef.errors === false) {
        out += ' ' + (def_customError) + ' ';
      } else {
        out += ' if (Array.isArray(' + ($ruleErrs) + ')) { if (vErrors === null) vErrors = ' + ($ruleErrs) + '; else vErrors = vErrors.concat(' + ($ruleErrs) + '); errors = vErrors.length;  for (var ' + ($i) + '=' + ($errs) + '; ' + ($i) + '<errors; ' + ($i) + '++) { var ' + ($ruleErr) + ' = vErrors[' + ($i) + ']; if (' + ($ruleErr) + '.dataPath === undefined) ' + ($ruleErr) + '.dataPath = (dataPath || \'\') + ' + (it.errorPath) + ';  ' + ($ruleErr) + '.schemaPath = "' + ($errSchemaPath) + '";  ';
        if (it.opts.verbose) {
          out += ' ' + ($ruleErr) + '.schema = ' + ($schemaValue) + '; ' + ($ruleErr) + '.data = ' + ($data) + '; ';
        }
        out += ' } } else { ' + (def_customError) + ' } ';
      }
    }
    out += ' } ';
    if ($breakOnError) {
      out += ' else { ';
    }
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/custom.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],28:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_dependencies(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $schemaDeps = {},
    $propertyDeps = {},
    $ownProperties = it.opts.ownProperties;
  for ($property in $schema) {
    if ($property == '__proto__') continue;
    var $sch = $schema[$property];
    var $deps = Array.isArray($sch) ? $propertyDeps : $schemaDeps;
    $deps[$property] = $sch;
  }
  out += 'var ' + ($errs) + ' = errors;';
  var $currentErrorPath = it.errorPath;
  out += 'var missing' + ($lvl) + ';';
  for (var $property in $propertyDeps) {
    $deps = $propertyDeps[$property];
    if ($deps.length) {
      out += ' if ( ' + ($data) + (it.util.getProperty($property)) + ' !== undefined ';
      if ($ownProperties) {
        out += ' && Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($property)) + '\') ';
      }
      if ($breakOnError) {
        out += ' && ( ';
        var arr1 = $deps;
        if (arr1) {
          var $propertyKey, $i = -1,
            l1 = arr1.length - 1;
          while ($i < l1) {
            $propertyKey = arr1[$i += 1];
            if ($i) {
              out += ' || ';
            }
            var $prop = it.util.getProperty($propertyKey),
              $useData = $data + $prop;
            out += ' ( ( ' + ($useData) + ' === undefined ';
            if ($ownProperties) {
              out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
            }
            out += ') && (missing' + ($lvl) + ' = ' + (it.util.toQuotedString(it.opts.jsonPointers ? $propertyKey : $prop)) + ') ) ';
          }
        }
        out += ')) {  ';
        var $propertyPath = 'missing' + $lvl,
          $missingProperty = '\' + ' + $propertyPath + ' + \'';
        if (it.opts._errorDataPathProperty) {
          it.errorPath = it.opts.jsonPointers ? it.util.getPathExpr($currentErrorPath, $propertyPath, true) : $currentErrorPath + ' + ' + $propertyPath;
        }
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = ''; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ('dependencies') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { property: \'' + (it.util.escapeQuotes($property)) + '\', missingProperty: \'' + ($missingProperty) + '\', depsCount: ' + ($deps.length) + ', deps: \'' + (it.util.escapeQuotes($deps.length == 1 ? $deps[0] : $deps.join(", "))) + '\' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'should have ';
            if ($deps.length == 1) {
              out += 'property ' + (it.util.escapeQuotes($deps[0]));
            } else {
              out += 'properties ' + (it.util.escapeQuotes($deps.join(", ")));
            }
            out += ' when property ' + (it.util.escapeQuotes($property)) + ' is present\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          /* istanbul ignore if */
          if (it.async) {
            out += ' throw new ValidationError([' + (__err) + ']); ';
          } else {
            out += ' validate.errors = [' + (__err) + ']; return false; ';
          }
        } else {
          out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
      } else {
        out += ' ) { ';
        var arr2 = $deps;
        if (arr2) {
          var $propertyKey, i2 = -1,
            l2 = arr2.length - 1;
          while (i2 < l2) {
            $propertyKey = arr2[i2 += 1];
            var $prop = it.util.getProperty($propertyKey),
              $missingProperty = it.util.escapeQuotes($propertyKey),
              $useData = $data + $prop;
            if (it.opts._errorDataPathProperty) {
              it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers);
            }
            out += ' if ( ' + ($useData) + ' === undefined ';
            if ($ownProperties) {
              out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
            }
            out += ') {  var err =   '; /* istanbul ignore else */
            if (it.createErrors !== false) {
              out += ' { keyword: \'' + ('dependencies') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { property: \'' + (it.util.escapeQuotes($property)) + '\', missingProperty: \'' + ($missingProperty) + '\', depsCount: ' + ($deps.length) + ', deps: \'' + (it.util.escapeQuotes($deps.length == 1 ? $deps[0] : $deps.join(", "))) + '\' } ';
              if (it.opts.messages !== false) {
                out += ' , message: \'should have ';
                if ($deps.length == 1) {
                  out += 'property ' + (it.util.escapeQuotes($deps[0]));
                } else {
                  out += 'properties ' + (it.util.escapeQuotes($deps.join(", ")));
                }
                out += ' when property ' + (it.util.escapeQuotes($property)) + ' is present\' ';
              }
              if (it.opts.verbose) {
                out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
              }
              out += ' } ';
            } else {
              out += ' {} ';
            }
            out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } ';
          }
        }
      }
      out += ' }   ';
      if ($breakOnError) {
        $closingBraces += '}';
        out += ' else { ';
      }
    }
  }
  it.errorPath = $currentErrorPath;
  var $currentBaseId = $it.baseId;
  for (var $property in $schemaDeps) {
    var $sch = $schemaDeps[$property];
    if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
      out += ' ' + ($nextValid) + ' = true; if ( ' + ($data) + (it.util.getProperty($property)) + ' !== undefined ';
      if ($ownProperties) {
        out += ' && Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($property)) + '\') ';
      }
      out += ') { ';
      $it.schema = $sch;
      $it.schemaPath = $schemaPath + it.util.getProperty($property);
      $it.errSchemaPath = $errSchemaPath + '/' + it.util.escapeFragment($property);
      out += '  ' + (it.validate($it)) + ' ';
      $it.baseId = $currentBaseId;
      out += ' }  ';
      if ($breakOnError) {
        out += ' if (' + ($nextValid) + ') { ';
        $closingBraces += '}';
      }
    }
  }
  if ($breakOnError) {
    out += '   ' + ($closingBraces) + ' if (' + ($errs) + ' == errors) {';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/dependencies.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],29:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_enum(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  var $i = 'i' + $lvl,
    $vSchema = 'schema' + $lvl;
  if (!$isData) {
    out += ' var ' + ($vSchema) + ' = validate.schema' + ($schemaPath) + ';';
  }
  out += 'var ' + ($valid) + ';';
  if ($isData) {
    out += ' if (schema' + ($lvl) + ' === undefined) ' + ($valid) + ' = true; else if (!Array.isArray(schema' + ($lvl) + ')) ' + ($valid) + ' = false; else {';
  }
  out += '' + ($valid) + ' = false;for (var ' + ($i) + '=0; ' + ($i) + '<' + ($vSchema) + '.length; ' + ($i) + '++) if (equal(' + ($data) + ', ' + ($vSchema) + '[' + ($i) + '])) { ' + ($valid) + ' = true; break; }';
  if ($isData) {
    out += '  }  ';
  }
  out += ' if (!' + ($valid) + ') {   ';
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ('enum') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { allowedValues: schema' + ($lvl) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be equal to one of the allowed values\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += ' }';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/enum.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],30:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_format(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  if (it.opts.format === false) {
    if ($breakOnError) {
      out += ' if (true) { ';
    }
    return out;
  }
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  var $unknownFormats = it.opts.unknownFormats,
    $allowUnknown = Array.isArray($unknownFormats);
  if ($isData) {
    var $format = 'format' + $lvl,
      $isObject = 'isObject' + $lvl,
      $formatType = 'formatType' + $lvl;
    out += ' var ' + ($format) + ' = formats[' + ($schemaValue) + ']; var ' + ($isObject) + ' = typeof ' + ($format) + ' == \'object\' && !(' + ($format) + ' instanceof RegExp) && ' + ($format) + '.validate; var ' + ($formatType) + ' = ' + ($isObject) + ' && ' + ($format) + '.type || \'string\'; if (' + ($isObject) + ') { ';
    if (it.async) {
      out += ' var async' + ($lvl) + ' = ' + ($format) + '.async; ';
    }
    out += ' ' + ($format) + ' = ' + ($format) + '.validate; } if (  ';
    if ($isData) {
      out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'string\') || ';
    }
    out += ' (';
    if ($unknownFormats != 'ignore') {
      out += ' (' + ($schemaValue) + ' && !' + ($format) + ' ';
      if ($allowUnknown) {
        out += ' && self._opts.unknownFormats.indexOf(' + ($schemaValue) + ') == -1 ';
      }
      out += ') || ';
    }
    out += ' (' + ($format) + ' && ' + ($formatType) + ' == \'' + ($ruleType) + '\' && !(typeof ' + ($format) + ' == \'function\' ? ';
    if (it.async) {
      out += ' (async' + ($lvl) + ' ? await ' + ($format) + '(' + ($data) + ') : ' + ($format) + '(' + ($data) + ')) ';
    } else {
      out += ' ' + ($format) + '(' + ($data) + ') ';
    }
    out += ' : ' + ($format) + '.test(' + ($data) + '))))) {';
  } else {
    var $format = it.formats[$schema];
    if (!$format) {
      if ($unknownFormats == 'ignore') {
        it.logger.warn('unknown format "' + $schema + '" ignored in schema at path "' + it.errSchemaPath + '"');
        if ($breakOnError) {
          out += ' if (true) { ';
        }
        return out;
      } else if ($allowUnknown && $unknownFormats.indexOf($schema) >= 0) {
        if ($breakOnError) {
          out += ' if (true) { ';
        }
        return out;
      } else {
        throw new Error('unknown format "' + $schema + '" is used in schema at path "' + it.errSchemaPath + '"');
      }
    }
    var $isObject = typeof $format == 'object' && !($format instanceof RegExp) && $format.validate;
    var $formatType = $isObject && $format.type || 'string';
    if ($isObject) {
      var $async = $format.async === true;
      $format = $format.validate;
    }
    if ($formatType != $ruleType) {
      if ($breakOnError) {
        out += ' if (true) { ';
      }
      return out;
    }
    if ($async) {
      if (!it.async) throw new Error('async format in sync schema');
      var $formatRef = 'formats' + it.util.getProperty($schema) + '.validate';
      out += ' if (!(await ' + ($formatRef) + '(' + ($data) + '))) { ';
    } else {
      out += ' if (! ';
      var $formatRef = 'formats' + it.util.getProperty($schema);
      if ($isObject) $formatRef += '.validate';
      if (typeof $format == 'function') {
        out += ' ' + ($formatRef) + '(' + ($data) + ') ';
      } else {
        out += ' ' + ($formatRef) + '.test(' + ($data) + ') ';
      }
      out += ') { ';
    }
  }
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ('format') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { format:  ';
    if ($isData) {
      out += '' + ($schemaValue);
    } else {
      out += '' + (it.util.toQuotedString($schema));
    }
    out += '  } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should match format "';
      if ($isData) {
        out += '\' + ' + ($schemaValue) + ' + \'';
      } else {
        out += '' + (it.util.escapeQuotes($schema));
      }
      out += '"\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema:  ';
      if ($isData) {
        out += 'validate.schema' + ($schemaPath);
      } else {
        out += '' + (it.util.toQuotedString($schema));
      }
      out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += ' } ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/format.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],31:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_if(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $thenSch = it.schema['then'],
    $elseSch = it.schema['else'],
    $thenPresent = $thenSch !== undefined && (it.opts.strictKeywords ? (typeof $thenSch == 'object' && Object.keys($thenSch).length > 0) || $thenSch === false : it.util.schemaHasRules($thenSch, it.RULES.all)),
    $elsePresent = $elseSch !== undefined && (it.opts.strictKeywords ? (typeof $elseSch == 'object' && Object.keys($elseSch).length > 0) || $elseSch === false : it.util.schemaHasRules($elseSch, it.RULES.all)),
    $currentBaseId = $it.baseId;
  if ($thenPresent || $elsePresent) {
    var $ifClause;
    $it.createErrors = false;
    $it.schema = $schema;
    $it.schemaPath = $schemaPath;
    $it.errSchemaPath = $errSchemaPath;
    out += ' var ' + ($errs) + ' = errors; var ' + ($valid) + ' = true;  ';
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    out += '  ' + (it.validate($it)) + ' ';
    $it.baseId = $currentBaseId;
    $it.createErrors = true;
    out += '  errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; }  ';
    it.compositeRule = $it.compositeRule = $wasComposite;
    if ($thenPresent) {
      out += ' if (' + ($nextValid) + ') {  ';
      $it.schema = it.schema['then'];
      $it.schemaPath = it.schemaPath + '.then';
      $it.errSchemaPath = it.errSchemaPath + '/then';
      out += '  ' + (it.validate($it)) + ' ';
      $it.baseId = $currentBaseId;
      out += ' ' + ($valid) + ' = ' + ($nextValid) + '; ';
      if ($thenPresent && $elsePresent) {
        $ifClause = 'ifClause' + $lvl;
        out += ' var ' + ($ifClause) + ' = \'then\'; ';
      } else {
        $ifClause = '\'then\'';
      }
      out += ' } ';
      if ($elsePresent) {
        out += ' else { ';
      }
    } else {
      out += ' if (!' + ($nextValid) + ') { ';
    }
    if ($elsePresent) {
      $it.schema = it.schema['else'];
      $it.schemaPath = it.schemaPath + '.else';
      $it.errSchemaPath = it.errSchemaPath + '/else';
      out += '  ' + (it.validate($it)) + ' ';
      $it.baseId = $currentBaseId;
      out += ' ' + ($valid) + ' = ' + ($nextValid) + '; ';
      if ($thenPresent && $elsePresent) {
        $ifClause = 'ifClause' + $lvl;
        out += ' var ' + ($ifClause) + ' = \'else\'; ';
      } else {
        $ifClause = '\'else\'';
      }
      out += ' } ';
    }
    out += ' if (!' + ($valid) + ') {   var err =   '; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('if') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { failingKeyword: ' + ($ifClause) + ' } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should match "\' + ' + ($ifClause) + ' + \'" schema\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError(vErrors); ';
      } else {
        out += ' validate.errors = vErrors; return false; ';
      }
    }
    out += ' }   ';
    if ($breakOnError) {
      out += ' else { ';
    }
  } else {
    if ($breakOnError) {
      out += ' if (true) { ';
    }
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/if.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],32:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

//all requires must be explicit because browserify won't work with dynamic requires
module.exports = {
  '$ref': require('./ref'),
  allOf: require('./allOf'),
  anyOf: require('./anyOf'),
  '$comment': require('./comment'),
  const: require('./const'),
  contains: require('./contains'),
  dependencies: require('./dependencies'),
  'enum': require('./enum'),
  format: require('./format'),
  'if': require('./if'),
  items: require('./items'),
  maximum: require('./_limit'),
  minimum: require('./_limit'),
  maxItems: require('./_limitItems'),
  minItems: require('./_limitItems'),
  maxLength: require('./_limitLength'),
  minLength: require('./_limitLength'),
  maxProperties: require('./_limitProperties'),
  minProperties: require('./_limitProperties'),
  multipleOf: require('./multipleOf'),
  not: require('./not'),
  oneOf: require('./oneOf'),
  pattern: require('./pattern'),
  properties: require('./properties'),
  propertyNames: require('./propertyNames'),
  required: require('./required'),
  uniqueItems: require('./uniqueItems'),
  validate: require('./validate')
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/index.js","/../node_modules/ajv/lib/dotjs")
},{"./_limit":18,"./_limitItems":19,"./_limitLength":20,"./_limitProperties":21,"./allOf":22,"./anyOf":23,"./comment":24,"./const":25,"./contains":26,"./dependencies":28,"./enum":29,"./format":30,"./if":31,"./items":33,"./multipleOf":34,"./not":35,"./oneOf":36,"./pattern":37,"./properties":38,"./propertyNames":39,"./ref":40,"./required":41,"./uniqueItems":42,"./validate":43,"buffer":48,"pBGvAp":53}],33:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_items(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $idx = 'i' + $lvl,
    $dataNxt = $it.dataLevel = it.dataLevel + 1,
    $nextData = 'data' + $dataNxt,
    $currentBaseId = it.baseId;
  out += 'var ' + ($errs) + ' = errors;var ' + ($valid) + ';';
  if (Array.isArray($schema)) {
    var $additionalItems = it.schema.additionalItems;
    if ($additionalItems === false) {
      out += ' ' + ($valid) + ' = ' + ($data) + '.length <= ' + ($schema.length) + '; ';
      var $currErrSchemaPath = $errSchemaPath;
      $errSchemaPath = it.errSchemaPath + '/additionalItems';
      out += '  if (!' + ($valid) + ') {   ';
      var $$outStack = $$outStack || [];
      $$outStack.push(out);
      out = ''; /* istanbul ignore else */
      if (it.createErrors !== false) {
        out += ' { keyword: \'' + ('additionalItems') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { limit: ' + ($schema.length) + ' } ';
        if (it.opts.messages !== false) {
          out += ' , message: \'should NOT have more than ' + ($schema.length) + ' items\' ';
        }
        if (it.opts.verbose) {
          out += ' , schema: false , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
        }
        out += ' } ';
      } else {
        out += ' {} ';
      }
      var __err = out;
      out = $$outStack.pop();
      if (!it.compositeRule && $breakOnError) {
        /* istanbul ignore if */
        if (it.async) {
          out += ' throw new ValidationError([' + (__err) + ']); ';
        } else {
          out += ' validate.errors = [' + (__err) + ']; return false; ';
        }
      } else {
        out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
      }
      out += ' } ';
      $errSchemaPath = $currErrSchemaPath;
      if ($breakOnError) {
        $closingBraces += '}';
        out += ' else { ';
      }
    }
    var arr1 = $schema;
    if (arr1) {
      var $sch, $i = -1,
        l1 = arr1.length - 1;
      while ($i < l1) {
        $sch = arr1[$i += 1];
        if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
          out += ' ' + ($nextValid) + ' = true; if (' + ($data) + '.length > ' + ($i) + ') { ';
          var $passData = $data + '[' + $i + ']';
          $it.schema = $sch;
          $it.schemaPath = $schemaPath + '[' + $i + ']';
          $it.errSchemaPath = $errSchemaPath + '/' + $i;
          $it.errorPath = it.util.getPathExpr(it.errorPath, $i, it.opts.jsonPointers, true);
          $it.dataPathArr[$dataNxt] = $i;
          var $code = it.validate($it);
          $it.baseId = $currentBaseId;
          if (it.util.varOccurences($code, $nextData) < 2) {
            out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
          } else {
            out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
          }
          out += ' }  ';
          if ($breakOnError) {
            out += ' if (' + ($nextValid) + ') { ';
            $closingBraces += '}';
          }
        }
      }
    }
    if (typeof $additionalItems == 'object' && (it.opts.strictKeywords ? (typeof $additionalItems == 'object' && Object.keys($additionalItems).length > 0) || $additionalItems === false : it.util.schemaHasRules($additionalItems, it.RULES.all))) {
      $it.schema = $additionalItems;
      $it.schemaPath = it.schemaPath + '.additionalItems';
      $it.errSchemaPath = it.errSchemaPath + '/additionalItems';
      out += ' ' + ($nextValid) + ' = true; if (' + ($data) + '.length > ' + ($schema.length) + ') {  for (var ' + ($idx) + ' = ' + ($schema.length) + '; ' + ($idx) + ' < ' + ($data) + '.length; ' + ($idx) + '++) { ';
      $it.errorPath = it.util.getPathExpr(it.errorPath, $idx, it.opts.jsonPointers, true);
      var $passData = $data + '[' + $idx + ']';
      $it.dataPathArr[$dataNxt] = $idx;
      var $code = it.validate($it);
      $it.baseId = $currentBaseId;
      if (it.util.varOccurences($code, $nextData) < 2) {
        out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
      } else {
        out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
      }
      if ($breakOnError) {
        out += ' if (!' + ($nextValid) + ') break; ';
      }
      out += ' } }  ';
      if ($breakOnError) {
        out += ' if (' + ($nextValid) + ') { ';
        $closingBraces += '}';
      }
    }
  } else if ((it.opts.strictKeywords ? (typeof $schema == 'object' && Object.keys($schema).length > 0) || $schema === false : it.util.schemaHasRules($schema, it.RULES.all))) {
    $it.schema = $schema;
    $it.schemaPath = $schemaPath;
    $it.errSchemaPath = $errSchemaPath;
    out += '  for (var ' + ($idx) + ' = ' + (0) + '; ' + ($idx) + ' < ' + ($data) + '.length; ' + ($idx) + '++) { ';
    $it.errorPath = it.util.getPathExpr(it.errorPath, $idx, it.opts.jsonPointers, true);
    var $passData = $data + '[' + $idx + ']';
    $it.dataPathArr[$dataNxt] = $idx;
    var $code = it.validate($it);
    $it.baseId = $currentBaseId;
    if (it.util.varOccurences($code, $nextData) < 2) {
      out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
    } else {
      out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
    }
    if ($breakOnError) {
      out += ' if (!' + ($nextValid) + ') break; ';
    }
    out += ' }';
  }
  if ($breakOnError) {
    out += ' ' + ($closingBraces) + ' if (' + ($errs) + ' == errors) {';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/items.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],34:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_multipleOf(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  if (!($isData || typeof $schema == 'number')) {
    throw new Error($keyword + ' must be number');
  }
  out += 'var division' + ($lvl) + ';if (';
  if ($isData) {
    out += ' ' + ($schemaValue) + ' !== undefined && ( typeof ' + ($schemaValue) + ' != \'number\' || ';
  }
  out += ' (division' + ($lvl) + ' = ' + ($data) + ' / ' + ($schemaValue) + ', ';
  if (it.opts.multipleOfPrecision) {
    out += ' Math.abs(Math.round(division' + ($lvl) + ') - division' + ($lvl) + ') > 1e-' + (it.opts.multipleOfPrecision) + ' ';
  } else {
    out += ' division' + ($lvl) + ' !== parseInt(division' + ($lvl) + ') ';
  }
  out += ' ) ';
  if ($isData) {
    out += '  )  ';
  }
  out += ' ) {   ';
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ('multipleOf') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { multipleOf: ' + ($schemaValue) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be multiple of ';
      if ($isData) {
        out += '\' + ' + ($schemaValue);
      } else {
        out += '' + ($schemaValue) + '\'';
      }
    }
    if (it.opts.verbose) {
      out += ' , schema:  ';
      if ($isData) {
        out += 'validate.schema' + ($schemaPath);
      } else {
        out += '' + ($schema);
      }
      out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/multipleOf.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],35:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_not(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  if ((it.opts.strictKeywords ? (typeof $schema == 'object' && Object.keys($schema).length > 0) || $schema === false : it.util.schemaHasRules($schema, it.RULES.all))) {
    $it.schema = $schema;
    $it.schemaPath = $schemaPath;
    $it.errSchemaPath = $errSchemaPath;
    out += ' var ' + ($errs) + ' = errors;  ';
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    $it.createErrors = false;
    var $allErrorsOption;
    if ($it.opts.allErrors) {
      $allErrorsOption = $it.opts.allErrors;
      $it.opts.allErrors = false;
    }
    out += ' ' + (it.validate($it)) + ' ';
    $it.createErrors = true;
    if ($allErrorsOption) $it.opts.allErrors = $allErrorsOption;
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += ' if (' + ($nextValid) + ') {   ';
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('not') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should NOT be valid\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' } else {  errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; } ';
    if (it.opts.allErrors) {
      out += ' } ';
    }
  } else {
    out += '  var err =   '; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('not') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should NOT be valid\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    if ($breakOnError) {
      out += ' if (false) { ';
    }
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/not.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],36:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_oneOf(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $currentBaseId = $it.baseId,
    $prevValid = 'prevValid' + $lvl,
    $passingSchemas = 'passingSchemas' + $lvl;
  out += 'var ' + ($errs) + ' = errors , ' + ($prevValid) + ' = false , ' + ($valid) + ' = false , ' + ($passingSchemas) + ' = null; ';
  var $wasComposite = it.compositeRule;
  it.compositeRule = $it.compositeRule = true;
  var arr1 = $schema;
  if (arr1) {
    var $sch, $i = -1,
      l1 = arr1.length - 1;
    while ($i < l1) {
      $sch = arr1[$i += 1];
      if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
        $it.schema = $sch;
        $it.schemaPath = $schemaPath + '[' + $i + ']';
        $it.errSchemaPath = $errSchemaPath + '/' + $i;
        out += '  ' + (it.validate($it)) + ' ';
        $it.baseId = $currentBaseId;
      } else {
        out += ' var ' + ($nextValid) + ' = true; ';
      }
      if ($i) {
        out += ' if (' + ($nextValid) + ' && ' + ($prevValid) + ') { ' + ($valid) + ' = false; ' + ($passingSchemas) + ' = [' + ($passingSchemas) + ', ' + ($i) + ']; } else { ';
        $closingBraces += '}';
      }
      out += ' if (' + ($nextValid) + ') { ' + ($valid) + ' = ' + ($prevValid) + ' = true; ' + ($passingSchemas) + ' = ' + ($i) + '; }';
    }
  }
  it.compositeRule = $it.compositeRule = $wasComposite;
  out += '' + ($closingBraces) + 'if (!' + ($valid) + ') {   var err =   '; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ('oneOf') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { passingSchemas: ' + ($passingSchemas) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should match exactly one schema in oneOf\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError(vErrors); ';
    } else {
      out += ' validate.errors = vErrors; return false; ';
    }
  }
  out += '} else {  errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; }';
  if (it.opts.allErrors) {
    out += ' } ';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/oneOf.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],37:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_pattern(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  var $regexp = $isData ? '(new RegExp(' + $schemaValue + '))' : it.usePattern($schema);
  out += 'if ( ';
  if ($isData) {
    out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'string\') || ';
  }
  out += ' !' + ($regexp) + '.test(' + ($data) + ') ) {   ';
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ('pattern') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { pattern:  ';
    if ($isData) {
      out += '' + ($schemaValue);
    } else {
      out += '' + (it.util.toQuotedString($schema));
    }
    out += '  } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should match pattern "';
      if ($isData) {
        out += '\' + ' + ($schemaValue) + ' + \'';
      } else {
        out += '' + (it.util.escapeQuotes($schema));
      }
      out += '"\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema:  ';
      if ($isData) {
        out += 'validate.schema' + ($schemaPath);
      } else {
        out += '' + (it.util.toQuotedString($schema));
      }
      out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/pattern.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],38:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_properties(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $key = 'key' + $lvl,
    $idx = 'idx' + $lvl,
    $dataNxt = $it.dataLevel = it.dataLevel + 1,
    $nextData = 'data' + $dataNxt,
    $dataProperties = 'dataProperties' + $lvl;
  var $schemaKeys = Object.keys($schema || {}).filter(notProto),
    $pProperties = it.schema.patternProperties || {},
    $pPropertyKeys = Object.keys($pProperties).filter(notProto),
    $aProperties = it.schema.additionalProperties,
    $someProperties = $schemaKeys.length || $pPropertyKeys.length,
    $noAdditional = $aProperties === false,
    $additionalIsSchema = typeof $aProperties == 'object' && Object.keys($aProperties).length,
    $removeAdditional = it.opts.removeAdditional,
    $checkAdditional = $noAdditional || $additionalIsSchema || $removeAdditional,
    $ownProperties = it.opts.ownProperties,
    $currentBaseId = it.baseId;
  var $required = it.schema.required;
  if ($required && !(it.opts.$data && $required.$data) && $required.length < it.opts.loopRequired) {
    var $requiredHash = it.util.toHash($required);
  }

  function notProto(p) {
    return p !== '__proto__';
  }
  out += 'var ' + ($errs) + ' = errors;var ' + ($nextValid) + ' = true;';
  if ($ownProperties) {
    out += ' var ' + ($dataProperties) + ' = undefined;';
  }
  if ($checkAdditional) {
    if ($ownProperties) {
      out += ' ' + ($dataProperties) + ' = ' + ($dataProperties) + ' || Object.keys(' + ($data) + '); for (var ' + ($idx) + '=0; ' + ($idx) + '<' + ($dataProperties) + '.length; ' + ($idx) + '++) { var ' + ($key) + ' = ' + ($dataProperties) + '[' + ($idx) + ']; ';
    } else {
      out += ' for (var ' + ($key) + ' in ' + ($data) + ') { ';
    }
    if ($someProperties) {
      out += ' var isAdditional' + ($lvl) + ' = !(false ';
      if ($schemaKeys.length) {
        if ($schemaKeys.length > 8) {
          out += ' || validate.schema' + ($schemaPath) + '.hasOwnProperty(' + ($key) + ') ';
        } else {
          var arr1 = $schemaKeys;
          if (arr1) {
            var $propertyKey, i1 = -1,
              l1 = arr1.length - 1;
            while (i1 < l1) {
              $propertyKey = arr1[i1 += 1];
              out += ' || ' + ($key) + ' == ' + (it.util.toQuotedString($propertyKey)) + ' ';
            }
          }
        }
      }
      if ($pPropertyKeys.length) {
        var arr2 = $pPropertyKeys;
        if (arr2) {
          var $pProperty, $i = -1,
            l2 = arr2.length - 1;
          while ($i < l2) {
            $pProperty = arr2[$i += 1];
            out += ' || ' + (it.usePattern($pProperty)) + '.test(' + ($key) + ') ';
          }
        }
      }
      out += ' ); if (isAdditional' + ($lvl) + ') { ';
    }
    if ($removeAdditional == 'all') {
      out += ' delete ' + ($data) + '[' + ($key) + ']; ';
    } else {
      var $currentErrorPath = it.errorPath;
      var $additionalProperty = '\' + ' + $key + ' + \'';
      if (it.opts._errorDataPathProperty) {
        it.errorPath = it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
      }
      if ($noAdditional) {
        if ($removeAdditional) {
          out += ' delete ' + ($data) + '[' + ($key) + ']; ';
        } else {
          out += ' ' + ($nextValid) + ' = false; ';
          var $currErrSchemaPath = $errSchemaPath;
          $errSchemaPath = it.errSchemaPath + '/additionalProperties';
          var $$outStack = $$outStack || [];
          $$outStack.push(out);
          out = ''; /* istanbul ignore else */
          if (it.createErrors !== false) {
            out += ' { keyword: \'' + ('additionalProperties') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { additionalProperty: \'' + ($additionalProperty) + '\' } ';
            if (it.opts.messages !== false) {
              out += ' , message: \'';
              if (it.opts._errorDataPathProperty) {
                out += 'is an invalid additional property';
              } else {
                out += 'should NOT have additional properties';
              }
              out += '\' ';
            }
            if (it.opts.verbose) {
              out += ' , schema: false , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
            }
            out += ' } ';
          } else {
            out += ' {} ';
          }
          var __err = out;
          out = $$outStack.pop();
          if (!it.compositeRule && $breakOnError) {
            /* istanbul ignore if */
            if (it.async) {
              out += ' throw new ValidationError([' + (__err) + ']); ';
            } else {
              out += ' validate.errors = [' + (__err) + ']; return false; ';
            }
          } else {
            out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
          }
          $errSchemaPath = $currErrSchemaPath;
          if ($breakOnError) {
            out += ' break; ';
          }
        }
      } else if ($additionalIsSchema) {
        if ($removeAdditional == 'failing') {
          out += ' var ' + ($errs) + ' = errors;  ';
          var $wasComposite = it.compositeRule;
          it.compositeRule = $it.compositeRule = true;
          $it.schema = $aProperties;
          $it.schemaPath = it.schemaPath + '.additionalProperties';
          $it.errSchemaPath = it.errSchemaPath + '/additionalProperties';
          $it.errorPath = it.opts._errorDataPathProperty ? it.errorPath : it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
          var $passData = $data + '[' + $key + ']';
          $it.dataPathArr[$dataNxt] = $key;
          var $code = it.validate($it);
          $it.baseId = $currentBaseId;
          if (it.util.varOccurences($code, $nextData) < 2) {
            out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
          } else {
            out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
          }
          out += ' if (!' + ($nextValid) + ') { errors = ' + ($errs) + '; if (validate.errors !== null) { if (errors) validate.errors.length = errors; else validate.errors = null; } delete ' + ($data) + '[' + ($key) + ']; }  ';
          it.compositeRule = $it.compositeRule = $wasComposite;
        } else {
          $it.schema = $aProperties;
          $it.schemaPath = it.schemaPath + '.additionalProperties';
          $it.errSchemaPath = it.errSchemaPath + '/additionalProperties';
          $it.errorPath = it.opts._errorDataPathProperty ? it.errorPath : it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
          var $passData = $data + '[' + $key + ']';
          $it.dataPathArr[$dataNxt] = $key;
          var $code = it.validate($it);
          $it.baseId = $currentBaseId;
          if (it.util.varOccurences($code, $nextData) < 2) {
            out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
          } else {
            out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
          }
          if ($breakOnError) {
            out += ' if (!' + ($nextValid) + ') break; ';
          }
        }
      }
      it.errorPath = $currentErrorPath;
    }
    if ($someProperties) {
      out += ' } ';
    }
    out += ' }  ';
    if ($breakOnError) {
      out += ' if (' + ($nextValid) + ') { ';
      $closingBraces += '}';
    }
  }
  var $useDefaults = it.opts.useDefaults && !it.compositeRule;
  if ($schemaKeys.length) {
    var arr3 = $schemaKeys;
    if (arr3) {
      var $propertyKey, i3 = -1,
        l3 = arr3.length - 1;
      while (i3 < l3) {
        $propertyKey = arr3[i3 += 1];
        var $sch = $schema[$propertyKey];
        if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
          var $prop = it.util.getProperty($propertyKey),
            $passData = $data + $prop,
            $hasDefault = $useDefaults && $sch.default !== undefined;
          $it.schema = $sch;
          $it.schemaPath = $schemaPath + $prop;
          $it.errSchemaPath = $errSchemaPath + '/' + it.util.escapeFragment($propertyKey);
          $it.errorPath = it.util.getPath(it.errorPath, $propertyKey, it.opts.jsonPointers);
          $it.dataPathArr[$dataNxt] = it.util.toQuotedString($propertyKey);
          var $code = it.validate($it);
          $it.baseId = $currentBaseId;
          if (it.util.varOccurences($code, $nextData) < 2) {
            $code = it.util.varReplace($code, $nextData, $passData);
            var $useData = $passData;
          } else {
            var $useData = $nextData;
            out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ';
          }
          if ($hasDefault) {
            out += ' ' + ($code) + ' ';
          } else {
            if ($requiredHash && $requiredHash[$propertyKey]) {
              out += ' if ( ' + ($useData) + ' === undefined ';
              if ($ownProperties) {
                out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
              }
              out += ') { ' + ($nextValid) + ' = false; ';
              var $currentErrorPath = it.errorPath,
                $currErrSchemaPath = $errSchemaPath,
                $missingProperty = it.util.escapeQuotes($propertyKey);
              if (it.opts._errorDataPathProperty) {
                it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers);
              }
              $errSchemaPath = it.errSchemaPath + '/required';
              var $$outStack = $$outStack || [];
              $$outStack.push(out);
              out = ''; /* istanbul ignore else */
              if (it.createErrors !== false) {
                out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
                if (it.opts.messages !== false) {
                  out += ' , message: \'';
                  if (it.opts._errorDataPathProperty) {
                    out += 'is a required property';
                  } else {
                    out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
                  }
                  out += '\' ';
                }
                if (it.opts.verbose) {
                  out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
                }
                out += ' } ';
              } else {
                out += ' {} ';
              }
              var __err = out;
              out = $$outStack.pop();
              if (!it.compositeRule && $breakOnError) {
                /* istanbul ignore if */
                if (it.async) {
                  out += ' throw new ValidationError([' + (__err) + ']); ';
                } else {
                  out += ' validate.errors = [' + (__err) + ']; return false; ';
                }
              } else {
                out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
              }
              $errSchemaPath = $currErrSchemaPath;
              it.errorPath = $currentErrorPath;
              out += ' } else { ';
            } else {
              if ($breakOnError) {
                out += ' if ( ' + ($useData) + ' === undefined ';
                if ($ownProperties) {
                  out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
                }
                out += ') { ' + ($nextValid) + ' = true; } else { ';
              } else {
                out += ' if (' + ($useData) + ' !== undefined ';
                if ($ownProperties) {
                  out += ' &&   Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
                }
                out += ' ) { ';
              }
            }
            out += ' ' + ($code) + ' } ';
          }
        }
        if ($breakOnError) {
          out += ' if (' + ($nextValid) + ') { ';
          $closingBraces += '}';
        }
      }
    }
  }
  if ($pPropertyKeys.length) {
    var arr4 = $pPropertyKeys;
    if (arr4) {
      var $pProperty, i4 = -1,
        l4 = arr4.length - 1;
      while (i4 < l4) {
        $pProperty = arr4[i4 += 1];
        var $sch = $pProperties[$pProperty];
        if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
          $it.schema = $sch;
          $it.schemaPath = it.schemaPath + '.patternProperties' + it.util.getProperty($pProperty);
          $it.errSchemaPath = it.errSchemaPath + '/patternProperties/' + it.util.escapeFragment($pProperty);
          if ($ownProperties) {
            out += ' ' + ($dataProperties) + ' = ' + ($dataProperties) + ' || Object.keys(' + ($data) + '); for (var ' + ($idx) + '=0; ' + ($idx) + '<' + ($dataProperties) + '.length; ' + ($idx) + '++) { var ' + ($key) + ' = ' + ($dataProperties) + '[' + ($idx) + ']; ';
          } else {
            out += ' for (var ' + ($key) + ' in ' + ($data) + ') { ';
          }
          out += ' if (' + (it.usePattern($pProperty)) + '.test(' + ($key) + ')) { ';
          $it.errorPath = it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
          var $passData = $data + '[' + $key + ']';
          $it.dataPathArr[$dataNxt] = $key;
          var $code = it.validate($it);
          $it.baseId = $currentBaseId;
          if (it.util.varOccurences($code, $nextData) < 2) {
            out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
          } else {
            out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
          }
          if ($breakOnError) {
            out += ' if (!' + ($nextValid) + ') break; ';
          }
          out += ' } ';
          if ($breakOnError) {
            out += ' else ' + ($nextValid) + ' = true; ';
          }
          out += ' }  ';
          if ($breakOnError) {
            out += ' if (' + ($nextValid) + ') { ';
            $closingBraces += '}';
          }
        }
      }
    }
  }
  if ($breakOnError) {
    out += ' ' + ($closingBraces) + ' if (' + ($errs) + ' == errors) {';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/properties.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],39:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_propertyNames(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  out += 'var ' + ($errs) + ' = errors;';
  if ((it.opts.strictKeywords ? (typeof $schema == 'object' && Object.keys($schema).length > 0) || $schema === false : it.util.schemaHasRules($schema, it.RULES.all))) {
    $it.schema = $schema;
    $it.schemaPath = $schemaPath;
    $it.errSchemaPath = $errSchemaPath;
    var $key = 'key' + $lvl,
      $idx = 'idx' + $lvl,
      $i = 'i' + $lvl,
      $invalidName = '\' + ' + $key + ' + \'',
      $dataNxt = $it.dataLevel = it.dataLevel + 1,
      $nextData = 'data' + $dataNxt,
      $dataProperties = 'dataProperties' + $lvl,
      $ownProperties = it.opts.ownProperties,
      $currentBaseId = it.baseId;
    if ($ownProperties) {
      out += ' var ' + ($dataProperties) + ' = undefined; ';
    }
    if ($ownProperties) {
      out += ' ' + ($dataProperties) + ' = ' + ($dataProperties) + ' || Object.keys(' + ($data) + '); for (var ' + ($idx) + '=0; ' + ($idx) + '<' + ($dataProperties) + '.length; ' + ($idx) + '++) { var ' + ($key) + ' = ' + ($dataProperties) + '[' + ($idx) + ']; ';
    } else {
      out += ' for (var ' + ($key) + ' in ' + ($data) + ') { ';
    }
    out += ' var startErrs' + ($lvl) + ' = errors; ';
    var $passData = $key;
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    var $code = it.validate($it);
    $it.baseId = $currentBaseId;
    if (it.util.varOccurences($code, $nextData) < 2) {
      out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
    } else {
      out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
    }
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += ' if (!' + ($nextValid) + ') { for (var ' + ($i) + '=startErrs' + ($lvl) + '; ' + ($i) + '<errors; ' + ($i) + '++) { vErrors[' + ($i) + '].propertyName = ' + ($key) + '; }   var err =   '; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('propertyNames') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { propertyName: \'' + ($invalidName) + '\' } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'property name \\\'' + ($invalidName) + '\\\' is invalid\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError(vErrors); ';
      } else {
        out += ' validate.errors = vErrors; return false; ';
      }
    }
    if ($breakOnError) {
      out += ' break; ';
    }
    out += ' } }';
  }
  if ($breakOnError) {
    out += ' ' + ($closingBraces) + ' if (' + ($errs) + ' == errors) {';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/propertyNames.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],40:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_ref(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $async, $refCode;
  if ($schema == '#' || $schema == '#/') {
    if (it.isRoot) {
      $async = it.async;
      $refCode = 'validate';
    } else {
      $async = it.root.schema.$async === true;
      $refCode = 'root.refVal[0]';
    }
  } else {
    var $refVal = it.resolveRef(it.baseId, $schema, it.isRoot);
    if ($refVal === undefined) {
      var $message = it.MissingRefError.message(it.baseId, $schema);
      if (it.opts.missingRefs == 'fail') {
        it.logger.error($message);
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = ''; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ('$ref') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { ref: \'' + (it.util.escapeQuotes($schema)) + '\' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'can\\\'t resolve reference ' + (it.util.escapeQuotes($schema)) + '\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: ' + (it.util.toQuotedString($schema)) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          /* istanbul ignore if */
          if (it.async) {
            out += ' throw new ValidationError([' + (__err) + ']); ';
          } else {
            out += ' validate.errors = [' + (__err) + ']; return false; ';
          }
        } else {
          out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
        if ($breakOnError) {
          out += ' if (false) { ';
        }
      } else if (it.opts.missingRefs == 'ignore') {
        it.logger.warn($message);
        if ($breakOnError) {
          out += ' if (true) { ';
        }
      } else {
        throw new it.MissingRefError(it.baseId, $schema, $message);
      }
    } else if ($refVal.inline) {
      var $it = it.util.copy(it);
      $it.level++;
      var $nextValid = 'valid' + $it.level;
      $it.schema = $refVal.schema;
      $it.schemaPath = '';
      $it.errSchemaPath = $schema;
      var $code = it.validate($it).replace(/validate\.schema/g, $refVal.code);
      out += ' ' + ($code) + ' ';
      if ($breakOnError) {
        out += ' if (' + ($nextValid) + ') { ';
      }
    } else {
      $async = $refVal.$async === true || (it.async && $refVal.$async !== false);
      $refCode = $refVal.code;
    }
  }
  if ($refCode) {
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = '';
    if (it.opts.passContext) {
      out += ' ' + ($refCode) + '.call(this, ';
    } else {
      out += ' ' + ($refCode) + '( ';
    }
    out += ' ' + ($data) + ', (dataPath || \'\')';
    if (it.errorPath != '""') {
      out += ' + ' + (it.errorPath);
    }
    var $parentData = $dataLvl ? 'data' + (($dataLvl - 1) || '') : 'parentData',
      $parentDataProperty = $dataLvl ? it.dataPathArr[$dataLvl] : 'parentDataProperty';
    out += ' , ' + ($parentData) + ' , ' + ($parentDataProperty) + ', rootData)  ';
    var __callValidate = out;
    out = $$outStack.pop();
    if ($async) {
      if (!it.async) throw new Error('async schema referenced by sync schema');
      if ($breakOnError) {
        out += ' var ' + ($valid) + '; ';
      }
      out += ' try { await ' + (__callValidate) + '; ';
      if ($breakOnError) {
        out += ' ' + ($valid) + ' = true; ';
      }
      out += ' } catch (e) { if (!(e instanceof ValidationError)) throw e; if (vErrors === null) vErrors = e.errors; else vErrors = vErrors.concat(e.errors); errors = vErrors.length; ';
      if ($breakOnError) {
        out += ' ' + ($valid) + ' = false; ';
      }
      out += ' } ';
      if ($breakOnError) {
        out += ' if (' + ($valid) + ') { ';
      }
    } else {
      out += ' if (!' + (__callValidate) + ') { if (vErrors === null) vErrors = ' + ($refCode) + '.errors; else vErrors = vErrors.concat(' + ($refCode) + '.errors); errors = vErrors.length; } ';
      if ($breakOnError) {
        out += ' else { ';
      }
    }
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/ref.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],41:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_required(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  var $vSchema = 'schema' + $lvl;
  if (!$isData) {
    if ($schema.length < it.opts.loopRequired && it.schema.properties && Object.keys(it.schema.properties).length) {
      var $required = [];
      var arr1 = $schema;
      if (arr1) {
        var $property, i1 = -1,
          l1 = arr1.length - 1;
        while (i1 < l1) {
          $property = arr1[i1 += 1];
          var $propertySch = it.schema.properties[$property];
          if (!($propertySch && (it.opts.strictKeywords ? (typeof $propertySch == 'object' && Object.keys($propertySch).length > 0) || $propertySch === false : it.util.schemaHasRules($propertySch, it.RULES.all)))) {
            $required[$required.length] = $property;
          }
        }
      }
    } else {
      var $required = $schema;
    }
  }
  if ($isData || $required.length) {
    var $currentErrorPath = it.errorPath,
      $loopRequired = $isData || $required.length >= it.opts.loopRequired,
      $ownProperties = it.opts.ownProperties;
    if ($breakOnError) {
      out += ' var missing' + ($lvl) + '; ';
      if ($loopRequired) {
        if (!$isData) {
          out += ' var ' + ($vSchema) + ' = validate.schema' + ($schemaPath) + '; ';
        }
        var $i = 'i' + $lvl,
          $propertyPath = 'schema' + $lvl + '[' + $i + ']',
          $missingProperty = '\' + ' + $propertyPath + ' + \'';
        if (it.opts._errorDataPathProperty) {
          it.errorPath = it.util.getPathExpr($currentErrorPath, $propertyPath, it.opts.jsonPointers);
        }
        out += ' var ' + ($valid) + ' = true; ';
        if ($isData) {
          out += ' if (schema' + ($lvl) + ' === undefined) ' + ($valid) + ' = true; else if (!Array.isArray(schema' + ($lvl) + ')) ' + ($valid) + ' = false; else {';
        }
        out += ' for (var ' + ($i) + ' = 0; ' + ($i) + ' < ' + ($vSchema) + '.length; ' + ($i) + '++) { ' + ($valid) + ' = ' + ($data) + '[' + ($vSchema) + '[' + ($i) + ']] !== undefined ';
        if ($ownProperties) {
          out += ' &&   Object.prototype.hasOwnProperty.call(' + ($data) + ', ' + ($vSchema) + '[' + ($i) + ']) ';
        }
        out += '; if (!' + ($valid) + ') break; } ';
        if ($isData) {
          out += '  }  ';
        }
        out += '  if (!' + ($valid) + ') {   ';
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = ''; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'';
            if (it.opts._errorDataPathProperty) {
              out += 'is a required property';
            } else {
              out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
            }
            out += '\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          /* istanbul ignore if */
          if (it.async) {
            out += ' throw new ValidationError([' + (__err) + ']); ';
          } else {
            out += ' validate.errors = [' + (__err) + ']; return false; ';
          }
        } else {
          out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
        out += ' } else { ';
      } else {
        out += ' if ( ';
        var arr2 = $required;
        if (arr2) {
          var $propertyKey, $i = -1,
            l2 = arr2.length - 1;
          while ($i < l2) {
            $propertyKey = arr2[$i += 1];
            if ($i) {
              out += ' || ';
            }
            var $prop = it.util.getProperty($propertyKey),
              $useData = $data + $prop;
            out += ' ( ( ' + ($useData) + ' === undefined ';
            if ($ownProperties) {
              out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
            }
            out += ') && (missing' + ($lvl) + ' = ' + (it.util.toQuotedString(it.opts.jsonPointers ? $propertyKey : $prop)) + ') ) ';
          }
        }
        out += ') {  ';
        var $propertyPath = 'missing' + $lvl,
          $missingProperty = '\' + ' + $propertyPath + ' + \'';
        if (it.opts._errorDataPathProperty) {
          it.errorPath = it.opts.jsonPointers ? it.util.getPathExpr($currentErrorPath, $propertyPath, true) : $currentErrorPath + ' + ' + $propertyPath;
        }
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = ''; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'';
            if (it.opts._errorDataPathProperty) {
              out += 'is a required property';
            } else {
              out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
            }
            out += '\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          /* istanbul ignore if */
          if (it.async) {
            out += ' throw new ValidationError([' + (__err) + ']); ';
          } else {
            out += ' validate.errors = [' + (__err) + ']; return false; ';
          }
        } else {
          out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
        out += ' } else { ';
      }
    } else {
      if ($loopRequired) {
        if (!$isData) {
          out += ' var ' + ($vSchema) + ' = validate.schema' + ($schemaPath) + '; ';
        }
        var $i = 'i' + $lvl,
          $propertyPath = 'schema' + $lvl + '[' + $i + ']',
          $missingProperty = '\' + ' + $propertyPath + ' + \'';
        if (it.opts._errorDataPathProperty) {
          it.errorPath = it.util.getPathExpr($currentErrorPath, $propertyPath, it.opts.jsonPointers);
        }
        if ($isData) {
          out += ' if (' + ($vSchema) + ' && !Array.isArray(' + ($vSchema) + ')) {  var err =   '; /* istanbul ignore else */
          if (it.createErrors !== false) {
            out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
            if (it.opts.messages !== false) {
              out += ' , message: \'';
              if (it.opts._errorDataPathProperty) {
                out += 'is a required property';
              } else {
                out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
              }
              out += '\' ';
            }
            if (it.opts.verbose) {
              out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
            }
            out += ' } ';
          } else {
            out += ' {} ';
          }
          out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } else if (' + ($vSchema) + ' !== undefined) { ';
        }
        out += ' for (var ' + ($i) + ' = 0; ' + ($i) + ' < ' + ($vSchema) + '.length; ' + ($i) + '++) { if (' + ($data) + '[' + ($vSchema) + '[' + ($i) + ']] === undefined ';
        if ($ownProperties) {
          out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', ' + ($vSchema) + '[' + ($i) + ']) ';
        }
        out += ') {  var err =   '; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'';
            if (it.opts._errorDataPathProperty) {
              out += 'is a required property';
            } else {
              out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
            }
            out += '\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } } ';
        if ($isData) {
          out += '  }  ';
        }
      } else {
        var arr3 = $required;
        if (arr3) {
          var $propertyKey, i3 = -1,
            l3 = arr3.length - 1;
          while (i3 < l3) {
            $propertyKey = arr3[i3 += 1];
            var $prop = it.util.getProperty($propertyKey),
              $missingProperty = it.util.escapeQuotes($propertyKey),
              $useData = $data + $prop;
            if (it.opts._errorDataPathProperty) {
              it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers);
            }
            out += ' if ( ' + ($useData) + ' === undefined ';
            if ($ownProperties) {
              out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
            }
            out += ') {  var err =   '; /* istanbul ignore else */
            if (it.createErrors !== false) {
              out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
              if (it.opts.messages !== false) {
                out += ' , message: \'';
                if (it.opts._errorDataPathProperty) {
                  out += 'is a required property';
                } else {
                  out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
                }
                out += '\' ';
              }
              if (it.opts.verbose) {
                out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
              }
              out += ' } ';
            } else {
              out += ' {} ';
            }
            out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } ';
          }
        }
      }
    }
    it.errorPath = $currentErrorPath;
  } else if ($breakOnError) {
    out += ' if (true) {';
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/required.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],42:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_uniqueItems(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  if (($schema || $isData) && it.opts.uniqueItems !== false) {
    if ($isData) {
      out += ' var ' + ($valid) + '; if (' + ($schemaValue) + ' === false || ' + ($schemaValue) + ' === undefined) ' + ($valid) + ' = true; else if (typeof ' + ($schemaValue) + ' != \'boolean\') ' + ($valid) + ' = false; else { ';
    }
    out += ' var i = ' + ($data) + '.length , ' + ($valid) + ' = true , j; if (i > 1) { ';
    var $itemType = it.schema.items && it.schema.items.type,
      $typeIsArray = Array.isArray($itemType);
    if (!$itemType || $itemType == 'object' || $itemType == 'array' || ($typeIsArray && ($itemType.indexOf('object') >= 0 || $itemType.indexOf('array') >= 0))) {
      out += ' outer: for (;i--;) { for (j = i; j--;) { if (equal(' + ($data) + '[i], ' + ($data) + '[j])) { ' + ($valid) + ' = false; break outer; } } } ';
    } else {
      out += ' var itemIndices = {}, item; for (;i--;) { var item = ' + ($data) + '[i]; ';
      var $method = 'checkDataType' + ($typeIsArray ? 's' : '');
      out += ' if (' + (it.util[$method]($itemType, 'item', it.opts.strictNumbers, true)) + ') continue; ';
      if ($typeIsArray) {
        out += ' if (typeof item == \'string\') item = \'"\' + item; ';
      }
      out += ' if (typeof itemIndices[item] == \'number\') { ' + ($valid) + ' = false; j = itemIndices[item]; break; } itemIndices[item] = i; } ';
    }
    out += ' } ';
    if ($isData) {
      out += '  }  ';
    }
    out += ' if (!' + ($valid) + ') {   ';
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('uniqueItems') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { i: i, j: j } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should NOT have duplicate items (items ## \' + j + \' and \' + i + \' are identical)\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema:  ';
        if ($isData) {
          out += 'validate.schema' + ($schemaPath);
        } else {
          out += '' + ($schema);
        }
        out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' } ';
    if ($breakOnError) {
      out += ' else { ';
    }
  } else {
    if ($breakOnError) {
      out += ' if (true) { ';
    }
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/uniqueItems.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],43:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';
module.exports = function generate_validate(it, $keyword, $ruleType) {
  var out = '';
  var $async = it.schema.$async === true,
    $refKeywords = it.util.schemaHasRulesExcept(it.schema, it.RULES.all, '$ref'),
    $id = it.self._getId(it.schema);
  if (it.opts.strictKeywords) {
    var $unknownKwd = it.util.schemaUnknownRules(it.schema, it.RULES.keywords);
    if ($unknownKwd) {
      var $keywordsMsg = 'unknown keyword: ' + $unknownKwd;
      if (it.opts.strictKeywords === 'log') it.logger.warn($keywordsMsg);
      else throw new Error($keywordsMsg);
    }
  }
  if (it.isTop) {
    out += ' var validate = ';
    if ($async) {
      it.async = true;
      out += 'async ';
    }
    out += 'function(data, dataPath, parentData, parentDataProperty, rootData) { \'use strict\'; ';
    if ($id && (it.opts.sourceCode || it.opts.processCode)) {
      out += ' ' + ('/\*# sourceURL=' + $id + ' */') + ' ';
    }
  }
  if (typeof it.schema == 'boolean' || !($refKeywords || it.schema.$ref)) {
    var $keyword = 'false schema';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $errorKeyword;
    var $data = 'data' + ($dataLvl || '');
    var $valid = 'valid' + $lvl;
    if (it.schema === false) {
      if (it.isTop) {
        $breakOnError = true;
      } else {
        out += ' var ' + ($valid) + ' = false; ';
      }
      var $$outStack = $$outStack || [];
      $$outStack.push(out);
      out = ''; /* istanbul ignore else */
      if (it.createErrors !== false) {
        out += ' { keyword: \'' + ($errorKeyword || 'false schema') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
        if (it.opts.messages !== false) {
          out += ' , message: \'boolean schema is false\' ';
        }
        if (it.opts.verbose) {
          out += ' , schema: false , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
        }
        out += ' } ';
      } else {
        out += ' {} ';
      }
      var __err = out;
      out = $$outStack.pop();
      if (!it.compositeRule && $breakOnError) {
        /* istanbul ignore if */
        if (it.async) {
          out += ' throw new ValidationError([' + (__err) + ']); ';
        } else {
          out += ' validate.errors = [' + (__err) + ']; return false; ';
        }
      } else {
        out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
      }
    } else {
      if (it.isTop) {
        if ($async) {
          out += ' return data; ';
        } else {
          out += ' validate.errors = null; return true; ';
        }
      } else {
        out += ' var ' + ($valid) + ' = true; ';
      }
    }
    if (it.isTop) {
      out += ' }; return validate; ';
    }
    return out;
  }
  if (it.isTop) {
    var $top = it.isTop,
      $lvl = it.level = 0,
      $dataLvl = it.dataLevel = 0,
      $data = 'data';
    it.rootId = it.resolve.fullPath(it.self._getId(it.root.schema));
    it.baseId = it.baseId || it.rootId;
    delete it.isTop;
    it.dataPathArr = [""];
    if (it.schema.default !== undefined && it.opts.useDefaults && it.opts.strictDefaults) {
      var $defaultMsg = 'default is ignored in the schema root';
      if (it.opts.strictDefaults === 'log') it.logger.warn($defaultMsg);
      else throw new Error($defaultMsg);
    }
    out += ' var vErrors = null; ';
    out += ' var errors = 0;     ';
    out += ' if (rootData === undefined) rootData = data; ';
  } else {
    var $lvl = it.level,
      $dataLvl = it.dataLevel,
      $data = 'data' + ($dataLvl || '');
    if ($id) it.baseId = it.resolve.url(it.baseId, $id);
    if ($async && !it.async) throw new Error('async schema in sync schema');
    out += ' var errs_' + ($lvl) + ' = errors;';
  }
  var $valid = 'valid' + $lvl,
    $breakOnError = !it.opts.allErrors,
    $closingBraces1 = '',
    $closingBraces2 = '';
  var $errorKeyword;
  var $typeSchema = it.schema.type,
    $typeIsArray = Array.isArray($typeSchema);
  if ($typeSchema && it.opts.nullable && it.schema.nullable === true) {
    if ($typeIsArray) {
      if ($typeSchema.indexOf('null') == -1) $typeSchema = $typeSchema.concat('null');
    } else if ($typeSchema != 'null') {
      $typeSchema = [$typeSchema, 'null'];
      $typeIsArray = true;
    }
  }
  if ($typeIsArray && $typeSchema.length == 1) {
    $typeSchema = $typeSchema[0];
    $typeIsArray = false;
  }
  if (it.schema.$ref && $refKeywords) {
    if (it.opts.extendRefs == 'fail') {
      throw new Error('$ref: validation keywords used in schema at path "' + it.errSchemaPath + '" (see option extendRefs)');
    } else if (it.opts.extendRefs !== true) {
      $refKeywords = false;
      it.logger.warn('$ref: keywords ignored in schema at path "' + it.errSchemaPath + '"');
    }
  }
  if (it.schema.$comment && it.opts.$comment) {
    out += ' ' + (it.RULES.all.$comment.code(it, '$comment'));
  }
  if ($typeSchema) {
    if (it.opts.coerceTypes) {
      var $coerceToTypes = it.util.coerceToTypes(it.opts.coerceTypes, $typeSchema);
    }
    var $rulesGroup = it.RULES.types[$typeSchema];
    if ($coerceToTypes || $typeIsArray || $rulesGroup === true || ($rulesGroup && !$shouldUseGroup($rulesGroup))) {
      var $schemaPath = it.schemaPath + '.type',
        $errSchemaPath = it.errSchemaPath + '/type';
      var $schemaPath = it.schemaPath + '.type',
        $errSchemaPath = it.errSchemaPath + '/type',
        $method = $typeIsArray ? 'checkDataTypes' : 'checkDataType';
      out += ' if (' + (it.util[$method]($typeSchema, $data, it.opts.strictNumbers, true)) + ') { ';
      if ($coerceToTypes) {
        var $dataType = 'dataType' + $lvl,
          $coerced = 'coerced' + $lvl;
        out += ' var ' + ($dataType) + ' = typeof ' + ($data) + '; var ' + ($coerced) + ' = undefined; ';
        if (it.opts.coerceTypes == 'array') {
          out += ' if (' + ($dataType) + ' == \'object\' && Array.isArray(' + ($data) + ') && ' + ($data) + '.length == 1) { ' + ($data) + ' = ' + ($data) + '[0]; ' + ($dataType) + ' = typeof ' + ($data) + '; if (' + (it.util.checkDataType(it.schema.type, $data, it.opts.strictNumbers)) + ') ' + ($coerced) + ' = ' + ($data) + '; } ';
        }
        out += ' if (' + ($coerced) + ' !== undefined) ; ';
        var arr1 = $coerceToTypes;
        if (arr1) {
          var $type, $i = -1,
            l1 = arr1.length - 1;
          while ($i < l1) {
            $type = arr1[$i += 1];
            if ($type == 'string') {
              out += ' else if (' + ($dataType) + ' == \'number\' || ' + ($dataType) + ' == \'boolean\') ' + ($coerced) + ' = \'\' + ' + ($data) + '; else if (' + ($data) + ' === null) ' + ($coerced) + ' = \'\'; ';
            } else if ($type == 'number' || $type == 'integer') {
              out += ' else if (' + ($dataType) + ' == \'boolean\' || ' + ($data) + ' === null || (' + ($dataType) + ' == \'string\' && ' + ($data) + ' && ' + ($data) + ' == +' + ($data) + ' ';
              if ($type == 'integer') {
                out += ' && !(' + ($data) + ' % 1)';
              }
              out += ')) ' + ($coerced) + ' = +' + ($data) + '; ';
            } else if ($type == 'boolean') {
              out += ' else if (' + ($data) + ' === \'false\' || ' + ($data) + ' === 0 || ' + ($data) + ' === null) ' + ($coerced) + ' = false; else if (' + ($data) + ' === \'true\' || ' + ($data) + ' === 1) ' + ($coerced) + ' = true; ';
            } else if ($type == 'null') {
              out += ' else if (' + ($data) + ' === \'\' || ' + ($data) + ' === 0 || ' + ($data) + ' === false) ' + ($coerced) + ' = null; ';
            } else if (it.opts.coerceTypes == 'array' && $type == 'array') {
              out += ' else if (' + ($dataType) + ' == \'string\' || ' + ($dataType) + ' == \'number\' || ' + ($dataType) + ' == \'boolean\' || ' + ($data) + ' == null) ' + ($coerced) + ' = [' + ($data) + ']; ';
            }
          }
        }
        out += ' else {   ';
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = ''; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ($errorKeyword || 'type') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { type: \'';
          if ($typeIsArray) {
            out += '' + ($typeSchema.join(","));
          } else {
            out += '' + ($typeSchema);
          }
          out += '\' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'should be ';
            if ($typeIsArray) {
              out += '' + ($typeSchema.join(","));
            } else {
              out += '' + ($typeSchema);
            }
            out += '\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          /* istanbul ignore if */
          if (it.async) {
            out += ' throw new ValidationError([' + (__err) + ']); ';
          } else {
            out += ' validate.errors = [' + (__err) + ']; return false; ';
          }
        } else {
          out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
        out += ' } if (' + ($coerced) + ' !== undefined) {  ';
        var $parentData = $dataLvl ? 'data' + (($dataLvl - 1) || '') : 'parentData',
          $parentDataProperty = $dataLvl ? it.dataPathArr[$dataLvl] : 'parentDataProperty';
        out += ' ' + ($data) + ' = ' + ($coerced) + '; ';
        if (!$dataLvl) {
          out += 'if (' + ($parentData) + ' !== undefined)';
        }
        out += ' ' + ($parentData) + '[' + ($parentDataProperty) + '] = ' + ($coerced) + '; } ';
      } else {
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = ''; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ($errorKeyword || 'type') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { type: \'';
          if ($typeIsArray) {
            out += '' + ($typeSchema.join(","));
          } else {
            out += '' + ($typeSchema);
          }
          out += '\' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'should be ';
            if ($typeIsArray) {
              out += '' + ($typeSchema.join(","));
            } else {
              out += '' + ($typeSchema);
            }
            out += '\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          /* istanbul ignore if */
          if (it.async) {
            out += ' throw new ValidationError([' + (__err) + ']); ';
          } else {
            out += ' validate.errors = [' + (__err) + ']; return false; ';
          }
        } else {
          out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
      }
      out += ' } ';
    }
  }
  if (it.schema.$ref && !$refKeywords) {
    out += ' ' + (it.RULES.all.$ref.code(it, '$ref')) + ' ';
    if ($breakOnError) {
      out += ' } if (errors === ';
      if ($top) {
        out += '0';
      } else {
        out += 'errs_' + ($lvl);
      }
      out += ') { ';
      $closingBraces2 += '}';
    }
  } else {
    var arr2 = it.RULES;
    if (arr2) {
      var $rulesGroup, i2 = -1,
        l2 = arr2.length - 1;
      while (i2 < l2) {
        $rulesGroup = arr2[i2 += 1];
        if ($shouldUseGroup($rulesGroup)) {
          if ($rulesGroup.type) {
            out += ' if (' + (it.util.checkDataType($rulesGroup.type, $data, it.opts.strictNumbers)) + ') { ';
          }
          if (it.opts.useDefaults) {
            if ($rulesGroup.type == 'object' && it.schema.properties) {
              var $schema = it.schema.properties,
                $schemaKeys = Object.keys($schema);
              var arr3 = $schemaKeys;
              if (arr3) {
                var $propertyKey, i3 = -1,
                  l3 = arr3.length - 1;
                while (i3 < l3) {
                  $propertyKey = arr3[i3 += 1];
                  var $sch = $schema[$propertyKey];
                  if ($sch.default !== undefined) {
                    var $passData = $data + it.util.getProperty($propertyKey);
                    if (it.compositeRule) {
                      if (it.opts.strictDefaults) {
                        var $defaultMsg = 'default is ignored for: ' + $passData;
                        if (it.opts.strictDefaults === 'log') it.logger.warn($defaultMsg);
                        else throw new Error($defaultMsg);
                      }
                    } else {
                      out += ' if (' + ($passData) + ' === undefined ';
                      if (it.opts.useDefaults == 'empty') {
                        out += ' || ' + ($passData) + ' === null || ' + ($passData) + ' === \'\' ';
                      }
                      out += ' ) ' + ($passData) + ' = ';
                      if (it.opts.useDefaults == 'shared') {
                        out += ' ' + (it.useDefault($sch.default)) + ' ';
                      } else {
                        out += ' ' + (JSON.stringify($sch.default)) + ' ';
                      }
                      out += '; ';
                    }
                  }
                }
              }
            } else if ($rulesGroup.type == 'array' && Array.isArray(it.schema.items)) {
              var arr4 = it.schema.items;
              if (arr4) {
                var $sch, $i = -1,
                  l4 = arr4.length - 1;
                while ($i < l4) {
                  $sch = arr4[$i += 1];
                  if ($sch.default !== undefined) {
                    var $passData = $data + '[' + $i + ']';
                    if (it.compositeRule) {
                      if (it.opts.strictDefaults) {
                        var $defaultMsg = 'default is ignored for: ' + $passData;
                        if (it.opts.strictDefaults === 'log') it.logger.warn($defaultMsg);
                        else throw new Error($defaultMsg);
                      }
                    } else {
                      out += ' if (' + ($passData) + ' === undefined ';
                      if (it.opts.useDefaults == 'empty') {
                        out += ' || ' + ($passData) + ' === null || ' + ($passData) + ' === \'\' ';
                      }
                      out += ' ) ' + ($passData) + ' = ';
                      if (it.opts.useDefaults == 'shared') {
                        out += ' ' + (it.useDefault($sch.default)) + ' ';
                      } else {
                        out += ' ' + (JSON.stringify($sch.default)) + ' ';
                      }
                      out += '; ';
                    }
                  }
                }
              }
            }
          }
          var arr5 = $rulesGroup.rules;
          if (arr5) {
            var $rule, i5 = -1,
              l5 = arr5.length - 1;
            while (i5 < l5) {
              $rule = arr5[i5 += 1];
              if ($shouldUseRule($rule)) {
                var $code = $rule.code(it, $rule.keyword, $rulesGroup.type);
                if ($code) {
                  out += ' ' + ($code) + ' ';
                  if ($breakOnError) {
                    $closingBraces1 += '}';
                  }
                }
              }
            }
          }
          if ($breakOnError) {
            out += ' ' + ($closingBraces1) + ' ';
            $closingBraces1 = '';
          }
          if ($rulesGroup.type) {
            out += ' } ';
            if ($typeSchema && $typeSchema === $rulesGroup.type && !$coerceToTypes) {
              out += ' else { ';
              var $schemaPath = it.schemaPath + '.type',
                $errSchemaPath = it.errSchemaPath + '/type';
              var $$outStack = $$outStack || [];
              $$outStack.push(out);
              out = ''; /* istanbul ignore else */
              if (it.createErrors !== false) {
                out += ' { keyword: \'' + ($errorKeyword || 'type') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { type: \'';
                if ($typeIsArray) {
                  out += '' + ($typeSchema.join(","));
                } else {
                  out += '' + ($typeSchema);
                }
                out += '\' } ';
                if (it.opts.messages !== false) {
                  out += ' , message: \'should be ';
                  if ($typeIsArray) {
                    out += '' + ($typeSchema.join(","));
                  } else {
                    out += '' + ($typeSchema);
                  }
                  out += '\' ';
                }
                if (it.opts.verbose) {
                  out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
                }
                out += ' } ';
              } else {
                out += ' {} ';
              }
              var __err = out;
              out = $$outStack.pop();
              if (!it.compositeRule && $breakOnError) {
                /* istanbul ignore if */
                if (it.async) {
                  out += ' throw new ValidationError([' + (__err) + ']); ';
                } else {
                  out += ' validate.errors = [' + (__err) + ']; return false; ';
                }
              } else {
                out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
              }
              out += ' } ';
            }
          }
          if ($breakOnError) {
            out += ' if (errors === ';
            if ($top) {
              out += '0';
            } else {
              out += 'errs_' + ($lvl);
            }
            out += ') { ';
            $closingBraces2 += '}';
          }
        }
      }
    }
  }
  if ($breakOnError) {
    out += ' ' + ($closingBraces2) + ' ';
  }
  if ($top) {
    if ($async) {
      out += ' if (errors === 0) return data;           ';
      out += ' else throw new ValidationError(vErrors); ';
    } else {
      out += ' validate.errors = vErrors; ';
      out += ' return errors === 0;       ';
    }
    out += ' }; return validate;';
  } else {
    out += ' var ' + ($valid) + ' = errors === errs_' + ($lvl) + ';';
  }

  function $shouldUseGroup($rulesGroup) {
    var rules = $rulesGroup.rules;
    for (var i = 0; i < rules.length; i++)
      if ($shouldUseRule(rules[i])) return true;
  }

  function $shouldUseRule($rule) {
    return it.schema[$rule.keyword] !== undefined || ($rule.implements && $ruleImplementsSomeKeyword($rule));
  }

  function $ruleImplementsSomeKeyword($rule) {
    var impl = $rule.implements;
    for (var i = 0; i < impl.length; i++)
      if (it.schema[impl[i]] !== undefined) return true;
  }
  return out;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/dotjs/validate.js","/../node_modules/ajv/lib/dotjs")
},{"buffer":48,"pBGvAp":53}],44:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var IDENTIFIER = /^[a-z_$][a-z0-9_$-]*$/i;
var customRuleCode = require('./dotjs/custom');
var definitionSchema = require('./definition_schema');

module.exports = {
  add: addKeyword,
  get: getKeyword,
  remove: removeKeyword,
  validate: validateKeyword
};


/**
 * Define custom keyword
 * @this  Ajv
 * @param {String} keyword custom keyword, should be unique (including different from all standard, custom and macro keywords).
 * @param {Object} definition keyword definition object with properties `type` (type(s) which the keyword applies to), `validate` or `compile`.
 * @return {Ajv} this for method chaining
 */
function addKeyword(keyword, definition) {
  /* jshint validthis: true */
  /* eslint no-shadow: 0 */
  var RULES = this.RULES;
  if (RULES.keywords[keyword])
    throw new Error('Keyword ' + keyword + ' is already defined');

  if (!IDENTIFIER.test(keyword))
    throw new Error('Keyword ' + keyword + ' is not a valid identifier');

  if (definition) {
    this.validateKeyword(definition, true);

    var dataType = definition.type;
    if (Array.isArray(dataType)) {
      for (var i=0; i<dataType.length; i++)
        _addRule(keyword, dataType[i], definition);
    } else {
      _addRule(keyword, dataType, definition);
    }

    var metaSchema = definition.metaSchema;
    if (metaSchema) {
      if (definition.$data && this._opts.$data) {
        metaSchema = {
          anyOf: [
            metaSchema,
            { '$ref': 'https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#' }
          ]
        };
      }
      definition.validateSchema = this.compile(metaSchema, true);
    }
  }

  RULES.keywords[keyword] = RULES.all[keyword] = true;


  function _addRule(keyword, dataType, definition) {
    var ruleGroup;
    for (var i=0; i<RULES.length; i++) {
      var rg = RULES[i];
      if (rg.type == dataType) {
        ruleGroup = rg;
        break;
      }
    }

    if (!ruleGroup) {
      ruleGroup = { type: dataType, rules: [] };
      RULES.push(ruleGroup);
    }

    var rule = {
      keyword: keyword,
      definition: definition,
      custom: true,
      code: customRuleCode,
      implements: definition.implements
    };
    ruleGroup.rules.push(rule);
    RULES.custom[keyword] = rule;
  }

  return this;
}


/**
 * Get keyword
 * @this  Ajv
 * @param {String} keyword pre-defined or custom keyword.
 * @return {Object|Boolean} custom keyword definition, `true` if it is a predefined keyword, `false` otherwise.
 */
function getKeyword(keyword) {
  /* jshint validthis: true */
  var rule = this.RULES.custom[keyword];
  return rule ? rule.definition : this.RULES.keywords[keyword] || false;
}


/**
 * Remove keyword
 * @this  Ajv
 * @param {String} keyword pre-defined or custom keyword.
 * @return {Ajv} this for method chaining
 */
function removeKeyword(keyword) {
  /* jshint validthis: true */
  var RULES = this.RULES;
  delete RULES.keywords[keyword];
  delete RULES.all[keyword];
  delete RULES.custom[keyword];
  for (var i=0; i<RULES.length; i++) {
    var rules = RULES[i].rules;
    for (var j=0; j<rules.length; j++) {
      if (rules[j].keyword == keyword) {
        rules.splice(j, 1);
        break;
      }
    }
  }
  return this;
}


/**
 * Validate keyword definition
 * @this  Ajv
 * @param {Object} definition keyword definition object.
 * @param {Boolean} throwError true to throw exception if definition is invalid
 * @return {boolean} validation result
 */
function validateKeyword(definition, throwError) {
  validateKeyword.errors = null;
  var v = this._validateKeyword = this._validateKeyword
                                  || this.compile(definitionSchema, true);

  if (v(definition)) return true;
  validateKeyword.errors = v.errors;
  if (throwError)
    throw new Error('custom keyword definition is invalid: '  + this.errorsText(v.errors));
  else
    return false;
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ajv/lib/keyword.js","/../node_modules/ajv/lib")
},{"./definition_schema":17,"./dotjs/custom":27,"buffer":48,"pBGvAp":53}],45:[function(require,module,exports){
module.exports={
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
    "description": "Meta-schema for $data reference (JSON Schema extension proposal)",
    "type": "object",
    "required": [ "$data" ],
    "properties": {
        "$data": {
            "type": "string",
            "anyOf": [
                { "format": "relative-json-pointer" }, 
                { "format": "json-pointer" }
            ]
        }
    },
    "additionalProperties": false
}

},{}],46:[function(require,module,exports){
module.exports={
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "http://json-schema.org/draft-07/schema#",
    "title": "Core schema meta-schema",
    "definitions": {
        "schemaArray": {
            "type": "array",
            "minItems": 1,
            "items": { "$ref": "#" }
        },
        "nonNegativeInteger": {
            "type": "integer",
            "minimum": 0
        },
        "nonNegativeIntegerDefault0": {
            "allOf": [
                { "$ref": "#/definitions/nonNegativeInteger" },
                { "default": 0 }
            ]
        },
        "simpleTypes": {
            "enum": [
                "array",
                "boolean",
                "integer",
                "null",
                "number",
                "object",
                "string"
            ]
        },
        "stringArray": {
            "type": "array",
            "items": { "type": "string" },
            "uniqueItems": true,
            "default": []
        }
    },
    "type": ["object", "boolean"],
    "properties": {
        "$id": {
            "type": "string",
            "format": "uri-reference"
        },
        "$schema": {
            "type": "string",
            "format": "uri"
        },
        "$ref": {
            "type": "string",
            "format": "uri-reference"
        },
        "$comment": {
            "type": "string"
        },
        "title": {
            "type": "string"
        },
        "description": {
            "type": "string"
        },
        "default": true,
        "readOnly": {
            "type": "boolean",
            "default": false
        },
        "examples": {
            "type": "array",
            "items": true
        },
        "multipleOf": {
            "type": "number",
            "exclusiveMinimum": 0
        },
        "maximum": {
            "type": "number"
        },
        "exclusiveMaximum": {
            "type": "number"
        },
        "minimum": {
            "type": "number"
        },
        "exclusiveMinimum": {
            "type": "number"
        },
        "maxLength": { "$ref": "#/definitions/nonNegativeInteger" },
        "minLength": { "$ref": "#/definitions/nonNegativeIntegerDefault0" },
        "pattern": {
            "type": "string",
            "format": "regex"
        },
        "additionalItems": { "$ref": "#" },
        "items": {
            "anyOf": [
                { "$ref": "#" },
                { "$ref": "#/definitions/schemaArray" }
            ],
            "default": true
        },
        "maxItems": { "$ref": "#/definitions/nonNegativeInteger" },
        "minItems": { "$ref": "#/definitions/nonNegativeIntegerDefault0" },
        "uniqueItems": {
            "type": "boolean",
            "default": false
        },
        "contains": { "$ref": "#" },
        "maxProperties": { "$ref": "#/definitions/nonNegativeInteger" },
        "minProperties": { "$ref": "#/definitions/nonNegativeIntegerDefault0" },
        "required": { "$ref": "#/definitions/stringArray" },
        "additionalProperties": { "$ref": "#" },
        "definitions": {
            "type": "object",
            "additionalProperties": { "$ref": "#" },
            "default": {}
        },
        "properties": {
            "type": "object",
            "additionalProperties": { "$ref": "#" },
            "default": {}
        },
        "patternProperties": {
            "type": "object",
            "additionalProperties": { "$ref": "#" },
            "propertyNames": { "format": "regex" },
            "default": {}
        },
        "dependencies": {
            "type": "object",
            "additionalProperties": {
                "anyOf": [
                    { "$ref": "#" },
                    { "$ref": "#/definitions/stringArray" }
                ]
            }
        },
        "propertyNames": { "$ref": "#" },
        "const": true,
        "enum": {
            "type": "array",
            "items": true,
            "minItems": 1,
            "uniqueItems": true
        },
        "type": {
            "anyOf": [
                { "$ref": "#/definitions/simpleTypes" },
                {
                    "type": "array",
                    "items": { "$ref": "#/definitions/simpleTypes" },
                    "minItems": 1,
                    "uniqueItems": true
                }
            ]
        },
        "format": { "type": "string" },
        "contentMediaType": { "type": "string" },
        "contentEncoding": { "type": "string" },
        "if": {"$ref": "#"},
        "then": {"$ref": "#"},
        "else": {"$ref": "#"},
        "allOf": { "$ref": "#/definitions/schemaArray" },
        "anyOf": { "$ref": "#/definitions/schemaArray" },
        "oneOf": { "$ref": "#/definitions/schemaArray" },
        "not": { "$ref": "#" }
    },
    "default": true
}

},{}],47:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/base64-js/lib/b64.js","/../node_modules/base64-js/lib")
},{"buffer":48,"pBGvAp":53}],48:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/buffer/index.js","/../node_modules/buffer")
},{"base64-js":47,"buffer":48,"ieee754":51,"pBGvAp":53}],49:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

// do not edit .js files directly - edit src/index.jst



module.exports = function equal(a, b) {
  if (a === b) return true;

  if (a && b && typeof a == 'object' && typeof b == 'object') {
    if (a.constructor !== b.constructor) return false;

    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0;)
        if (!equal(a[i], b[i])) return false;
      return true;
    }



    if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();

    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0;)
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

    for (i = length; i-- !== 0;) {
      var key = keys[i];

      if (!equal(a[key], b[key])) return false;
    }

    return true;
  }

  // true if both NaN, false otherwise
  return a!==a && b!==b;
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/fast-deep-equal/index.js","/../node_modules/fast-deep-equal")
},{"buffer":48,"pBGvAp":53}],50:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

module.exports = function (data, opts) {
    if (!opts) opts = {};
    if (typeof opts === 'function') opts = { cmp: opts };
    var cycles = (typeof opts.cycles === 'boolean') ? opts.cycles : false;

    var cmp = opts.cmp && (function (f) {
        return function (node) {
            return function (a, b) {
                var aobj = { key: a, value: node[a] };
                var bobj = { key: b, value: node[b] };
                return f(aobj, bobj);
            };
        };
    })(opts.cmp);

    var seen = [];
    return (function stringify (node) {
        if (node && node.toJSON && typeof node.toJSON === 'function') {
            node = node.toJSON();
        }

        if (node === undefined) return;
        if (typeof node == 'number') return isFinite(node) ? '' + node : 'null';
        if (typeof node !== 'object') return JSON.stringify(node);

        var i, out;
        if (Array.isArray(node)) {
            out = '[';
            for (i = 0; i < node.length; i++) {
                if (i) out += ',';
                out += stringify(node[i]) || 'null';
            }
            return out + ']';
        }

        if (node === null) return 'null';

        if (seen.indexOf(node) !== -1) {
            if (cycles) return JSON.stringify('__cycle__');
            throw new TypeError('Converting circular structure to JSON');
        }

        var seenIndex = seen.push(node) - 1;
        var keys = Object.keys(node).sort(cmp && cmp(node));
        out = '';
        for (i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = stringify(node[key]);

            if (!value) continue;
            if (out) out += ',';
            out += JSON.stringify(key) + ':' + value;
        }
        seen.splice(seenIndex, 1);
        return '{' + out + '}';
    })(data);
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/fast-json-stable-stringify/index.js","/../node_modules/fast-json-stable-stringify")
},{"buffer":48,"pBGvAp":53}],51:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/ieee754/index.js","/../node_modules/ieee754")
},{"buffer":48,"pBGvAp":53}],52:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var traverse = module.exports = function (schema, opts, cb) {
  // Legacy support for v0.3.1 and earlier.
  if (typeof opts == 'function') {
    cb = opts;
    opts = {};
  }

  cb = opts.cb || cb;
  var pre = (typeof cb == 'function') ? cb : cb.pre || function() {};
  var post = cb.post || function() {};

  _traverse(opts, pre, post, schema, '', schema);
};


traverse.keywords = {
  additionalItems: true,
  items: true,
  contains: true,
  additionalProperties: true,
  propertyNames: true,
  not: true
};

traverse.arrayKeywords = {
  items: true,
  allOf: true,
  anyOf: true,
  oneOf: true
};

traverse.propsKeywords = {
  definitions: true,
  properties: true,
  patternProperties: true,
  dependencies: true
};

traverse.skipKeywords = {
  default: true,
  enum: true,
  const: true,
  required: true,
  maximum: true,
  minimum: true,
  exclusiveMaximum: true,
  exclusiveMinimum: true,
  multipleOf: true,
  maxLength: true,
  minLength: true,
  pattern: true,
  format: true,
  maxItems: true,
  minItems: true,
  uniqueItems: true,
  maxProperties: true,
  minProperties: true
};


function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
  if (schema && typeof schema == 'object' && !Array.isArray(schema)) {
    pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
    for (var key in schema) {
      var sch = schema[key];
      if (Array.isArray(sch)) {
        if (key in traverse.arrayKeywords) {
          for (var i=0; i<sch.length; i++)
            _traverse(opts, pre, post, sch[i], jsonPtr + '/' + key + '/' + i, rootSchema, jsonPtr, key, schema, i);
        }
      } else if (key in traverse.propsKeywords) {
        if (sch && typeof sch == 'object') {
          for (var prop in sch)
            _traverse(opts, pre, post, sch[prop], jsonPtr + '/' + key + '/' + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
        }
      } else if (key in traverse.keywords || (opts.allKeys && !(key in traverse.skipKeywords))) {
        _traverse(opts, pre, post, sch, jsonPtr + '/' + key, rootSchema, jsonPtr, key, schema);
      }
    }
    post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
  }
}


function escapeJsonPtr(str) {
  return str.replace(/~/g, '~0').replace(/\//g, '~1');
}

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/json-schema-traverse/index.js","/../node_modules/json-schema-traverse")
},{"buffer":48,"pBGvAp":53}],53:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/process/browser.js","/../node_modules/process")
},{"buffer":48,"pBGvAp":53}],54:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/** @license URI.js v4.4.1 (c) 2011 Gary Court. License: http://github.com/garycourt/uri-js */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.URI = global.URI || {})));
}(this, (function (exports) { 'use strict';

function merge() {
    for (var _len = arguments.length, sets = Array(_len), _key = 0; _key < _len; _key++) {
        sets[_key] = arguments[_key];
    }

    if (sets.length > 1) {
        sets[0] = sets[0].slice(0, -1);
        var xl = sets.length - 1;
        for (var x = 1; x < xl; ++x) {
            sets[x] = sets[x].slice(1, -1);
        }
        sets[xl] = sets[xl].slice(1);
        return sets.join('');
    } else {
        return sets[0];
    }
}
function subexp(str) {
    return "(?:" + str + ")";
}
function typeOf(o) {
    return o === undefined ? "undefined" : o === null ? "null" : Object.prototype.toString.call(o).split(" ").pop().split("]").shift().toLowerCase();
}
function toUpperCase(str) {
    return str.toUpperCase();
}
function toArray(obj) {
    return obj !== undefined && obj !== null ? obj instanceof Array ? obj : typeof obj.length !== "number" || obj.split || obj.setInterval || obj.call ? [obj] : Array.prototype.slice.call(obj) : [];
}
function assign(target, source) {
    var obj = target;
    if (source) {
        for (var key in source) {
            obj[key] = source[key];
        }
    }
    return obj;
}

function buildExps(isIRI) {
    var ALPHA$$ = "[A-Za-z]",
        CR$ = "[\\x0D]",
        DIGIT$$ = "[0-9]",
        DQUOTE$$ = "[\\x22]",
        HEXDIG$$ = merge(DIGIT$$, "[A-Fa-f]"),
        //case-insensitive
    LF$$ = "[\\x0A]",
        SP$$ = "[\\x20]",
        PCT_ENCODED$ = subexp(subexp("%[EFef]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%[89A-Fa-f]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%" + HEXDIG$$ + HEXDIG$$)),
        //expanded
    GEN_DELIMS$$ = "[\\:\\/\\?\\#\\[\\]\\@]",
        SUB_DELIMS$$ = "[\\!\\$\\&\\'\\(\\)\\*\\+\\,\\;\\=]",
        RESERVED$$ = merge(GEN_DELIMS$$, SUB_DELIMS$$),
        UCSCHAR$$ = isIRI ? "[\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]" : "[]",
        //subset, excludes bidi control characters
    IPRIVATE$$ = isIRI ? "[\\uE000-\\uF8FF]" : "[]",
        //subset
    UNRESERVED$$ = merge(ALPHA$$, DIGIT$$, "[\\-\\.\\_\\~]", UCSCHAR$$),
        SCHEME$ = subexp(ALPHA$$ + merge(ALPHA$$, DIGIT$$, "[\\+\\-\\.]") + "*"),
        USERINFO$ = subexp(subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\:]")) + "*"),
        DEC_OCTET$ = subexp(subexp("25[0-5]") + "|" + subexp("2[0-4]" + DIGIT$$) + "|" + subexp("1" + DIGIT$$ + DIGIT$$) + "|" + subexp("[1-9]" + DIGIT$$) + "|" + DIGIT$$),
        DEC_OCTET_RELAXED$ = subexp(subexp("25[0-5]") + "|" + subexp("2[0-4]" + DIGIT$$) + "|" + subexp("1" + DIGIT$$ + DIGIT$$) + "|" + subexp("0?[1-9]" + DIGIT$$) + "|0?0?" + DIGIT$$),
        //relaxed parsing rules
    IPV4ADDRESS$ = subexp(DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$),
        H16$ = subexp(HEXDIG$$ + "{1,4}"),
        LS32$ = subexp(subexp(H16$ + "\\:" + H16$) + "|" + IPV4ADDRESS$),
        IPV6ADDRESS1$ = subexp(subexp(H16$ + "\\:") + "{6}" + LS32$),
        //                           6( h16 ":" ) ls32
    IPV6ADDRESS2$ = subexp("\\:\\:" + subexp(H16$ + "\\:") + "{5}" + LS32$),
        //                      "::" 5( h16 ":" ) ls32
    IPV6ADDRESS3$ = subexp(subexp(H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{4}" + LS32$),
        //[               h16 ] "::" 4( h16 ":" ) ls32
    IPV6ADDRESS4$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,1}" + H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{3}" + LS32$),
        //[ *1( h16 ":" ) h16 ] "::" 3( h16 ":" ) ls32
    IPV6ADDRESS5$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,2}" + H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{2}" + LS32$),
        //[ *2( h16 ":" ) h16 ] "::" 2( h16 ":" ) ls32
    IPV6ADDRESS6$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,3}" + H16$) + "?\\:\\:" + H16$ + "\\:" + LS32$),
        //[ *3( h16 ":" ) h16 ] "::"    h16 ":"   ls32
    IPV6ADDRESS7$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,4}" + H16$) + "?\\:\\:" + LS32$),
        //[ *4( h16 ":" ) h16 ] "::"              ls32
    IPV6ADDRESS8$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,5}" + H16$) + "?\\:\\:" + H16$),
        //[ *5( h16 ":" ) h16 ] "::"              h16
    IPV6ADDRESS9$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,6}" + H16$) + "?\\:\\:"),
        //[ *6( h16 ":" ) h16 ] "::"
    IPV6ADDRESS$ = subexp([IPV6ADDRESS1$, IPV6ADDRESS2$, IPV6ADDRESS3$, IPV6ADDRESS4$, IPV6ADDRESS5$, IPV6ADDRESS6$, IPV6ADDRESS7$, IPV6ADDRESS8$, IPV6ADDRESS9$].join("|")),
        ZONEID$ = subexp(subexp(UNRESERVED$$ + "|" + PCT_ENCODED$) + "+"),
        //RFC 6874
    IPV6ADDRZ$ = subexp(IPV6ADDRESS$ + "\\%25" + ZONEID$),
        //RFC 6874
    IPV6ADDRZ_RELAXED$ = subexp(IPV6ADDRESS$ + subexp("\\%25|\\%(?!" + HEXDIG$$ + "{2})") + ZONEID$),
        //RFC 6874, with relaxed parsing rules
    IPVFUTURE$ = subexp("[vV]" + HEXDIG$$ + "+\\." + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\:]") + "+"),
        IP_LITERAL$ = subexp("\\[" + subexp(IPV6ADDRZ_RELAXED$ + "|" + IPV6ADDRESS$ + "|" + IPVFUTURE$) + "\\]"),
        //RFC 6874
    REG_NAME$ = subexp(subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$)) + "*"),
        HOST$ = subexp(IP_LITERAL$ + "|" + IPV4ADDRESS$ + "(?!" + REG_NAME$ + ")" + "|" + REG_NAME$),
        PORT$ = subexp(DIGIT$$ + "*"),
        AUTHORITY$ = subexp(subexp(USERINFO$ + "@") + "?" + HOST$ + subexp("\\:" + PORT$) + "?"),
        PCHAR$ = subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\:\\@]")),
        SEGMENT$ = subexp(PCHAR$ + "*"),
        SEGMENT_NZ$ = subexp(PCHAR$ + "+"),
        SEGMENT_NZ_NC$ = subexp(subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\@]")) + "+"),
        PATH_ABEMPTY$ = subexp(subexp("\\/" + SEGMENT$) + "*"),
        PATH_ABSOLUTE$ = subexp("\\/" + subexp(SEGMENT_NZ$ + PATH_ABEMPTY$) + "?"),
        //simplified
    PATH_NOSCHEME$ = subexp(SEGMENT_NZ_NC$ + PATH_ABEMPTY$),
        //simplified
    PATH_ROOTLESS$ = subexp(SEGMENT_NZ$ + PATH_ABEMPTY$),
        //simplified
    PATH_EMPTY$ = "(?!" + PCHAR$ + ")",
        PATH$ = subexp(PATH_ABEMPTY$ + "|" + PATH_ABSOLUTE$ + "|" + PATH_NOSCHEME$ + "|" + PATH_ROOTLESS$ + "|" + PATH_EMPTY$),
        QUERY$ = subexp(subexp(PCHAR$ + "|" + merge("[\\/\\?]", IPRIVATE$$)) + "*"),
        FRAGMENT$ = subexp(subexp(PCHAR$ + "|[\\/\\?]") + "*"),
        HIER_PART$ = subexp(subexp("\\/\\/" + AUTHORITY$ + PATH_ABEMPTY$) + "|" + PATH_ABSOLUTE$ + "|" + PATH_ROOTLESS$ + "|" + PATH_EMPTY$),
        URI$ = subexp(SCHEME$ + "\\:" + HIER_PART$ + subexp("\\?" + QUERY$) + "?" + subexp("\\#" + FRAGMENT$) + "?"),
        RELATIVE_PART$ = subexp(subexp("\\/\\/" + AUTHORITY$ + PATH_ABEMPTY$) + "|" + PATH_ABSOLUTE$ + "|" + PATH_NOSCHEME$ + "|" + PATH_EMPTY$),
        RELATIVE$ = subexp(RELATIVE_PART$ + subexp("\\?" + QUERY$) + "?" + subexp("\\#" + FRAGMENT$) + "?"),
        URI_REFERENCE$ = subexp(URI$ + "|" + RELATIVE$),
        ABSOLUTE_URI$ = subexp(SCHEME$ + "\\:" + HIER_PART$ + subexp("\\?" + QUERY$) + "?"),
        GENERIC_REF$ = "^(" + SCHEME$ + ")\\:" + subexp(subexp("\\/\\/(" + subexp("(" + USERINFO$ + ")@") + "?(" + HOST$ + ")" + subexp("\\:(" + PORT$ + ")") + "?)") + "?(" + PATH_ABEMPTY$ + "|" + PATH_ABSOLUTE$ + "|" + PATH_ROOTLESS$ + "|" + PATH_EMPTY$ + ")") + subexp("\\?(" + QUERY$ + ")") + "?" + subexp("\\#(" + FRAGMENT$ + ")") + "?$",
        RELATIVE_REF$ = "^(){0}" + subexp(subexp("\\/\\/(" + subexp("(" + USERINFO$ + ")@") + "?(" + HOST$ + ")" + subexp("\\:(" + PORT$ + ")") + "?)") + "?(" + PATH_ABEMPTY$ + "|" + PATH_ABSOLUTE$ + "|" + PATH_NOSCHEME$ + "|" + PATH_EMPTY$ + ")") + subexp("\\?(" + QUERY$ + ")") + "?" + subexp("\\#(" + FRAGMENT$ + ")") + "?$",
        ABSOLUTE_REF$ = "^(" + SCHEME$ + ")\\:" + subexp(subexp("\\/\\/(" + subexp("(" + USERINFO$ + ")@") + "?(" + HOST$ + ")" + subexp("\\:(" + PORT$ + ")") + "?)") + "?(" + PATH_ABEMPTY$ + "|" + PATH_ABSOLUTE$ + "|" + PATH_ROOTLESS$ + "|" + PATH_EMPTY$ + ")") + subexp("\\?(" + QUERY$ + ")") + "?$",
        SAMEDOC_REF$ = "^" + subexp("\\#(" + FRAGMENT$ + ")") + "?$",
        AUTHORITY_REF$ = "^" + subexp("(" + USERINFO$ + ")@") + "?(" + HOST$ + ")" + subexp("\\:(" + PORT$ + ")") + "?$";
    return {
        NOT_SCHEME: new RegExp(merge("[^]", ALPHA$$, DIGIT$$, "[\\+\\-\\.]"), "g"),
        NOT_USERINFO: new RegExp(merge("[^\\%\\:]", UNRESERVED$$, SUB_DELIMS$$), "g"),
        NOT_HOST: new RegExp(merge("[^\\%\\[\\]\\:]", UNRESERVED$$, SUB_DELIMS$$), "g"),
        NOT_PATH: new RegExp(merge("[^\\%\\/\\:\\@]", UNRESERVED$$, SUB_DELIMS$$), "g"),
        NOT_PATH_NOSCHEME: new RegExp(merge("[^\\%\\/\\@]", UNRESERVED$$, SUB_DELIMS$$), "g"),
        NOT_QUERY: new RegExp(merge("[^\\%]", UNRESERVED$$, SUB_DELIMS$$, "[\\:\\@\\/\\?]", IPRIVATE$$), "g"),
        NOT_FRAGMENT: new RegExp(merge("[^\\%]", UNRESERVED$$, SUB_DELIMS$$, "[\\:\\@\\/\\?]"), "g"),
        ESCAPE: new RegExp(merge("[^]", UNRESERVED$$, SUB_DELIMS$$), "g"),
        UNRESERVED: new RegExp(UNRESERVED$$, "g"),
        OTHER_CHARS: new RegExp(merge("[^\\%]", UNRESERVED$$, RESERVED$$), "g"),
        PCT_ENCODED: new RegExp(PCT_ENCODED$, "g"),
        IPV4ADDRESS: new RegExp("^(" + IPV4ADDRESS$ + ")$"),
        IPV6ADDRESS: new RegExp("^\\[?(" + IPV6ADDRESS$ + ")" + subexp(subexp("\\%25|\\%(?!" + HEXDIG$$ + "{2})") + "(" + ZONEID$ + ")") + "?\\]?$") //RFC 6874, with relaxed parsing rules
    };
}
var URI_PROTOCOL = buildExps(false);

var IRI_PROTOCOL = buildExps(true);

var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();













var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

/** Highest positive signed 32-bit float value */

var maxInt = 2147483647; // aka. 0x7FFFFFFF or 2^31-1

/** Bootstring parameters */
var base = 36;
var tMin = 1;
var tMax = 26;
var skew = 38;
var damp = 700;
var initialBias = 72;
var initialN = 128; // 0x80
var delimiter = '-'; // '\x2D'

/** Regular expressions */
var regexPunycode = /^xn--/;
var regexNonASCII = /[^\0-\x7E]/; // non-ASCII chars
var regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g; // RFC 3490 separators

/** Error messages */
var errors = {
	'overflow': 'Overflow: input needs wider integers to process',
	'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
	'invalid-input': 'Invalid input'
};

/** Convenience shortcuts */
var baseMinusTMin = base - tMin;
var floor = Math.floor;
var stringFromCharCode = String.fromCharCode;

/*--------------------------------------------------------------------------*/

/**
 * A generic error utility function.
 * @private
 * @param {String} type The error type.
 * @returns {Error} Throws a `RangeError` with the applicable error message.
 */
function error$1(type) {
	throw new RangeError(errors[type]);
}

/**
 * A generic `Array#map` utility function.
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} callback The function that gets called for every array
 * item.
 * @returns {Array} A new array of values returned by the callback function.
 */
function map(array, fn) {
	var result = [];
	var length = array.length;
	while (length--) {
		result[length] = fn(array[length]);
	}
	return result;
}

/**
 * A simple `Array#map`-like wrapper to work with domain name strings or email
 * addresses.
 * @private
 * @param {String} domain The domain name or email address.
 * @param {Function} callback The function that gets called for every
 * character.
 * @returns {Array} A new string of characters returned by the callback
 * function.
 */
function mapDomain(string, fn) {
	var parts = string.split('@');
	var result = '';
	if (parts.length > 1) {
		// In email addresses, only the domain name should be punycoded. Leave
		// the local part (i.e. everything up to `@`) intact.
		result = parts[0] + '@';
		string = parts[1];
	}
	// Avoid `split(regex)` for IE8 compatibility. See #17.
	string = string.replace(regexSeparators, '\x2E');
	var labels = string.split('.');
	var encoded = map(labels, fn).join('.');
	return result + encoded;
}

/**
 * Creates an array containing the numeric code points of each Unicode
 * character in the string. While JavaScript uses UCS-2 internally,
 * this function will convert a pair of surrogate halves (each of which
 * UCS-2 exposes as separate characters) into a single code point,
 * matching UTF-16.
 * @see `punycode.ucs2.encode`
 * @see <https://mathiasbynens.be/notes/javascript-encoding>
 * @memberOf punycode.ucs2
 * @name decode
 * @param {String} string The Unicode input string (UCS-2).
 * @returns {Array} The new array of code points.
 */
function ucs2decode(string) {
	var output = [];
	var counter = 0;
	var length = string.length;
	while (counter < length) {
		var value = string.charCodeAt(counter++);
		if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
			// It's a high surrogate, and there is a next character.
			var extra = string.charCodeAt(counter++);
			if ((extra & 0xFC00) == 0xDC00) {
				// Low surrogate.
				output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
			} else {
				// It's an unmatched surrogate; only append this code unit, in case the
				// next code unit is the high surrogate of a surrogate pair.
				output.push(value);
				counter--;
			}
		} else {
			output.push(value);
		}
	}
	return output;
}

/**
 * Creates a string based on an array of numeric code points.
 * @see `punycode.ucs2.decode`
 * @memberOf punycode.ucs2
 * @name encode
 * @param {Array} codePoints The array of numeric code points.
 * @returns {String} The new Unicode string (UCS-2).
 */
var ucs2encode = function ucs2encode(array) {
	return String.fromCodePoint.apply(String, toConsumableArray(array));
};

/**
 * Converts a basic code point into a digit/integer.
 * @see `digitToBasic()`
 * @private
 * @param {Number} codePoint The basic numeric code point value.
 * @returns {Number} The numeric value of a basic code point (for use in
 * representing integers) in the range `0` to `base - 1`, or `base` if
 * the code point does not represent a value.
 */
var basicToDigit = function basicToDigit(codePoint) {
	if (codePoint - 0x30 < 0x0A) {
		return codePoint - 0x16;
	}
	if (codePoint - 0x41 < 0x1A) {
		return codePoint - 0x41;
	}
	if (codePoint - 0x61 < 0x1A) {
		return codePoint - 0x61;
	}
	return base;
};

/**
 * Converts a digit/integer into a basic code point.
 * @see `basicToDigit()`
 * @private
 * @param {Number} digit The numeric value of a basic code point.
 * @returns {Number} The basic code point whose value (when used for
 * representing integers) is `digit`, which needs to be in the range
 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
 * used; else, the lowercase form is used. The behavior is undefined
 * if `flag` is non-zero and `digit` has no uppercase form.
 */
var digitToBasic = function digitToBasic(digit, flag) {
	//  0..25 map to ASCII a..z or A..Z
	// 26..35 map to ASCII 0..9
	return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
};

/**
 * Bias adaptation function as per section 3.4 of RFC 3492.
 * https://tools.ietf.org/html/rfc3492#section-3.4
 * @private
 */
var adapt = function adapt(delta, numPoints, firstTime) {
	var k = 0;
	delta = firstTime ? floor(delta / damp) : delta >> 1;
	delta += floor(delta / numPoints);
	for (; /* no initialization */delta > baseMinusTMin * tMax >> 1; k += base) {
		delta = floor(delta / baseMinusTMin);
	}
	return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
};

/**
 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
 * symbols.
 * @memberOf punycode
 * @param {String} input The Punycode string of ASCII-only symbols.
 * @returns {String} The resulting string of Unicode symbols.
 */
var decode = function decode(input) {
	// Don't use UCS-2.
	var output = [];
	var inputLength = input.length;
	var i = 0;
	var n = initialN;
	var bias = initialBias;

	// Handle the basic code points: let `basic` be the number of input code
	// points before the last delimiter, or `0` if there is none, then copy
	// the first basic code points to the output.

	var basic = input.lastIndexOf(delimiter);
	if (basic < 0) {
		basic = 0;
	}

	for (var j = 0; j < basic; ++j) {
		// if it's not a basic code point
		if (input.charCodeAt(j) >= 0x80) {
			error$1('not-basic');
		}
		output.push(input.charCodeAt(j));
	}

	// Main decoding loop: start just after the last delimiter if any basic code
	// points were copied; start at the beginning otherwise.

	for (var index = basic > 0 ? basic + 1 : 0; index < inputLength;) /* no final expression */{

		// `index` is the index of the next character to be consumed.
		// Decode a generalized variable-length integer into `delta`,
		// which gets added to `i`. The overflow checking is easier
		// if we increase `i` as we go, then subtract off its starting
		// value at the end to obtain `delta`.
		var oldi = i;
		for (var w = 1, k = base;; /* no condition */k += base) {

			if (index >= inputLength) {
				error$1('invalid-input');
			}

			var digit = basicToDigit(input.charCodeAt(index++));

			if (digit >= base || digit > floor((maxInt - i) / w)) {
				error$1('overflow');
			}

			i += digit * w;
			var t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;

			if (digit < t) {
				break;
			}

			var baseMinusT = base - t;
			if (w > floor(maxInt / baseMinusT)) {
				error$1('overflow');
			}

			w *= baseMinusT;
		}

		var out = output.length + 1;
		bias = adapt(i - oldi, out, oldi == 0);

		// `i` was supposed to wrap around from `out` to `0`,
		// incrementing `n` each time, so we'll fix that now:
		if (floor(i / out) > maxInt - n) {
			error$1('overflow');
		}

		n += floor(i / out);
		i %= out;

		// Insert `n` at position `i` of the output.
		output.splice(i++, 0, n);
	}

	return String.fromCodePoint.apply(String, output);
};

/**
 * Converts a string of Unicode symbols (e.g. a domain name label) to a
 * Punycode string of ASCII-only symbols.
 * @memberOf punycode
 * @param {String} input The string of Unicode symbols.
 * @returns {String} The resulting Punycode string of ASCII-only symbols.
 */
var encode = function encode(input) {
	var output = [];

	// Convert the input in UCS-2 to an array of Unicode code points.
	input = ucs2decode(input);

	// Cache the length.
	var inputLength = input.length;

	// Initialize the state.
	var n = initialN;
	var delta = 0;
	var bias = initialBias;

	// Handle the basic code points.
	var _iteratorNormalCompletion = true;
	var _didIteratorError = false;
	var _iteratorError = undefined;

	try {
		for (var _iterator = input[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			var _currentValue2 = _step.value;

			if (_currentValue2 < 0x80) {
				output.push(stringFromCharCode(_currentValue2));
			}
		}
	} catch (err) {
		_didIteratorError = true;
		_iteratorError = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion && _iterator.return) {
				_iterator.return();
			}
		} finally {
			if (_didIteratorError) {
				throw _iteratorError;
			}
		}
	}

	var basicLength = output.length;
	var handledCPCount = basicLength;

	// `handledCPCount` is the number of code points that have been handled;
	// `basicLength` is the number of basic code points.

	// Finish the basic string with a delimiter unless it's empty.
	if (basicLength) {
		output.push(delimiter);
	}

	// Main encoding loop:
	while (handledCPCount < inputLength) {

		// All non-basic code points < n have been handled already. Find the next
		// larger one:
		var m = maxInt;
		var _iteratorNormalCompletion2 = true;
		var _didIteratorError2 = false;
		var _iteratorError2 = undefined;

		try {
			for (var _iterator2 = input[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
				var currentValue = _step2.value;

				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow.
		} catch (err) {
			_didIteratorError2 = true;
			_iteratorError2 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion2 && _iterator2.return) {
					_iterator2.return();
				}
			} finally {
				if (_didIteratorError2) {
					throw _iteratorError2;
				}
			}
		}

		var handledCPCountPlusOne = handledCPCount + 1;
		if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
			error$1('overflow');
		}

		delta += (m - n) * handledCPCountPlusOne;
		n = m;

		var _iteratorNormalCompletion3 = true;
		var _didIteratorError3 = false;
		var _iteratorError3 = undefined;

		try {
			for (var _iterator3 = input[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
				var _currentValue = _step3.value;

				if (_currentValue < n && ++delta > maxInt) {
					error$1('overflow');
				}
				if (_currentValue == n) {
					// Represent delta as a generalized variable-length integer.
					var q = delta;
					for (var k = base;; /* no condition */k += base) {
						var t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
						if (q < t) {
							break;
						}
						var qMinusT = q - t;
						var baseMinusT = base - t;
						output.push(stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0)));
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}
		} catch (err) {
			_didIteratorError3 = true;
			_iteratorError3 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion3 && _iterator3.return) {
					_iterator3.return();
				}
			} finally {
				if (_didIteratorError3) {
					throw _iteratorError3;
				}
			}
		}

		++delta;
		++n;
	}
	return output.join('');
};

/**
 * Converts a Punycode string representing a domain name or an email address
 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
 * it doesn't matter if you call it on a string that has already been
 * converted to Unicode.
 * @memberOf punycode
 * @param {String} input The Punycoded domain name or email address to
 * convert to Unicode.
 * @returns {String} The Unicode representation of the given Punycode
 * string.
 */
var toUnicode = function toUnicode(input) {
	return mapDomain(input, function (string) {
		return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
	});
};

/**
 * Converts a Unicode string representing a domain name or an email address to
 * Punycode. Only the non-ASCII parts of the domain name will be converted,
 * i.e. it doesn't matter if you call it with a domain that's already in
 * ASCII.
 * @memberOf punycode
 * @param {String} input The domain name or email address to convert, as a
 * Unicode string.
 * @returns {String} The Punycode representation of the given domain name or
 * email address.
 */
var toASCII = function toASCII(input) {
	return mapDomain(input, function (string) {
		return regexNonASCII.test(string) ? 'xn--' + encode(string) : string;
	});
};

/*--------------------------------------------------------------------------*/

/** Define the public API */
var punycode = {
	/**
  * A string representing the current Punycode.js version number.
  * @memberOf punycode
  * @type String
  */
	'version': '2.1.0',
	/**
  * An object of methods to convert from JavaScript's internal character
  * representation (UCS-2) to Unicode code points, and back.
  * @see <https://mathiasbynens.be/notes/javascript-encoding>
  * @memberOf punycode
  * @type Object
  */
	'ucs2': {
		'decode': ucs2decode,
		'encode': ucs2encode
	},
	'decode': decode,
	'encode': encode,
	'toASCII': toASCII,
	'toUnicode': toUnicode
};

/**
 * URI.js
 *
 * @fileoverview An RFC 3986 compliant, scheme extendable URI parsing/validating/resolving library for JavaScript.
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/uri-js
 */
/**
 * Copyright 2011 Gary Court. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 *
 *    1. Redistributions of source code must retain the above copyright notice, this list of
 *       conditions and the following disclaimer.
 *
 *    2. Redistributions in binary form must reproduce the above copyright notice, this list
 *       of conditions and the following disclaimer in the documentation and/or other materials
 *       provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GARY COURT ``AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GARY COURT OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * The views and conclusions contained in the software and documentation are those of the
 * authors and should not be interpreted as representing official policies, either expressed
 * or implied, of Gary Court.
 */
var SCHEMES = {};
function pctEncChar(chr) {
    var c = chr.charCodeAt(0);
    var e = void 0;
    if (c < 16) e = "%0" + c.toString(16).toUpperCase();else if (c < 128) e = "%" + c.toString(16).toUpperCase();else if (c < 2048) e = "%" + (c >> 6 | 192).toString(16).toUpperCase() + "%" + (c & 63 | 128).toString(16).toUpperCase();else e = "%" + (c >> 12 | 224).toString(16).toUpperCase() + "%" + (c >> 6 & 63 | 128).toString(16).toUpperCase() + "%" + (c & 63 | 128).toString(16).toUpperCase();
    return e;
}
function pctDecChars(str) {
    var newStr = "";
    var i = 0;
    var il = str.length;
    while (i < il) {
        var c = parseInt(str.substr(i + 1, 2), 16);
        if (c < 128) {
            newStr += String.fromCharCode(c);
            i += 3;
        } else if (c >= 194 && c < 224) {
            if (il - i >= 6) {
                var c2 = parseInt(str.substr(i + 4, 2), 16);
                newStr += String.fromCharCode((c & 31) << 6 | c2 & 63);
            } else {
                newStr += str.substr(i, 6);
            }
            i += 6;
        } else if (c >= 224) {
            if (il - i >= 9) {
                var _c = parseInt(str.substr(i + 4, 2), 16);
                var c3 = parseInt(str.substr(i + 7, 2), 16);
                newStr += String.fromCharCode((c & 15) << 12 | (_c & 63) << 6 | c3 & 63);
            } else {
                newStr += str.substr(i, 9);
            }
            i += 9;
        } else {
            newStr += str.substr(i, 3);
            i += 3;
        }
    }
    return newStr;
}
function _normalizeComponentEncoding(components, protocol) {
    function decodeUnreserved(str) {
        var decStr = pctDecChars(str);
        return !decStr.match(protocol.UNRESERVED) ? str : decStr;
    }
    if (components.scheme) components.scheme = String(components.scheme).replace(protocol.PCT_ENCODED, decodeUnreserved).toLowerCase().replace(protocol.NOT_SCHEME, "");
    if (components.userinfo !== undefined) components.userinfo = String(components.userinfo).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(protocol.NOT_USERINFO, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
    if (components.host !== undefined) components.host = String(components.host).replace(protocol.PCT_ENCODED, decodeUnreserved).toLowerCase().replace(protocol.NOT_HOST, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
    if (components.path !== undefined) components.path = String(components.path).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(components.scheme ? protocol.NOT_PATH : protocol.NOT_PATH_NOSCHEME, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
    if (components.query !== undefined) components.query = String(components.query).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(protocol.NOT_QUERY, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
    if (components.fragment !== undefined) components.fragment = String(components.fragment).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(protocol.NOT_FRAGMENT, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
    return components;
}

function _stripLeadingZeros(str) {
    return str.replace(/^0*(.*)/, "$1") || "0";
}
function _normalizeIPv4(host, protocol) {
    var matches = host.match(protocol.IPV4ADDRESS) || [];

    var _matches = slicedToArray(matches, 2),
        address = _matches[1];

    if (address) {
        return address.split(".").map(_stripLeadingZeros).join(".");
    } else {
        return host;
    }
}
function _normalizeIPv6(host, protocol) {
    var matches = host.match(protocol.IPV6ADDRESS) || [];

    var _matches2 = slicedToArray(matches, 3),
        address = _matches2[1],
        zone = _matches2[2];

    if (address) {
        var _address$toLowerCase$ = address.toLowerCase().split('::').reverse(),
            _address$toLowerCase$2 = slicedToArray(_address$toLowerCase$, 2),
            last = _address$toLowerCase$2[0],
            first = _address$toLowerCase$2[1];

        var firstFields = first ? first.split(":").map(_stripLeadingZeros) : [];
        var lastFields = last.split(":").map(_stripLeadingZeros);
        var isLastFieldIPv4Address = protocol.IPV4ADDRESS.test(lastFields[lastFields.length - 1]);
        var fieldCount = isLastFieldIPv4Address ? 7 : 8;
        var lastFieldsStart = lastFields.length - fieldCount;
        var fields = Array(fieldCount);
        for (var x = 0; x < fieldCount; ++x) {
            fields[x] = firstFields[x] || lastFields[lastFieldsStart + x] || '';
        }
        if (isLastFieldIPv4Address) {
            fields[fieldCount - 1] = _normalizeIPv4(fields[fieldCount - 1], protocol);
        }
        var allZeroFields = fields.reduce(function (acc, field, index) {
            if (!field || field === "0") {
                var lastLongest = acc[acc.length - 1];
                if (lastLongest && lastLongest.index + lastLongest.length === index) {
                    lastLongest.length++;
                } else {
                    acc.push({ index: index, length: 1 });
                }
            }
            return acc;
        }, []);
        var longestZeroFields = allZeroFields.sort(function (a, b) {
            return b.length - a.length;
        })[0];
        var newHost = void 0;
        if (longestZeroFields && longestZeroFields.length > 1) {
            var newFirst = fields.slice(0, longestZeroFields.index);
            var newLast = fields.slice(longestZeroFields.index + longestZeroFields.length);
            newHost = newFirst.join(":") + "::" + newLast.join(":");
        } else {
            newHost = fields.join(":");
        }
        if (zone) {
            newHost += "%" + zone;
        }
        return newHost;
    } else {
        return host;
    }
}
var URI_PARSE = /^(?:([^:\/?#]+):)?(?:\/\/((?:([^\/?#@]*)@)?(\[[^\/?#\]]+\]|[^\/?#:]*)(?:\:(\d*))?))?([^?#]*)(?:\?([^#]*))?(?:#((?:.|\n|\r)*))?/i;
var NO_MATCH_IS_UNDEFINED = "".match(/(){0}/)[1] === undefined;
function parse(uriString) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var components = {};
    var protocol = options.iri !== false ? IRI_PROTOCOL : URI_PROTOCOL;
    if (options.reference === "suffix") uriString = (options.scheme ? options.scheme + ":" : "") + "//" + uriString;
    var matches = uriString.match(URI_PARSE);
    if (matches) {
        if (NO_MATCH_IS_UNDEFINED) {
            //store each component
            components.scheme = matches[1];
            components.userinfo = matches[3];
            components.host = matches[4];
            components.port = parseInt(matches[5], 10);
            components.path = matches[6] || "";
            components.query = matches[7];
            components.fragment = matches[8];
            //fix port number
            if (isNaN(components.port)) {
                components.port = matches[5];
            }
        } else {
            //IE FIX for improper RegExp matching
            //store each component
            components.scheme = matches[1] || undefined;
            components.userinfo = uriString.indexOf("@") !== -1 ? matches[3] : undefined;
            components.host = uriString.indexOf("//") !== -1 ? matches[4] : undefined;
            components.port = parseInt(matches[5], 10);
            components.path = matches[6] || "";
            components.query = uriString.indexOf("?") !== -1 ? matches[7] : undefined;
            components.fragment = uriString.indexOf("#") !== -1 ? matches[8] : undefined;
            //fix port number
            if (isNaN(components.port)) {
                components.port = uriString.match(/\/\/(?:.|\n)*\:(?:\/|\?|\#|$)/) ? matches[4] : undefined;
            }
        }
        if (components.host) {
            //normalize IP hosts
            components.host = _normalizeIPv6(_normalizeIPv4(components.host, protocol), protocol);
        }
        //determine reference type
        if (components.scheme === undefined && components.userinfo === undefined && components.host === undefined && components.port === undefined && !components.path && components.query === undefined) {
            components.reference = "same-document";
        } else if (components.scheme === undefined) {
            components.reference = "relative";
        } else if (components.fragment === undefined) {
            components.reference = "absolute";
        } else {
            components.reference = "uri";
        }
        //check for reference errors
        if (options.reference && options.reference !== "suffix" && options.reference !== components.reference) {
            components.error = components.error || "URI is not a " + options.reference + " reference.";
        }
        //find scheme handler
        var schemeHandler = SCHEMES[(options.scheme || components.scheme || "").toLowerCase()];
        //check if scheme can't handle IRIs
        if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
            //if host component is a domain name
            if (components.host && (options.domainHost || schemeHandler && schemeHandler.domainHost)) {
                //convert Unicode IDN -> ASCII IDN
                try {
                    components.host = punycode.toASCII(components.host.replace(protocol.PCT_ENCODED, pctDecChars).toLowerCase());
                } catch (e) {
                    components.error = components.error || "Host's domain name can not be converted to ASCII via punycode: " + e;
                }
            }
            //convert IRI -> URI
            _normalizeComponentEncoding(components, URI_PROTOCOL);
        } else {
            //normalize encodings
            _normalizeComponentEncoding(components, protocol);
        }
        //perform scheme specific parsing
        if (schemeHandler && schemeHandler.parse) {
            schemeHandler.parse(components, options);
        }
    } else {
        components.error = components.error || "URI can not be parsed.";
    }
    return components;
}

function _recomposeAuthority(components, options) {
    var protocol = options.iri !== false ? IRI_PROTOCOL : URI_PROTOCOL;
    var uriTokens = [];
    if (components.userinfo !== undefined) {
        uriTokens.push(components.userinfo);
        uriTokens.push("@");
    }
    if (components.host !== undefined) {
        //normalize IP hosts, add brackets and escape zone separator for IPv6
        uriTokens.push(_normalizeIPv6(_normalizeIPv4(String(components.host), protocol), protocol).replace(protocol.IPV6ADDRESS, function (_, $1, $2) {
            return "[" + $1 + ($2 ? "%25" + $2 : "") + "]";
        }));
    }
    if (typeof components.port === "number" || typeof components.port === "string") {
        uriTokens.push(":");
        uriTokens.push(String(components.port));
    }
    return uriTokens.length ? uriTokens.join("") : undefined;
}

var RDS1 = /^\.\.?\//;
var RDS2 = /^\/\.(\/|$)/;
var RDS3 = /^\/\.\.(\/|$)/;
var RDS5 = /^\/?(?:.|\n)*?(?=\/|$)/;
function removeDotSegments(input) {
    var output = [];
    while (input.length) {
        if (input.match(RDS1)) {
            input = input.replace(RDS1, "");
        } else if (input.match(RDS2)) {
            input = input.replace(RDS2, "/");
        } else if (input.match(RDS3)) {
            input = input.replace(RDS3, "/");
            output.pop();
        } else if (input === "." || input === "..") {
            input = "";
        } else {
            var im = input.match(RDS5);
            if (im) {
                var s = im[0];
                input = input.slice(s.length);
                output.push(s);
            } else {
                throw new Error("Unexpected dot segment condition");
            }
        }
    }
    return output.join("");
}

function serialize(components) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var protocol = options.iri ? IRI_PROTOCOL : URI_PROTOCOL;
    var uriTokens = [];
    //find scheme handler
    var schemeHandler = SCHEMES[(options.scheme || components.scheme || "").toLowerCase()];
    //perform scheme specific serialization
    if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(components, options);
    if (components.host) {
        //if host component is an IPv6 address
        if (protocol.IPV6ADDRESS.test(components.host)) {}
        //TODO: normalize IPv6 address as per RFC 5952

        //if host component is a domain name
        else if (options.domainHost || schemeHandler && schemeHandler.domainHost) {
                //convert IDN via punycode
                try {
                    components.host = !options.iri ? punycode.toASCII(components.host.replace(protocol.PCT_ENCODED, pctDecChars).toLowerCase()) : punycode.toUnicode(components.host);
                } catch (e) {
                    components.error = components.error || "Host's domain name can not be converted to " + (!options.iri ? "ASCII" : "Unicode") + " via punycode: " + e;
                }
            }
    }
    //normalize encoding
    _normalizeComponentEncoding(components, protocol);
    if (options.reference !== "suffix" && components.scheme) {
        uriTokens.push(components.scheme);
        uriTokens.push(":");
    }
    var authority = _recomposeAuthority(components, options);
    if (authority !== undefined) {
        if (options.reference !== "suffix") {
            uriTokens.push("//");
        }
        uriTokens.push(authority);
        if (components.path && components.path.charAt(0) !== "/") {
            uriTokens.push("/");
        }
    }
    if (components.path !== undefined) {
        var s = components.path;
        if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
            s = removeDotSegments(s);
        }
        if (authority === undefined) {
            s = s.replace(/^\/\//, "/%2F"); //don't allow the path to start with "//"
        }
        uriTokens.push(s);
    }
    if (components.query !== undefined) {
        uriTokens.push("?");
        uriTokens.push(components.query);
    }
    if (components.fragment !== undefined) {
        uriTokens.push("#");
        uriTokens.push(components.fragment);
    }
    return uriTokens.join(""); //merge tokens into a string
}

function resolveComponents(base, relative) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var skipNormalization = arguments[3];

    var target = {};
    if (!skipNormalization) {
        base = parse(serialize(base, options), options); //normalize base components
        relative = parse(serialize(relative, options), options); //normalize relative components
    }
    options = options || {};
    if (!options.tolerant && relative.scheme) {
        target.scheme = relative.scheme;
        //target.authority = relative.authority;
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || "");
        target.query = relative.query;
    } else {
        if (relative.userinfo !== undefined || relative.host !== undefined || relative.port !== undefined) {
            //target.authority = relative.authority;
            target.userinfo = relative.userinfo;
            target.host = relative.host;
            target.port = relative.port;
            target.path = removeDotSegments(relative.path || "");
            target.query = relative.query;
        } else {
            if (!relative.path) {
                target.path = base.path;
                if (relative.query !== undefined) {
                    target.query = relative.query;
                } else {
                    target.query = base.query;
                }
            } else {
                if (relative.path.charAt(0) === "/") {
                    target.path = removeDotSegments(relative.path);
                } else {
                    if ((base.userinfo !== undefined || base.host !== undefined || base.port !== undefined) && !base.path) {
                        target.path = "/" + relative.path;
                    } else if (!base.path) {
                        target.path = relative.path;
                    } else {
                        target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
                    }
                    target.path = removeDotSegments(target.path);
                }
                target.query = relative.query;
            }
            //target.authority = base.authority;
            target.userinfo = base.userinfo;
            target.host = base.host;
            target.port = base.port;
        }
        target.scheme = base.scheme;
    }
    target.fragment = relative.fragment;
    return target;
}

function resolve(baseURI, relativeURI, options) {
    var schemelessOptions = assign({ scheme: 'null' }, options);
    return serialize(resolveComponents(parse(baseURI, schemelessOptions), parse(relativeURI, schemelessOptions), schemelessOptions, true), schemelessOptions);
}

function normalize(uri, options) {
    if (typeof uri === "string") {
        uri = serialize(parse(uri, options), options);
    } else if (typeOf(uri) === "object") {
        uri = parse(serialize(uri, options), options);
    }
    return uri;
}

function equal(uriA, uriB, options) {
    if (typeof uriA === "string") {
        uriA = serialize(parse(uriA, options), options);
    } else if (typeOf(uriA) === "object") {
        uriA = serialize(uriA, options);
    }
    if (typeof uriB === "string") {
        uriB = serialize(parse(uriB, options), options);
    } else if (typeOf(uriB) === "object") {
        uriB = serialize(uriB, options);
    }
    return uriA === uriB;
}

function escapeComponent(str, options) {
    return str && str.toString().replace(!options || !options.iri ? URI_PROTOCOL.ESCAPE : IRI_PROTOCOL.ESCAPE, pctEncChar);
}

function unescapeComponent(str, options) {
    return str && str.toString().replace(!options || !options.iri ? URI_PROTOCOL.PCT_ENCODED : IRI_PROTOCOL.PCT_ENCODED, pctDecChars);
}

var handler = {
    scheme: "http",
    domainHost: true,
    parse: function parse(components, options) {
        //report missing host
        if (!components.host) {
            components.error = components.error || "HTTP URIs must have a host.";
        }
        return components;
    },
    serialize: function serialize(components, options) {
        var secure = String(components.scheme).toLowerCase() === "https";
        //normalize the default port
        if (components.port === (secure ? 443 : 80) || components.port === "") {
            components.port = undefined;
        }
        //normalize the empty path
        if (!components.path) {
            components.path = "/";
        }
        //NOTE: We do not parse query strings for HTTP URIs
        //as WWW Form Url Encoded query strings are part of the HTML4+ spec,
        //and not the HTTP spec.
        return components;
    }
};

var handler$1 = {
    scheme: "https",
    domainHost: handler.domainHost,
    parse: handler.parse,
    serialize: handler.serialize
};

function isSecure(wsComponents) {
    return typeof wsComponents.secure === 'boolean' ? wsComponents.secure : String(wsComponents.scheme).toLowerCase() === "wss";
}
//RFC 6455
var handler$2 = {
    scheme: "ws",
    domainHost: true,
    parse: function parse(components, options) {
        var wsComponents = components;
        //indicate if the secure flag is set
        wsComponents.secure = isSecure(wsComponents);
        //construct resouce name
        wsComponents.resourceName = (wsComponents.path || '/') + (wsComponents.query ? '?' + wsComponents.query : '');
        wsComponents.path = undefined;
        wsComponents.query = undefined;
        return wsComponents;
    },
    serialize: function serialize(wsComponents, options) {
        //normalize the default port
        if (wsComponents.port === (isSecure(wsComponents) ? 443 : 80) || wsComponents.port === "") {
            wsComponents.port = undefined;
        }
        //ensure scheme matches secure flag
        if (typeof wsComponents.secure === 'boolean') {
            wsComponents.scheme = wsComponents.secure ? 'wss' : 'ws';
            wsComponents.secure = undefined;
        }
        //reconstruct path from resource name
        if (wsComponents.resourceName) {
            var _wsComponents$resourc = wsComponents.resourceName.split('?'),
                _wsComponents$resourc2 = slicedToArray(_wsComponents$resourc, 2),
                path = _wsComponents$resourc2[0],
                query = _wsComponents$resourc2[1];

            wsComponents.path = path && path !== '/' ? path : undefined;
            wsComponents.query = query;
            wsComponents.resourceName = undefined;
        }
        //forbid fragment component
        wsComponents.fragment = undefined;
        return wsComponents;
    }
};

var handler$3 = {
    scheme: "wss",
    domainHost: handler$2.domainHost,
    parse: handler$2.parse,
    serialize: handler$2.serialize
};

var O = {};
var isIRI = true;
//RFC 3986
var UNRESERVED$$ = "[A-Za-z0-9\\-\\.\\_\\~" + (isIRI ? "\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF" : "") + "]";
var HEXDIG$$ = "[0-9A-Fa-f]"; //case-insensitive
var PCT_ENCODED$ = subexp(subexp("%[EFef]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%[89A-Fa-f]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%" + HEXDIG$$ + HEXDIG$$)); //expanded
//RFC 5322, except these symbols as per RFC 6068: @ : / ? # [ ] & ; =
//const ATEXT$$ = "[A-Za-z0-9\\!\\#\\$\\%\\&\\'\\*\\+\\-\\/\\=\\?\\^\\_\\`\\{\\|\\}\\~]";
//const WSP$$ = "[\\x20\\x09]";
//const OBS_QTEXT$$ = "[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]";  //(%d1-8 / %d11-12 / %d14-31 / %d127)
//const QTEXT$$ = merge("[\\x21\\x23-\\x5B\\x5D-\\x7E]", OBS_QTEXT$$);  //%d33 / %d35-91 / %d93-126 / obs-qtext
//const VCHAR$$ = "[\\x21-\\x7E]";
//const WSP$$ = "[\\x20\\x09]";
//const OBS_QP$ = subexp("\\\\" + merge("[\\x00\\x0D\\x0A]", OBS_QTEXT$$));  //%d0 / CR / LF / obs-qtext
//const FWS$ = subexp(subexp(WSP$$ + "*" + "\\x0D\\x0A") + "?" + WSP$$ + "+");
//const QUOTED_PAIR$ = subexp(subexp("\\\\" + subexp(VCHAR$$ + "|" + WSP$$)) + "|" + OBS_QP$);
//const QUOTED_STRING$ = subexp('\\"' + subexp(FWS$ + "?" + QCONTENT$) + "*" + FWS$ + "?" + '\\"');
var ATEXT$$ = "[A-Za-z0-9\\!\\$\\%\\'\\*\\+\\-\\^\\_\\`\\{\\|\\}\\~]";
var QTEXT$$ = "[\\!\\$\\%\\'\\(\\)\\*\\+\\,\\-\\.0-9\\<\\>A-Z\\x5E-\\x7E]";
var VCHAR$$ = merge(QTEXT$$, "[\\\"\\\\]");
var SOME_DELIMS$$ = "[\\!\\$\\'\\(\\)\\*\\+\\,\\;\\:\\@]";
var UNRESERVED = new RegExp(UNRESERVED$$, "g");
var PCT_ENCODED = new RegExp(PCT_ENCODED$, "g");
var NOT_LOCAL_PART = new RegExp(merge("[^]", ATEXT$$, "[\\.]", '[\\"]', VCHAR$$), "g");
var NOT_HFNAME = new RegExp(merge("[^]", UNRESERVED$$, SOME_DELIMS$$), "g");
var NOT_HFVALUE = NOT_HFNAME;
function decodeUnreserved(str) {
    var decStr = pctDecChars(str);
    return !decStr.match(UNRESERVED) ? str : decStr;
}
var handler$4 = {
    scheme: "mailto",
    parse: function parse$$1(components, options) {
        var mailtoComponents = components;
        var to = mailtoComponents.to = mailtoComponents.path ? mailtoComponents.path.split(",") : [];
        mailtoComponents.path = undefined;
        if (mailtoComponents.query) {
            var unknownHeaders = false;
            var headers = {};
            var hfields = mailtoComponents.query.split("&");
            for (var x = 0, xl = hfields.length; x < xl; ++x) {
                var hfield = hfields[x].split("=");
                switch (hfield[0]) {
                    case "to":
                        var toAddrs = hfield[1].split(",");
                        for (var _x = 0, _xl = toAddrs.length; _x < _xl; ++_x) {
                            to.push(toAddrs[_x]);
                        }
                        break;
                    case "subject":
                        mailtoComponents.subject = unescapeComponent(hfield[1], options);
                        break;
                    case "body":
                        mailtoComponents.body = unescapeComponent(hfield[1], options);
                        break;
                    default:
                        unknownHeaders = true;
                        headers[unescapeComponent(hfield[0], options)] = unescapeComponent(hfield[1], options);
                        break;
                }
            }
            if (unknownHeaders) mailtoComponents.headers = headers;
        }
        mailtoComponents.query = undefined;
        for (var _x2 = 0, _xl2 = to.length; _x2 < _xl2; ++_x2) {
            var addr = to[_x2].split("@");
            addr[0] = unescapeComponent(addr[0]);
            if (!options.unicodeSupport) {
                //convert Unicode IDN -> ASCII IDN
                try {
                    addr[1] = punycode.toASCII(unescapeComponent(addr[1], options).toLowerCase());
                } catch (e) {
                    mailtoComponents.error = mailtoComponents.error || "Email address's domain name can not be converted to ASCII via punycode: " + e;
                }
            } else {
                addr[1] = unescapeComponent(addr[1], options).toLowerCase();
            }
            to[_x2] = addr.join("@");
        }
        return mailtoComponents;
    },
    serialize: function serialize$$1(mailtoComponents, options) {
        var components = mailtoComponents;
        var to = toArray(mailtoComponents.to);
        if (to) {
            for (var x = 0, xl = to.length; x < xl; ++x) {
                var toAddr = String(to[x]);
                var atIdx = toAddr.lastIndexOf("@");
                var localPart = toAddr.slice(0, atIdx).replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_LOCAL_PART, pctEncChar);
                var domain = toAddr.slice(atIdx + 1);
                //convert IDN via punycode
                try {
                    domain = !options.iri ? punycode.toASCII(unescapeComponent(domain, options).toLowerCase()) : punycode.toUnicode(domain);
                } catch (e) {
                    components.error = components.error || "Email address's domain name can not be converted to " + (!options.iri ? "ASCII" : "Unicode") + " via punycode: " + e;
                }
                to[x] = localPart + "@" + domain;
            }
            components.path = to.join(",");
        }
        var headers = mailtoComponents.headers = mailtoComponents.headers || {};
        if (mailtoComponents.subject) headers["subject"] = mailtoComponents.subject;
        if (mailtoComponents.body) headers["body"] = mailtoComponents.body;
        var fields = [];
        for (var name in headers) {
            if (headers[name] !== O[name]) {
                fields.push(name.replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_HFNAME, pctEncChar) + "=" + headers[name].replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_HFVALUE, pctEncChar));
            }
        }
        if (fields.length) {
            components.query = fields.join("&");
        }
        return components;
    }
};

var URN_PARSE = /^([^\:]+)\:(.*)/;
//RFC 2141
var handler$5 = {
    scheme: "urn",
    parse: function parse$$1(components, options) {
        var matches = components.path && components.path.match(URN_PARSE);
        var urnComponents = components;
        if (matches) {
            var scheme = options.scheme || urnComponents.scheme || "urn";
            var nid = matches[1].toLowerCase();
            var nss = matches[2];
            var urnScheme = scheme + ":" + (options.nid || nid);
            var schemeHandler = SCHEMES[urnScheme];
            urnComponents.nid = nid;
            urnComponents.nss = nss;
            urnComponents.path = undefined;
            if (schemeHandler) {
                urnComponents = schemeHandler.parse(urnComponents, options);
            }
        } else {
            urnComponents.error = urnComponents.error || "URN can not be parsed.";
        }
        return urnComponents;
    },
    serialize: function serialize$$1(urnComponents, options) {
        var scheme = options.scheme || urnComponents.scheme || "urn";
        var nid = urnComponents.nid;
        var urnScheme = scheme + ":" + (options.nid || nid);
        var schemeHandler = SCHEMES[urnScheme];
        if (schemeHandler) {
            urnComponents = schemeHandler.serialize(urnComponents, options);
        }
        var uriComponents = urnComponents;
        var nss = urnComponents.nss;
        uriComponents.path = (nid || options.nid) + ":" + nss;
        return uriComponents;
    }
};

var UUID = /^[0-9A-Fa-f]{8}(?:\-[0-9A-Fa-f]{4}){3}\-[0-9A-Fa-f]{12}$/;
//RFC 4122
var handler$6 = {
    scheme: "urn:uuid",
    parse: function parse(urnComponents, options) {
        var uuidComponents = urnComponents;
        uuidComponents.uuid = uuidComponents.nss;
        uuidComponents.nss = undefined;
        if (!options.tolerant && (!uuidComponents.uuid || !uuidComponents.uuid.match(UUID))) {
            uuidComponents.error = uuidComponents.error || "UUID is not valid.";
        }
        return uuidComponents;
    },
    serialize: function serialize(uuidComponents, options) {
        var urnComponents = uuidComponents;
        //normalize UUID
        urnComponents.nss = (uuidComponents.uuid || "").toLowerCase();
        return urnComponents;
    }
};

SCHEMES[handler.scheme] = handler;
SCHEMES[handler$1.scheme] = handler$1;
SCHEMES[handler$2.scheme] = handler$2;
SCHEMES[handler$3.scheme] = handler$3;
SCHEMES[handler$4.scheme] = handler$4;
SCHEMES[handler$5.scheme] = handler$5;
SCHEMES[handler$6.scheme] = handler$6;

exports.SCHEMES = SCHEMES;
exports.pctEncChar = pctEncChar;
exports.pctDecChars = pctDecChars;
exports.parse = parse;
exports.removeDotSegments = removeDotSegments;
exports.serialize = serialize;
exports.resolveComponents = resolveComponents;
exports.resolve = resolve;
exports.normalize = normalize;
exports.equal = equal;
exports.escapeComponent = escapeComponent;
exports.unescapeComponent = unescapeComponent;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=uri.all.js.map

}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/uri-js/dist/es5/uri.all.js","/../node_modules/uri-js/dist/es5")
},{"buffer":48,"pBGvAp":53}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9saWIvZmFrZV9jYmFhZGQ1NS5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL2xpYi9tb2RlbHMuanNvbiIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL2xpYi9zY2hlZHVsZS5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL2xpYi90b29scy5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2Fqdi5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2NhY2hlLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS9hc3luYy5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvZXJyb3JfY2xhc3Nlcy5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvZm9ybWF0cy5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvaW5kZXguanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL3Jlc29sdmUuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL3J1bGVzLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS9zY2hlbWFfb2JqLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS91Y3MybGVuZ3RoLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS91dGlsLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZGF0YS5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RlZmluaXRpb25fc2NoZW1hLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvX2xpbWl0LmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvX2xpbWl0SXRlbXMuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9fbGltaXRMZW5ndGguanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9fbGltaXRQcm9wZXJ0aWVzLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvYWxsT2YuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9hbnlPZi5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2NvbW1lbnQuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9jb25zdC5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2NvbnRhaW5zLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvY3VzdG9tLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvZGVwZW5kZW5jaWVzLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvZW51bS5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2Zvcm1hdC5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2lmLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvaW5kZXguanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9pdGVtcy5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL211bHRpcGxlT2YuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9ub3QuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9vbmVPZi5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL3BhdHRlcm4uanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9wcm9wZXJ0aWVzLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvcHJvcGVydHlOYW1lcy5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL3JlZi5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL3JlcXVpcmVkLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvdW5pcXVlSXRlbXMuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy92YWxpZGF0ZS5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2tleXdvcmQuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9yZWZzL2RhdGEuanNvbiIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL3JlZnMvanNvbi1zY2hlbWEtZHJhZnQtMDcuanNvbiIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvZmFzdC1kZWVwLWVxdWFsL2luZGV4LmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Zhc3QtanNvbi1zdGFibGUtc3RyaW5naWZ5L2luZGV4LmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvanNvbi1zY2hlbWEtdHJhdmVyc2UvaW5kZXguanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL3VyaS1qcy9kaXN0L2VzNS91cmkuYWxsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcGVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xud2luZG93LnNjaGVkdWxlID0gcmVxdWlyZSgnLi4vbGliL3NjaGVkdWxlJyk7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL2Zha2VfY2JhYWRkNTUuanNcIixcIi9cIikiLCJtb2R1bGUuZXhwb3J0cz17XG4gICAgXCJzY2hlZHVsZVNjaGVtYVwiOiB7XG4gICAgICAgIFwiJGlkXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3NjaGVkdWxlXCIsXG4gICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1wiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvb25lVGltZVwifSxcbiAgICAgICAgICAgIHtcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL2RhaWx5XCJ9LFxuICAgICAgICAgICAge1wiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvd2Vla2x5XCJ9LFxuICAgICAgICAgICAge1wiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvbW9udGhseVwifVxuICAgICAgICBdLFxuICAgICAgICBcImRlZmluaXRpb25zXCI6IHtcbiAgICAgICAgICAgIFwib25lVGltZVwiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IHtcInR5cGVcIjogXCJzdHJpbmdcIn0sXG4gICAgICAgICAgICAgICAgICAgIFwiZW5hYmxlZFwiOiB7XCJ0eXBlXCI6IFwiYm9vbGVhblwifSxcbiAgICAgICAgICAgICAgICAgICAgXCJvbmVUaW1lXCI6IHtcInR5cGVcIjogXCJzdHJpbmdcIiwgXCJmb3JtYXRcIjogXCJkYXRlLXRpbWVcIn1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFwiYWRkaXRpb25hbFByb3BlcnRpZXNcIjogZmFsc2UsXG4gICAgICAgICAgICAgICAgXCJyZXF1aXJlZFwiOiBbXCJvbmVUaW1lXCJdICBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImRhaWx5XCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgICAgICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjoge1widHlwZVwiOiBcInN0cmluZ1wifSxcbiAgICAgICAgICAgICAgICAgICAgXCJlbmFibGVkXCI6IHtcInR5cGVcIjogXCJib29sZWFuXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcInN0YXJ0RGF0ZVRpbWVcIjoge1widHlwZVwiOiBcInN0cmluZ1wiLCBcImZvcm1hdFwiOiBcImRhdGUtdGltZVwifSxcbiAgICAgICAgICAgICAgICAgICAgXCJlbmREYXRlVGltZVwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCIsIFwiZm9ybWF0XCI6IFwiZGF0ZS10aW1lXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcImVhY2hORGF5XCI6IHtcInR5cGVcIjogXCJpbnRlZ2VyXCIsIFwibWluaW11bVwiOiAxfSxcbiAgICAgICAgICAgICAgICAgICAgXCJkYWlseUZyZXF1ZW5jeVwiOiB7XCIkcmVmXCI6IFwiZGFpbHkjL1wifVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXCJhZGRpdGlvbmFsUHJvcGVydGllc1wiOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBcInJlcXVpcmVkXCI6IFtcInN0YXJ0RGF0ZVRpbWVcIiwgXCJlYWNoTkRheVwiLCBcImRhaWx5RnJlcXVlbmN5XCJdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJ3ZWVrbHlcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcImVuYWJsZWRcIjoge1widHlwZVwiOiBcImJvb2xlYW5cIn0sXG4gICAgICAgICAgICAgICAgICAgIFwic3RhcnREYXRlVGltZVwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCIsIFwiZm9ybWF0XCI6IFwiZGF0ZS10aW1lXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcImVuZERhdGVUaW1lXCI6IHtcInR5cGVcIjogXCJzdHJpbmdcIiwgXCJmb3JtYXRcIjogXCJkYXRlLXRpbWVcIn0sXG4gICAgICAgICAgICAgICAgICAgIFwiZWFjaE5XZWVrXCI6IHtcInR5cGVcIjogXCJpbnRlZ2VyXCIsIFwibWluaW11bVwiOiAxfSxcbiAgICAgICAgICAgICAgICAgICAgXCJkYXlPZldlZWtcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSXRlbXNcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiaXRlbXNcIjogeyBcImVudW1cIjogW1wic3VuXCIsIFwibW9uXCIsIFwidHVlXCIsIFwid2VkXCIsIFwidGh1XCIsIFwiZnJpXCIsIFwic2F0XCJdIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxJdGVtc1wiOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcImRhaWx5RnJlcXVlbmN5XCI6IHtcIiRyZWZcIjogXCJkYWlseSMvXCJ9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIFwicmVxdWlyZWRcIjogW1wic3RhcnREYXRlVGltZVwiLCBcImVhY2hOV2Vla1wiLCBcImRheU9mV2Vla1wiLCBcImRhaWx5RnJlcXVlbmN5XCJdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJtb250aGx5XCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgICAgICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjoge1widHlwZVwiOiBcInN0cmluZ1wifSxcbiAgICAgICAgICAgICAgICAgICAgXCJlbmFibGVkXCI6IHtcInR5cGVcIjogXCJib29sZWFuXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcInN0YXJ0RGF0ZVRpbWVcIjoge1widHlwZVwiOiBcInN0cmluZ1wiLCBcImZvcm1hdFwiOiBcImRhdGUtdGltZVwifSxcbiAgICAgICAgICAgICAgICAgICAgXCJlbmREYXRlVGltZVwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCIsIFwiZm9ybWF0XCI6IFwiZGF0ZS10aW1lXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcIm1vbnRoXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInVuaXF1ZUl0ZW1zXCI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIml0ZW1zXCI6IHsgXCJlbnVtXCI6IFtcImphblwiLCBcImZlYlwiLCBcIm1hclwiLCBcImFwclwiLCBcIm1heVwiLCBcImp1blwiLCBcImp1bFwiLCBcImF1Z1wiLCBcInNlcFwiLCBcIm9jdFwiLCBcIm5vdlwiLCBcImRlY1wiXSB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJhZGRpdGlvbmFsSXRlbXNcIjogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJkYXlcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSXRlbXNcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiaXRlbXNcIjoge1widHlwZVwiOiBcImludGVnZXJcIiwgXCJtaW5pbXVtXCI6IDEsIFwibWF4aW11bVwiOiAzMX0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxJdGVtc1wiOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcImRhaWx5RnJlcXVlbmN5XCI6IHtcIiRyZWZcIjogXCJkYWlseSMvXCJ9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIFwicmVxdWlyZWRcIjogW1wic3RhcnREYXRlVGltZVwiLCBcIm1vbnRoXCIsIFwiZGF5XCIsIFwiZGFpbHlGcmVxdWVuY3lcIl1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbixcbiAgXCJzY2hlZHVsZVNjaGVtYURhaWx5XCI6IHtcbiAgICAgICAgXCIkaWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vZGFpbHlcIixcbiAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9vbmNlXCJ9LFxuICAgICAgICAgICAge1wiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvZXZlcnlcIn1cbiAgICAgICAgXSxcbiAgICAgICAgXCJkZWZpbml0aW9uc1wiOiB7XG4gICAgICAgICAgICBcIm9uY2VcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLCBcbiAgICAgICAgICAgICAgICBcInByb3BlcnRpZXNcIjogeyBcIm9jY3Vyc09uY2VBdFwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCIsIFwiZm9ybWF0XCI6IFwidGltZVwifX0sXG4gICAgICAgICAgICAgICAgXCJhZGRpdGlvbmFsUHJvcGVydGllc1wiOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBcInJlcXVpcmVkXCI6IFtcIm9jY3Vyc09uY2VBdFwiXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZXZlcnlcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLCBcbiAgICAgICAgICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInN0YXJ0XCI6IHtcInR5cGVcIjogXCJzdHJpbmdcIiwgXCJmb3JtYXRcIjogXCJ0aW1lXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcImVuZFwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCIsIFwiZm9ybWF0XCI6IFwidGltZVwifSxcbiAgICAgICAgICAgICAgICAgICAgXCJvY2N1cnNFdmVyeVwiOiB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHsgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJpbnRlcnZhbFZhbHVlXCI6IHtcInR5cGVcIjogXCJpbnRlZ2VyXCIsIFwibWluaW11bVwiOiAxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImludGVydmFsVHlwZVwiOiB7IFwidHlwZVwiOiBcInN0cmluZ1wiLCBcImVudW1cIjogW1wibWludXRlXCIsIFwiaG91clwiXSB9ICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJhZGRpdGlvbmFsUHJvcGVydGllc1wiOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwicmVxdWlyZWRcIjogW1wiaW50ZXJ2YWxWYWx1ZVwiLCBcImludGVydmFsVHlwZVwiXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIFwicmVxdWlyZWRcIjogW1wic3RhcnRcIiwgXCJvY2N1cnNFdmVyeVwiXVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qIGVzbGludC1kaXNhYmxlIG5vLXByb3RvdHlwZS1idWlsdGlucyAqL1xuLy9TY2hlZHVsZSBtYWluIGVuZ2luZVxubGV0IGdldERhdGVUaW1lID0gcmVxdWlyZShcIi4vdG9vbHNcIikuZ2V0RGF0ZVRpbWU7XG5sZXQgYWRkRGF0ZSA9IHJlcXVpcmUoXCIuL3Rvb2xzXCIpLmFkZERhdGU7XG5sZXQgcGFyc2VEYXRlVGltZSA9IHJlcXVpcmUoXCIuL3Rvb2xzXCIpLnBhcnNlRGF0ZVRpbWU7XG5sZXQgZm9ybWF0RGF0ZVRpbWUgPSByZXF1aXJlKFwiLi90b29sc1wiKS5mb3JtYXREYXRlVGltZTtcbmxldCBtb250aExpc3QgPSByZXF1aXJlKFwiLi90b29sc1wiKS5tb250aExpc3Q7XG5sZXQgd2Vla0RheUxpc3QgPSByZXF1aXJlKFwiLi90b29sc1wiKS53ZWVrRGF5TGlzdDtcbmxldCBzY2hlZHVsZU1vZGVsID0gcmVxdWlyZShcIi4vbW9kZWxzLmpzb25cIik7XG52YXIgQWp2ID0gcmVxdWlyZShcImFqdlwiKTtcbmxldCBhanYgPSBuZXcgQWp2KCk7XG5hanYuYWRkU2NoZW1hKHNjaGVkdWxlTW9kZWwuc2NoZWR1bGVTY2hlbWFEYWlseSk7XG5cbi8qKlxuICogQ2FsY3VsYXRlcyBuZXh0IHJ1biB0aW1lIGZvciBhbHJlYWR5IGNhbGN1bGF0ZWQgZGF5XG4gKiBAcGFyYW0ge09iamVjdH0gc2NoZWR1bGUgU2NoZWR1bGUgZm9yIHdoaWNoIG5leHQgcnVuIHRpbWUgc2hvdWxkIGJlIGNhbGN1bGF0ZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBydW5EYXRlIERheSBvZiBuZXh0IHJ1biB3aXRoIDAwOjAwIHRpbWVcbiAqIEByZXR1cm5zIHtPYmplY3R9IE5leHQgcnVuIGRhdGUgYW5kIHRpbWUgb3IgbnVsbCBpbiBjYXNlIGlmIG5leHQgcnVuIHRpbWUgaXMgb3V0IG9mIHJ1bkRhdGUgcmFuZ2UgKGUuZy4gYXR0ZW1wdCB0byBjYWxjdWxhdGUgJ2VhY2ggMTMgaG91cnMnIGF0IDE5OjAwKSBcbiAqIG9yIGFscmVhZHkgaW4gcGFzdCAoZS5nLiBhdHRlbXB0IHRvIGNhbGN1bGF0ZSAnMTE6MDAnIGF0IDExOjA1KVxuICovXG5mdW5jdGlvbiBjYWxjdWxhdGVUaW1lT2ZSdW4oc2NoZWR1bGUsIHJ1bkRhdGUpIHsgIFxuICAvL2FzIHdpdGggc2ltcGxlID0gcmVmIHdpbGwgYmUgY3JlYXRlZCB3ZSBuZWVkIHRvIGNsb25lIERhdGUgb2JqZWN0XG4gIGxldCBydW5EYXRlVGltZSA9IG5ldyBEYXRlKHJ1bkRhdGUpOyAgICBcblxuICBpZihzY2hlZHVsZS5kYWlseUZyZXF1ZW5jeS5oYXNPd25Qcm9wZXJ0eShcIm9jY3Vyc09uY2VBdFwiKSkge1xuICAgIGxldCB0aW1lID0gc2NoZWR1bGUuZGFpbHlGcmVxdWVuY3kub2NjdXJzT25jZUF0LnNwbGl0KFwiOlwiKTtcbiAgICBydW5EYXRlVGltZS5zZXRVVENIb3Vycyh0aW1lWzBdLCB0aW1lWzFdLCB0aW1lWzJdKTsgLy9pdCBzaG91bGQgcHV0IHRpbWUgaW4gVVRDLCBidXQgaXQgcHV0cyBpdCBpbiBsb2NhbCAgICAgICAgXG4gICAgaWYocnVuRGF0ZVRpbWUgPiBnZXREYXRlVGltZSgpICYmIHJ1bkRhdGVUaW1lID49IHBhcnNlRGF0ZVRpbWUoc2NoZWR1bGUuc3RhcnREYXRlVGltZSkpXG4gICAgICByZXR1cm4gcnVuRGF0ZVRpbWU7XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIG51bGw7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgfVxuXG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICAqL1xuICBpZihzY2hlZHVsZS5kYWlseUZyZXF1ZW5jeS5oYXNPd25Qcm9wZXJ0eShcIm9jY3Vyc0V2ZXJ5XCIpKSB7XG5cbiAgICBsZXQgdGltZSA9IHNjaGVkdWxlLmRhaWx5RnJlcXVlbmN5LnN0YXJ0LnNwbGl0KFwiOlwiKTtcbiAgICAvL21pbGxpc2Vjb25kcyBzaG91bGQgYmUgcmVtb3ZlZD9cbiAgICBydW5EYXRlVGltZS5zZXRVVENIb3Vycyh0aW1lWzBdLCB0aW1lWzFdLCB0aW1lWzJdLCAwKTtcbiAgICB3aGlsZShydW5EYXRlVGltZSA8IGdldERhdGVUaW1lKCkpIHtcbiAgICAgIC8vVE9ETyBuaWNlIHRvIGhhdmUgaW50ZXJ2YWwgbGlrZSAwMzozMCAoYm90aCBob3VyIGFuZCBtaW51dGVzKVxuICAgICAgc3dpdGNoKHNjaGVkdWxlLmRhaWx5RnJlcXVlbmN5Lm9jY3Vyc0V2ZXJ5LmludGVydmFsVHlwZSkge1xuICAgICAgY2FzZSBcIm1pbnV0ZVwiOlxuICAgICAgICBydW5EYXRlVGltZSA9IGFkZERhdGUocnVuRGF0ZVRpbWUsIDAsIDAsIDAsIDAsIHNjaGVkdWxlLmRhaWx5RnJlcXVlbmN5Lm9jY3Vyc0V2ZXJ5LmludGVydmFsVmFsdWUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJob3VyXCI6XG4gICAgICAgIHJ1bkRhdGVUaW1lID0gYWRkRGF0ZShydW5EYXRlVGltZSwgMCwgMCwgMCwgc2NoZWR1bGUuZGFpbHlGcmVxdWVuY3kub2NjdXJzRXZlcnkuaW50ZXJ2YWxWYWx1ZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmKHNjaGVkdWxlLmRhaWx5RnJlcXVlbmN5Lmhhc093blByb3BlcnR5KFwiZW5kXCIpKSB7XG4gICAgICBsZXQgc3RhcnRUaW1lID0gc2NoZWR1bGUuZGFpbHlGcmVxdWVuY3kuc3RhcnQuc3BsaXQoXCI6XCIpO1xuICAgICAgbGV0IGVuZFRpbWUgPSBzY2hlZHVsZS5kYWlseUZyZXF1ZW5jeS5lbmQuc3BsaXQoXCI6XCIpO1xuICAgICAgbGV0IGRhaWx5U3RhcnREYXRlVGltZSA9IGFkZERhdGUocnVuRGF0ZSwgMCwgMCwgMCwgc3RhcnRUaW1lWzBdLCBzdGFydFRpbWVbMV0sIHN0YXJ0VGltZVsyXSwgMCk7XG4gICAgICBsZXQgZGFpbHlFbmREYXRlVGltZSA9IGFkZERhdGUocnVuRGF0ZSwgMCwgMCwgMCwgZW5kVGltZVswXSwgZW5kVGltZVsxXSwgZW5kVGltZVsyXSwgMCk7XG4gICAgICAgICAgICBcbiAgICAgIC8vZGFpbHkgc2NoZWR1bGUgc3RhcnQgdGltZSBpcyBsYXRlIG9yIHNhbWUgYXMgZW5kIHRpbWUgT1IgY2FsY3VsYXRlZCB0aW1lIG9mIHJ1biBpcyBsYXRlciB0aGFuIGRhaWx5IHNjaGVkdWxlIGVuZCB0aW1lXG4gICAgICBpZihkYWlseVN0YXJ0RGF0ZVRpbWUgPj0gZGFpbHlFbmREYXRlVGltZSB8fCBydW5EYXRlVGltZSA+PSBkYWlseUVuZERhdGVUaW1lKVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZihydW5EYXRlLmdldFVUQ0RhdGUoKSA9PSBydW5EYXRlVGltZS5nZXRVVENEYXRlKCkpICAgICAgICBcbiAgICAgIHJldHVybiBydW5EYXRlVGltZTsgICBcbiAgICBlbHNlXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgXG4gIH1cbn1cbi8qKlxuICogU2NhbnMgd2VlayB3aGljaCBzdGFydHMgd2l0aCB3ZWVrU3RhcnQgYW5kIHRyaWVzIHRvIGZpbmQgZGF0ZSBmb3IgcnVuXG4gKiBAcGFyYW0ge09iamVjdH0gc2NoZWR1bGUgU2NoZWR1bGUgZm9yIHdoaWNoIG5leHQgcnVuIHRpbWUgc2hvdWxkIGJlIGNhbGN1bGF0ZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSB3ZWVrU3RhcnQgRGF0ZSBvZiBzdW5kYXkgKDAgZGF5IG9mIHdlZWspXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBEYXRlIG9yIG5leHQgcnVuIG9yIG51bGwgaW4gY2FzZSBpZiBkYXRlIHdhcyBub3QgY2FsY3VsYXRlZFxuICovXG5mdW5jdGlvbiBjYWxjdWxhdGVXZWVrRGF5T2ZSdW4oc2NoZWR1bGUsIHdlZWtTdGFydCkge1xuICBsZXQgY3VycmVudERheSA9IHdlZWtTdGFydDtcbiAgbGV0IHdlZWtEYXlMYXN0SW5kZXggPSAwO1xuICAvL3NvcnQgbGlzdCBvZiB3ZWVrIGRheXMgaW4gY29ycmVjdCBvcmRlclxuICBzY2hlZHVsZS5kYXlPZldlZWsgPSBzY2hlZHVsZS5kYXlPZldlZWsuc29ydCgoYSwgYikgPT4gd2Vla0RheUxpc3QuaW5kZXhPZihhKSAtIHdlZWtEYXlMaXN0LmluZGV4T2YoYikpOyAgIFxuICBmb3IgKGxldCBpID0gMDsgaSA8IHNjaGVkdWxlLmRheU9mV2Vlay5sZW5ndGg7IGkrKykge1xuICAgIGxldCB3ZWVrRGF5SW5kZXggPSB3ZWVrRGF5TGlzdC5pbmRleE9mKHNjaGVkdWxlLmRheU9mV2Vla1tpXSk7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgICovXG4gICAgaWYod2Vla0RheUluZGV4ICE9IC0xKSB7XG4gICAgICBjdXJyZW50RGF5ID0gYWRkRGF0ZShjdXJyZW50RGF5LCAwLCAwLCB3ZWVrRGF5SW5kZXggLSB3ZWVrRGF5TGFzdEluZGV4KTtcbiAgICAgIHdlZWtEYXlMYXN0SW5kZXggPSB3ZWVrRGF5SW5kZXg7XG4gICAgICAvL2RheSBjYWxjdWxhdGluZyB0aW1lIGZvdW5kIC0gZG9uJ3QgZ28gbmV4dFxuICAgICAgbGV0IGNhbGN1bGF0aW9uUmVzdWx0ID0gY2FsY3VsYXRlVGltZU9mUnVuKHNjaGVkdWxlLCBjdXJyZW50RGF5KTtcbiAgICAgIGlmKGNhbGN1bGF0aW9uUmVzdWx0KSB7ICAgICAgICAgXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovICAgXG4gICAgICAgIGlmKGNhbGN1bGF0aW9uUmVzdWx0ID4gcGFyc2VEYXRlVGltZShzY2hlZHVsZS5zdGFydERhdGVUaW1lKSlcbiAgICAgICAgICByZXR1cm4gY2FsY3VsYXRpb25SZXN1bHQ7XG4gICAgICAgIGN1cnJlbnREYXkgPSBjYWxjdWxhdGlvblJlc3VsdDtcbiAgICAgIH1cbiAgICB9ICAgICAgICBcbiAgfSAgIFxuICByZXR1cm4gbnVsbDtcbn1cbi8qKlxuICogQHR5cGVkZWYge09iamVjdH0gbmV4dE9jY3VycmVuY2VSZXN1bHRcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSByZXN1bHQgQ2FsY3VsYXRpb24gcmVzdWx0LiBVVEMgZGF0ZSBhbmQgdGltZSBvZiBuZWFyZXN0IG5leHQgb2NjdXJyZW5jZSBvZiBzY2hlZHVsZU9iamVjdCBpbiBJU08gZm9ybWF0IChlLmcuIDIwMTktMDEtMDFUMDE6MDA6MDAuMDAwWilcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlIGluIGNhc2UgbmV4dCBvY2N1cnJlbmNlIGNhbGN1bGF0aW9uIGZhaWxlZFxuICovXG4vKipcbiAqIENhbGN1bGF0ZXMgbmV4dCBydW4gZGF0ZSBhbmQgdGltZSBcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY2hlZHVsZSBTY2hlZHVsZSBmb3Igd2hpY2ggbmV4dCBydW4gZGF0ZSBhbmQgdGltZSBzaG91bGQgYmUgY2FsY3VsYXRlZFxuICogQHJldHVybnMge25leHRPY2N1cnJlbmNlUmVzdWx0fSBSZXN1bHQgb2YgbmV4dCBvY2N1cnJlbmNlIGNhbGN1bGF0aW9uXG4gKi8gXG5tb2R1bGUuZXhwb3J0cy5uZXh0T2NjdXJyZW5jZSA9IChzY2hlZHVsZSkgPT4geyAgICAgXG4gIC8vY2hlY2sgaWYgc2NoZWR1bGUgaXMgYSB2YWxpZCBKU09OIG9iamVjdCAgICBcbiAgbGV0IHZhbGlkYXRlID0gYWp2LmNvbXBpbGUoc2NoZWR1bGVNb2RlbC5zY2hlZHVsZVNjaGVtYSk7XG4gIGxldCB2YWxpZCA9IHZhbGlkYXRlKHNjaGVkdWxlKTtcbiAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gIGlmKCF2YWxpZClcbiAgICByZXR1cm4ge1wicmVzdWx0XCI6IG51bGwsIFwiZXJyb3JcIjogXCJzY2hlbWEgaXMgaW5jb3JyZWN0OiBcIiArIGFqdi5lcnJvcnNUZXh0KHZhbGlkYXRlLmVycm9ycyl9O1xuXG4gIGlmKHNjaGVkdWxlLmhhc093blByb3BlcnR5KFwiZW5hYmxlZFwiKSlcbiAgICBpZighc2NoZWR1bGUuZW5hYmxlZClcbiAgICAgIHJldHVybiB7XCJyZXN1bHRcIjogbnVsbCwgXCJlcnJvclwiOiBcInNjaGVkdWxlIGlzIGRpc2FibGVkXCJ9O1xuXG4gIGxldCByZXN1bHQgPSBudWxsOyAgICAgXG4gIC8vb25lVGltZVxuICBpZihzY2hlZHVsZS5oYXNPd25Qcm9wZXJ0eShcIm9uZVRpbWVcIikpIHsgICAgICAgIFxuICAgIGxldCBvbmVUaW1lID0gc2NoZWR1bGUub25lVGltZTsgICAgICAgIFxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICAqL1xuICAgIGlmKHBhcnNlRGF0ZVRpbWUob25lVGltZSkgPiBnZXREYXRlVGltZSgpKVxuICAgICAgcmVzdWx0ID0gb25lVGltZTtcbiAgfVxuICAvL2VhY2hORGF5IFxuICBpZihzY2hlZHVsZS5oYXNPd25Qcm9wZXJ0eShcImVhY2hORGF5XCIpKSB7ICAgICAgICBcbiAgICAvL3NlYXJjaGluZyBmb3IgYSBkYXkgb2YgcnVuICAgICAgICBcbiAgICBsZXQgY3VycmVudERhdGUgPSBuZXcgRGF0ZShnZXREYXRlVGltZSgpLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApKTtcbiAgICAvL2R1ZSB0byBzYXZlIG1pbGxpc2Vjb25kcyBhbmQgbm90IGxpbmsgbmV3RGF0ZVRpbWUgb2JqZWN0IHdpdGggc2NoZWR1bGUuc3RhcnREYXRlVGltZVxuICAgIGxldCBuZXdEYXRlVGltZSA9IHBhcnNlRGF0ZVRpbWUoc2NoZWR1bGUuc3RhcnREYXRlVGltZSk7XG4gICAgbmV3RGF0ZVRpbWUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG4gICAgd2hpbGUobmV3RGF0ZVRpbWUgPCBjdXJyZW50RGF0ZSkge1xuICAgICAgbmV3RGF0ZVRpbWUgPSBhZGREYXRlKG5ld0RhdGVUaW1lLCAwLCAwLCBzY2hlZHVsZS5lYWNoTkRheSk7XG4gICAgfSAgICAgICAgXG4gICAgLy9hcyBmYXIgYXMgZGF5IHdhcyBmb3VuZCAtIHN0YXJ0IHRvIHNlYXJjaCBtb21lbnQgaW4gYSBkYXkgZm9yIHJ1blxuICAgIHJlc3VsdCA9IGNhbGN1bGF0ZVRpbWVPZlJ1bihzY2hlZHVsZSwgbmV3RGF0ZVRpbWUpO1xuICAgICAgICBcbiAgICAvL2RheSBvdmVyd2hlbG1pbmcgYWZ0ZXIgYWRkaW5nIGludGVydmFsIG9yIGFscmVhZHkgaGFwcGVuZCwgZ28gdG8gZnV0dXJlLCB0byBuZXh0IE4gZGF5XG4gICAgaWYocmVzdWx0ID09IG51bGwpIHtcbiAgICAgIG5ld0RhdGVUaW1lID0gYWRkRGF0ZShuZXdEYXRlVGltZSwgMCwgMCwgc2NoZWR1bGUuZWFjaE5EYXkpO1xuICAgICAgbmV3RGF0ZVRpbWUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG4gICAgICByZXN1bHQgPSBjYWxjdWxhdGVUaW1lT2ZSdW4oc2NoZWR1bGUsIG5ld0RhdGVUaW1lKTtcbiAgICB9XG4gIH0gICAgXG4gIC8vZWFjaE5XZWVrXG4gIGlmKHNjaGVkdWxlLmhhc093blByb3BlcnR5KFwiZWFjaE5XZWVrXCIpKSB7ICAgICAgICAgICAgICAgXG4gICAgLy9kdWUgdG8gc2F2ZSBtaWxsaXNlY29uZHMgYW5kIG5vdCBsaW5rIG5ld0RhdGVUaW1lIG9iamVjdCB3aXRoIHNjaGVkdWxlLnN0YXJ0RGF0ZVRpbWVcbiAgICBsZXQgbmV3RGF0ZVRpbWUgPSBuZXcgRGF0ZShwYXJzZURhdGVUaW1lKHNjaGVkdWxlLnN0YXJ0RGF0ZVRpbWUpKTtcbiAgICBuZXdEYXRlVGltZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbiAgICAvL2ZpbmQgU3VuZGF5IG9mIHN0YXJ0IHdlZWsgXG4gICAgbmV3RGF0ZVRpbWUgPSBhZGREYXRlKG5ld0RhdGVUaW1lLCAwLCAwLCAtbmV3RGF0ZVRpbWUuZ2V0VVRDRGF5KCkpO1xuICAgIC8vbWFrZSBzdGFydCBwb2ludCBhcyBTdW5kYXkgb2Ygc3RhcnQgd2VlayArIChlYWNoTldlZWstMSkgd2Vla3MgZHVlIHRvIGZpbmQgZmlyc3Qgc3VuZGF5IGZvciBjaGVja2luZyAgICAgICAgICAgIFxuICAgIG5ld0RhdGVUaW1lID0gYWRkRGF0ZShuZXdEYXRlVGltZSwgMCwgMCwgNyooc2NoZWR1bGUuZWFjaE5XZWVrIC0gMSkpO1xuICAgIC8vZmluZCBTdW5kYXkgb2YgY3VycmVudCB3ZWVrICAgIFxuICAgIGxldCBjdXJyZW50RGF0ZSA9IG5ldyBEYXRlKChuZXcgRGF0ZSgpKS5zZXRVVENIb3VycygwLCAwLCAwLCAwKSk7XG4gICAgbGV0IGN1cnJlbnRXZWVrU3VuZGF5ID0gYWRkRGF0ZShjdXJyZW50RGF0ZSwgMCwgMCwgLWN1cnJlbnREYXRlLmdldFVUQ0RheSgpKTsgICAgICAgICAgICBcbiAgICAvL2ZpbmQgU3VuZGF5IG9mIHdlZWsgd2hlcmUgbmV4dCBydW4gZGF5KHMpIGFyZSAgICAgICAgXG4gICAgd2hpbGUobmV3RGF0ZVRpbWUgPCBjdXJyZW50V2Vla1N1bmRheSkge1xuICAgICAgbmV3RGF0ZVRpbWUgPSBhZGREYXRlKG5ld0RhdGVUaW1lLCAwLCAwLCA3KnNjaGVkdWxlLmVhY2hOV2Vlayk7XG4gICAgfSAgICAgICAgICBcbiAgICAgICAgXG4gICAgbGV0IGNhbGN1bGF0aW9uUmVzdWx0ID0gY2FsY3VsYXRlV2Vla0RheU9mUnVuKHNjaGVkdWxlLCBuZXdEYXRlVGltZSk7XG4gICAgaWYoY2FsY3VsYXRpb25SZXN1bHQpXG4gICAgICBuZXdEYXRlVGltZSA9IGNhbGN1bGF0aW9uUmVzdWx0O1xuXG4gICAgLy9hcyBmYXIgYXMgYmVnaW5pbmcgb2YgdGhlIHdlZWsgd2FzIGZvdW5kIC0gc3RhcnQgdG8gc2VhcmNoIGRheSBmb3IgZXhlY3V0aW9uXG4gICAgd2hpbGUobmV3RGF0ZVRpbWUgPCBwYXJzZURhdGVUaW1lKHNjaGVkdWxlLnN0YXJ0RGF0ZVRpbWUpIHx8IG5ld0RhdGVUaW1lIDwgZ2V0RGF0ZVRpbWUoKSkge1xuICAgICAgbmV3RGF0ZVRpbWUgPSBhZGREYXRlKG5ld0RhdGVUaW1lLCAwLCAwLCA3KnNjaGVkdWxlLmVhY2hOV2Vlayk7ICAgXG4gICAgICBjYWxjdWxhdGlvblJlc3VsdCA9IGNhbGN1bGF0ZVdlZWtEYXlPZlJ1bihzY2hlZHVsZSwgbmV3RGF0ZVRpbWUpOyAgICAgICBcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICAqL1xuICAgICAgaWYoY2FsY3VsYXRpb25SZXN1bHQpXG4gICAgICAgIG5ld0RhdGVUaW1lID0gY2FsY3VsYXRpb25SZXN1bHQ7XG4gICAgfSAgICAgICAgXG5cbiAgICByZXN1bHQgPSBuZXdEYXRlVGltZTsgICAgICBcbiAgfSAgXG4gIC8vbW9udGhcbiAgaWYoc2NoZWR1bGUuaGFzT3duUHJvcGVydHkoXCJtb250aFwiKSkgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBsZXQgbmV3RGF0ZVRpbWUgPSBuZXcgRGF0ZShwYXJzZURhdGVUaW1lKHNjaGVkdWxlLnN0YXJ0RGF0ZVRpbWUpKTtcbiAgICBsZXQgY3VycmVudERhdGV0aW1lID0gZ2V0RGF0ZVRpbWUoKTtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAgKi9cbiAgICBpZihuZXdEYXRlVGltZSA8IGN1cnJlbnREYXRldGltZSkgICAgICAgICAgICAgXG4gICAgICBuZXdEYXRlVGltZSA9IGN1cnJlbnREYXRldGltZTtcbiAgICAgICAgICAgIFxuICAgIGxldCBkYXlMaXN0ID0gc2NoZWR1bGUuZGF5LnNvcnQoKGEsIGIpID0+IGEgLSBiKTsgICBcblxuICAgIG5ld0RhdGVUaW1lLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xuICAgIGxldCBtb250aEluZGV4ID0gZ2V0RGF0ZVRpbWUoKS5nZXRNb250aCgpO1xuICAgIC8vbWFrZSAxIHllYXIgcm91bmQuIElmIGRhdGUgaXMgbm90IGZvdW5kIHdpdGhpbiAxIHllYXIgLSBuZXh0IHJ1biBjYW4gbm90IGJlIGNhbGN1bGF0ZWRcbiAgICBtb250aExvb3A6XG4gICAgZm9yKGxldCBpPTA7IGk8MTM7IGkrKykge1xuICAgICAgaWYoc2NoZWR1bGUubW9udGguaW5jbHVkZXMobW9udGhMaXN0W21vbnRoSW5kZXhdKSkge1xuICAgICAgICAvL21vbnRoIGZvdW5kLCBzdGFydCB0byBjaGVjayBkYXkgbGlzdCAgICAgICAgIFxuICAgICAgICBmb3IobGV0IGk9MDsgaTxkYXlMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgbmV3RGF0ZVRpbWUuc2V0TW9udGgobW9udGhJbmRleCwgZGF5TGlzdFtpXSk7XG4gICAgICAgICAgLy9hcyBmYXIgYXMgZGF5IHdhcyBmb3VuZCAtIHN0YXJ0IHRvIHNlYXJjaCBtb21lbnQgaW4gYSBkYXkgZm9yIHJ1blxuICAgICAgICAgIGxldCBjYWxjdWxhdGlvblJlc3VsdCA9IGNhbGN1bGF0ZVRpbWVPZlJ1bihzY2hlZHVsZSwgbmV3RGF0ZVRpbWUpO1xuICAgICAgICAgIGlmKGNhbGN1bGF0aW9uUmVzdWx0ICYmIGNhbGN1bGF0aW9uUmVzdWx0ID4gZ2V0RGF0ZVRpbWUoKSkge1xuICAgICAgICAgICAgcmVzdWx0ID0gY2FsY3VsYXRpb25SZXN1bHQ7XG4gICAgICAgICAgICBicmVhayBtb250aExvb3A7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBtb250aEluZGV4Kys7XG4gICAgICBpZihtb250aEluZGV4ID09IDEyKSB7XG4gICAgICAgIG1vbnRoSW5kZXggPSAwO1xuICAgICAgICBuZXdEYXRlVGltZSA9IGFkZERhdGUobmV3RGF0ZVRpbWUsIDEpO1xuICAgICAgfVxuICAgIH0gICAgICAgICAgICAgICAgIFxuICB9ICAgICBcbiAgLy9jaGVjayBmb3IgZW5kIGRhdGUtdGltZSByZXN0cmljdGlvblxuICBpZihzY2hlZHVsZS5lbmREYXRlVGltZSAmJiByZXN1bHQpIHtcbiAgICBpZihyZXN1bHQgPiBwYXJzZURhdGVUaW1lKHNjaGVkdWxlLmVuZERhdGVUaW1lKSkgXG4gICAgICByZXR1cm4ge1wicmVzdWx0XCI6IG51bGwsIFwiZXJyb3JcIjogXCJjYWxjdWxhdGVkIGRhdGUtdGltZSBlYXJsaWVyIHRoYW4gZW5kRGF0ZVRpbWVcIn07XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIHtcInJlc3VsdFwiOiByZXN1bHQsIFwiZXJyb3JcIjogbnVsbH07ICAgICAgICAgICBcbiAgfVxuICBlbHNlIHtcbiAgICBpZihyZXN1bHQgIT0gbnVsbClcbiAgICAgIHJldHVybiB7XCJyZXN1bHRcIjogcGFyc2VEYXRlVGltZShyZXN1bHQpLCBcImVycm9yXCI6IG51bGx9O1xuICAgIGVsc2VcbiAgICAgIHJldHVybiB7XCJyZXN1bHRcIjogbnVsbCwgXCJlcnJvclwiOiBcIm5vdCBhYmxlIHRvIGNhbGN1bGF0ZSBuZXh0IHJ1biBkYXRlLXRpbWVcIn07XG4gIH1cbn07XG4vKipcbiAqIFByaW50cyBzdW1tYXJ5IG9mIHNjaGVkdWxlIG9iamVjdCBpbiBodW1hbiByZWFkYWJsZSBmb3JtYXQuIEUuZy4gXCJFYWNoIDIgZGF5KHMpIGF0IDExOjMwOjAwXCJcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY2hlZHVsZSBTY2hlZHVsZSBmb3Igd2hpY2ggc3VtbWFyeSBzaG91bGQgYmUgcHJpbnRlZFxuICogQHBhcmFtIHtzdHJpbmd9IFtvcHRpb25zXSBPcHRpb25hbC4gQSBsb2NhbGUgc3RyaW5nIG9yIGFycmF5IG9mIGxvY2FsZSAoc2VlIERhdGUudG9Mb2NhbGVTdHJpbmcpICBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbbG9jYWxlXSBPcHRpb25hbC4gQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgb25lIG9yIG1vcmUgcHJvcGVydGllcyB0aGF0IHNwZWNpZnkgY29tcGFyaXNvbiBvcHRpb25zIChzZWUgRGF0ZS50b0xvY2FsZVN0cmluZylcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFN0cmluZyB3aXRoIHN1bW1hcnlcbiAqL1xubW9kdWxlLmV4cG9ydHMuc3VtbWFyeSA9IChzY2hlZHVsZSwgbG9jYWxlLCBvcHRpb25zKSA9PiB7XG4gIGxldCByZXN1bHQgPSAnJztcblx0XG4gIGlmKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzY2hlZHVsZSwgJ29uZVRpbWUnKSkge1xuICAgIHJlc3VsdCA9IGBPbmNlIGF0ICR7Zm9ybWF0RGF0ZVRpbWUoc2NoZWR1bGUub25lVGltZSl9YDtcbiAgfVxuXHRcbiAgaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNjaGVkdWxlLCAnZWFjaE5EYXknKSkge1xuICAgIHJlc3VsdCA9IGBFYWNoICR7c2NoZWR1bGUuZWFjaE5EYXl9IGRheShzKSwgJHtnZXREYWlseUZyZXF1ZW5jeShzY2hlZHVsZS5kYWlseUZyZXF1ZW5jeSl9LCAke2dldFN0YXJ0RW5kKHNjaGVkdWxlKX1gO1xuICB9XG5cdFxuICBpZihPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc2NoZWR1bGUsICdlYWNoTldlZWsnKSkge1xuICAgIHJlc3VsdCA9IGBFYWNoICR7c2NoZWR1bGUuZWFjaE5XZWVrfSB3ZWVrKHMpIG9uICR7Z2V0V2Vla0RheXMoc2NoZWR1bGUuZGF5T2ZXZWVrKX0sICR7Z2V0RGFpbHlGcmVxdWVuY3koc2NoZWR1bGUuZGFpbHlGcmVxdWVuY3kpfSwgJHtnZXRTdGFydEVuZChzY2hlZHVsZSl9YDtcbiAgfVxuXHRcbiAgaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNjaGVkdWxlLCAnbW9udGgnKSkge1xuICAgIHJlc3VsdCA9IGBJbiAke2dldE1vbnRocyhzY2hlZHVsZS5tb250aCl9IGVhY2ggJHtnZXRNb250aERheXMoc2NoZWR1bGUuZGF5KX0gZGF5LCAke2dldERhaWx5RnJlcXVlbmN5KHNjaGVkdWxlLmRhaWx5RnJlcXVlbmN5KX0sICR7Z2V0U3RhcnRFbmQoc2NoZWR1bGUpfWA7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYWlseUZyZXF1ZW5jeSBEYWlseSBmcmVxdWVuY3kgb2JqZWN0XG4gKiBAcmV0dXJucyB7c3RyaW5nfSBIdW1hbiByZWFkYWJsZSB2YWx1ZSBvZiBkYWlseSBmcmVxdWVuY3lcbiAqL1xuZnVuY3Rpb24gZ2V0RGFpbHlGcmVxdWVuY3koZGFpbHlGcmVxdWVuY3kpIHtcbiAgaWYoZGFpbHlGcmVxdWVuY3kuaGFzT3duUHJvcGVydHkoJ29jY3Vyc09uY2VBdCcpKSB7XG4gICAgcmV0dXJuIGBhdCAke2RhaWx5RnJlcXVlbmN5Lm9jY3Vyc09uY2VBdH1gO1xuICB9IGVsc2Uge1xuICAgIGxldCBkYWlseUVuZCA9IGRhaWx5RnJlcXVlbmN5LmVuZCA9PT0gdW5kZWZpbmVkID8gJzIzOjU5OjU5JyA6IGRhaWx5RnJlcXVlbmN5LmVuZDtcbiAgICByZXR1cm4gYGV2ZXJ5ICR7ZGFpbHlGcmVxdWVuY3kub2NjdXJzRXZlcnkuaW50ZXJ2YWxWYWx1ZX0gJHtkYWlseUZyZXF1ZW5jeS5vY2N1cnNFdmVyeS5pbnRlcnZhbFR5cGV9KHMpIGJldHdlZW4gJHtkYWlseUZyZXF1ZW5jeS5zdGFydH0gYW5kICR7ZGFpbHlFbmR9YDtcbiAgfVxufVxuLyoqXG4gKiBDYWxsYmFjayBmb3IgYXJyYXkucmVkdWNlLiBSZXR1cm5zIGh1bWFuIHJlYWRhYmxlIGFuZCBiZWF1dGlmdWwgZW51bWVyYXRpb24gb2YgbGlzdCBsaWtlIFwieCwgeSwgeiBhbmQgYVwiXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBTdHJpbmcgd2hpY2ggcmVwcmVzZW50cyBsaXN0IGluIGEgZm9ybWF0IFwieCwgeSwgeiBhbmQgYVwiXG4gKi9cbmZ1bmN0aW9uIGxpc3RSZWR1Y2VyKGFjYywgY3VyLCBpbmQsIGFycikge1xuICBsZXQgcmVzdWx0ID0gYCR7YWNjfSR7Y3VyfWA7XG4gIGlmKGFyci5sZW5ndGggPiAyICYmIGluZCA8IGFyci5sZW5ndGggLSAyKVxuICAgIHJlc3VsdCA9IGAke3Jlc3VsdH0sIGA7XG4gIGlmKGluZCA9PT0gYXJyLmxlbmd0aCAtIDIpXG4gICAgcmVzdWx0ID0gYCR7cmVzdWx0fSBhbmQgYDtcblxuICByZXR1cm4gcmVzdWx0O1xufVxuLyoqXG4gKiBGb3JtYXRzIHdlZWtkYXkgbGlzdCBpbiBhIGZvcm1hdCBcIngsIHksIHogYW5kIGFcIlxuICogQHBhcmFtIHtBcnJheX0gd2Vla0RheXMgQXJyYXkgd2l0aCB3ZWVrIGRheXNcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEh1bWFuIHJlYWRhYmxlIHZhbHVlIG9mIHdlZWsgZGF5cyBsaXN0XG4gKi9cbmZ1bmN0aW9uIGdldFdlZWtEYXlzKHdlZWtEYXlzKSB7XG4gIGxldCB3ZWVrRGF5TGlzdCA9IHtcbiAgICBcInN1blwiOiBcIlN1bmRheVwiLCBcbiAgICBcIm1vblwiOiBcIk1vbmRheVwiLCBcbiAgICBcInR1ZVwiOiBcIlR1ZXNkYXlcIiwgXG4gICAgXCJ3ZWRcIjogXCJXZWRuZXNkYXlcIiwgXG4gICAgXCJ0aHVcIjogXCJUaHVyc2RheVwiLCBcbiAgICBcImZyaVwiOiBcIkZyaWRheVwiLCBcbiAgICBcInNhdFwiOiBcIlNhdHVyZGF5XCJcbiAgfTtcblxuICBsZXQgY2hvb3NlbldlZWtEYXlzID0gd2Vla0RheXMubWFwKCh2YWwpID0+IHdlZWtEYXlMaXN0W3ZhbF0pO1xuXHRcbiAgcmV0dXJuIGNob29zZW5XZWVrRGF5cy5yZWR1Y2UobGlzdFJlZHVjZXIsICcnKTtcbn1cbi8qKlxuICogRm9ybWF0cyBtb250aHMgbGlzdCBpbiBhIGZvcm1hdCBcIngsIHksIHogYW5kIGFcIlxuICogQHBhcmFtIHtBcnJheX0gd2Vla0RheXMgQXJyYXkgd2l0aCBtb250aHNcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEh1bWFuIHJlYWRhYmxlIHZhbHVlIG9mIG1vbnRocyBsaXN0XG4gKi9cbmZ1bmN0aW9uIGdldE1vbnRocyhtb250aHMpIHtcbiAgbGV0IG1vbnRoTGlzdCA9IHtcbiAgICBcImphblwiOiBcIkphbnVhcnlcIiwgXG4gICAgXCJmZWJcIjogXCJGZWJydWFyeVwiLCBcbiAgICBcIm1hclwiOiBcIk1hcmNoXCIsIFxuICAgIFwiYXByXCI6IFwiQXByaWxcIiwgXG4gICAgXCJtYXlcIjogXCJNYXlcIiwgXG4gICAgXCJqdW5cIjogXCJKdW5lXCIsIFxuICAgIFwianVsXCI6IFwiSnVseVwiLCBcbiAgICBcImF1Z1wiOiBcIkF1Z3VzdFwiLCBcbiAgICBcInNlcFwiOiBcIlNlcHRlbWJlclwiLCBcbiAgICBcIm9jdFwiOiBcIk9jdG9iZXJcIiwgXG4gICAgXCJub3ZcIjogXCJOb3ZlbWJlclwiLCBcbiAgICBcImRlY1wiOiBcIkRlY2VtYmVyXCJcbiAgfTtcblx0XG4gIGxldCBjaG9vc2VuTW9udGhzID0gbW9udGhzLm1hcCgodmFsKSA9PiBtb250aExpc3RbdmFsXSk7XG4gIHJldHVybiBjaG9vc2VuTW9udGhzLnJlZHVjZShsaXN0UmVkdWNlciwgJycpO1xufVxuLyoqXG4gKiBGb3JtYXRzIG1vbnRoIGRheXMgbGlzdCBpbiBhIGZvcm1hdCBcIngsIHksIHogYW5kIGFcIlxuICogQHBhcmFtIHtBcnJheX0gd2Vla0RheXMgQXJyYXkgd2l0aCBtb250aCBkYXlzXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBIdW1hbiByZWFkYWJsZSB2YWx1ZSBvZiBtb250aCBkYXlzIGxpc3RcbiAqL1xuZnVuY3Rpb24gZ2V0TW9udGhEYXlzKG1vbnRoRGF5cykge1xuICByZXR1cm4gbW9udGhEYXlzLnJlZHVjZShsaXN0UmVkdWNlciwgJycpO1xufVxuLyoqXG4gKiBSZXR1cm5zIGh1bWFuIHJlYWRhYmxlIHN0cmluZyB3aXRoIGluZm9ybWF0aW9uIGFib3V0IHN0YXIgYW5kIGVuZCBkYXRlLXRpbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY2hlZHVsZSBTY2hlZHVsZSBvYmplY3RcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEh1bWFuIHJlYWRhYmxlIHN0cmluZ1xuICovXG5mdW5jdGlvbiBnZXRTdGFydEVuZChzY2hlZHVsZSkge1xuICBsZXQgcmVzdWx0ID0gJyc7XG5cdFxuICBpZihzY2hlZHVsZS5oYXNPd25Qcm9wZXJ0eSgnc3RhcnREYXRlVGltZScpKSB7XG4gICAgcmVzdWx0ID0gYHN0YXJ0aW5nICR7Zm9ybWF0RGF0ZVRpbWUoc2NoZWR1bGUuc3RhcnREYXRlVGltZSl9YDsgXG4gIH1cbiAgaWYoc2NoZWR1bGUuaGFzT3duUHJvcGVydHkoJ2VuZERhdGVUaW1lJykpIHtcbiAgICByZXN1bHQgPSBgJHtyZXN1bHR9IGFuZCB0aWxsICR7Zm9ybWF0RGF0ZVRpbWUoc2NoZWR1bGUuZW5kRGF0ZVRpbWUpfWA7IFxuICB9XG5cdFxuICByZXR1cm4gcmVzdWx0O1xufVxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9zY2hlZHVsZS5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbmxldCBBanYgPSByZXF1aXJlKFwiYWp2XCIpO1xuLy9EYXRlLXRpbWUgZnVuY3Rpb25zIGFuZCBoZWxwZXJzXG5tb2R1bGUuZXhwb3J0cy5tb250aExpc3QgPSBbXCJqYW5cIiwgXCJmZWJcIiwgXCJtYXJcIiwgXCJhcHJcIiwgXCJtYXlcIiwgXCJqdW5cIiwgXCJqdWxcIiwgXCJhdWdcIiwgXCJzZXBcIiwgXCJvY3RcIiwgXCJub3ZcIiwgXCJkZWNcIl07XG5tb2R1bGUuZXhwb3J0cy53ZWVrRGF5TGlzdCA9IFtcInN1blwiLCBcIm1vblwiLCBcInR1ZVwiLCBcIndlZFwiLCBcInRodVwiLCBcImZyaVwiLCBcInNhdFwiXTtcbi8qKlxuICogQWRkcyB6ZXJvIGJlZm9yZSBudW1iZXIgaWYgbnVtYmVyIGlzIGxlc3MgdGhhbiAxMFxuICogQHBhcmFtIHtpbnRlZ2VyfSBudW0gTnVtYmVyIHRvIHdoaWNoIGxlYWRpbmcgemVyb3Mgc2hvdWxkIGJlIGFkZGVkXG4gKi9cbmZ1bmN0aW9uIGxlYWRaZXJvKG51bSkge1xuICByZXR1cm4gKG51bSA8IDEwID8gXCIwXCIgOiBcIlwiKSArIG51bTtcbn1cbm1vZHVsZS5leHBvcnRzLmxlYWRaZXJvID0gbGVhZFplcm87XG5cbi8qKlxuICogUmV0dXJucyByZXN1bHQgb2Ygb2JqZWN0IHZhbGlkYXRpb24gYWNyb3NzIG9uZSBvciBzZXZlcmFsIG5lc3RlZCBzY2hlbWFzXG4gKiBAcGFyYW0ge29iamVjdH0gdGVzdERhdGEgT2JqZWN0IHRvIGJlIHZhbGlkYXRlZFxuICogQHBhcmFtIHtvYmplY3R9IHNjaGVtYSBTY2hlbWEgYWNyb3NzIHdoaWNoIG9iamVjdCBzaG91bGQgYmUgdmFsaWRhdGVkXG4gKiBAcGFyYW0ge29iamVjdFtdPX0gZXh0cmFTY2hlbWFMaXN0IEFueSBleHRyYSBzY2hlbWEgbGlzdCB3aGljaCBzaG91bGQgYmUgdXNlZCBmb3IgdmFsaWRhdGlvblxuICogQHJldHVybnMge2Jvb2xlYW59IFJlc3VsdCBvZiBvYmplY3QgdmFsaWRhdGlvblxuICovXG5mdW5jdGlvbiBEYXRhVnNTY2hlbWFSZXN1bHQodGVzdERhdGEsIHNjaGVtYSwgZXh0cmFTY2hlbWFMaXN0KSB7XG4gIC8vVE9ETzogdG8gYmUgb3B0aW1pemVkIHdpdGggcmVtb3ZlU2NoZW1hKC8uKi8pXG4gIHZhciBhanYgPSBuZXcgQWp2KCk7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICAqL1xuICBpZihleHRyYVNjaGVtYUxpc3QpXG4gICAgZXh0cmFTY2hlbWFMaXN0LmZvckVhY2goZnVuY3Rpb24oZSkgeyBhanYuYWRkU2NoZW1hKGUpOyB9KTsgXG4gIGxldCB2YWxpZGF0ZSA9IGFqdi5jb21waWxlKHNjaGVtYSk7XG4gIHJldHVybiB2YWxpZGF0ZSh0ZXN0RGF0YSk7XG59XG5tb2R1bGUuZXhwb3J0cy5EYXRhVnNTY2hlbWFSZXN1bHQgPSBEYXRhVnNTY2hlbWFSZXN1bHQ7XG5cbi8qKlxuICogUmV0dXJucyByZXN1bHQgb2Ygb2JqZWN0IHZhbGlkYXRpb24gYWNyb3NzIG9uZSBvciBzZXZlcmFsIG5lc3RlZCBzY2hlbWFzXG4gKiBAcGFyYW0ge29iamVjdH0gdGVzdERhdGEgT2JqZWN0IHRvIGJlIHZhbGlkYXRlZFxuICogQHBhcmFtIHtvYmplY3R9IHNjaGVtYSBTY2hlbWEgYWNyb3NzIHdoaWNoIG9iamVjdCBzaG91bGQgYmUgdmFsaWRhdGVkXG4gKiBAcGFyYW0ge29iamVjdFtdPX0gZXh0cmFTY2hlbWFMaXN0IEFueSBleHRyYSBzY2hlbWEgbGlzdCB3aGljaCBzaG91bGQgYmUgdXNlZCBmb3IgdmFsaWRhdGlvblxuICogQHJldHVybnMge3N0cmluZ30gTGlzdCBvZiBlcnJvcnNcbiAqL1xuZnVuY3Rpb24gRGF0YVZzU2NoZW1hRXJyb3JzKHRlc3REYXRhLCBzY2hlbWEsIGV4dHJhU2NoZW1hKSB7XG4gIC8vVE9ETzogdG8gYmUgb3B0aW1pemVkIHdpdGggcmVtb3ZlU2NoZW1hKC8uKi8pXG4gIHZhciBhanYgPSBuZXcgQWp2KCk7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICAqL1xuICBpZihleHRyYVNjaGVtYSlcbiAgICBleHRyYVNjaGVtYS5mb3JFYWNoKGZ1bmN0aW9uKGUpIHsgYWp2LmFkZFNjaGVtYShlKTsgfSk7IFxuICBsZXQgdmFsaWRhdGUgPSBhanYuY29tcGlsZShzY2hlbWEpO1xuICB2YWxpZGF0ZSh0ZXN0RGF0YSk7XG4gIHJldHVybiBhanYuZXJyb3JzVGV4dCh2YWxpZGF0ZS5lcnJvcnMpO1xufVxubW9kdWxlLmV4cG9ydHMuRGF0YVZzU2NoZW1hRXJyb3JzID0gRGF0YVZzU2NoZW1hRXJyb3JzO1xuLyoqXG4gKiBSZXR1cm4gZGF0ZS10aW1lIGluIGEgcHJvcGVyIGZvcm1hdFxuICogQHJldHVybnMge29iamVjdH0gRGF0ZS10aW1lXG4gKi9cbmZ1bmN0aW9uIGdldERhdGVUaW1lKCkgeyBcbiAgcmV0dXJuIG5ldyBEYXRlKCk7XG59XG5tb2R1bGUuZXhwb3J0cy5nZXREYXRlVGltZSA9IGdldERhdGVUaW1lO1xuLyoqXG4gKiBFeHRyYWN0IGZyb20gZGF0ZSBhbmQgdGltZSBhbmQgcmV0dXJuIHRpbWUgaW4gYSBmb3JtYXQgSEg6TU06U1MuIEN1cnJlbnQgZGF0ZSB0aW1lIHdpbGwgYmUgdGFrZW4gaW4gY2FzZSBpZiBkYXRlVGltZSBpcyBub3QgcHJvdmlkZWRcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRlVGltZSBEYXRlIGFuZCB0aW1lIG9iamVjdCB3aGljaCBzaG91bGQgYmUgdXNlZCBmb3IgdGltZSBleHRyYWN0aW9uXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaW1lIGluIGEgZm9ybWF0IEhIOk1NOlNTXG4gKi9cbmZ1bmN0aW9uIGdldFRpbWVmcm9tRGF0ZVRpbWUoZGF0ZVRpbWUpIHsgXG4gIGxldCBjdXJyZW50RGF0ZVRpbWU7XG4gIGlmKGRhdGVUaW1lICYmIGRhdGVUaW1lIGluc3RhbmNlb2YgRGF0ZSlcbiAgICBjdXJyZW50RGF0ZVRpbWUgPSBkYXRlVGltZTtcbiAgZWxzZVxuICAgIGN1cnJlbnREYXRlVGltZSA9IGdldERhdGVUaW1lKCk7XG4gIGxldCBob3VycyA9IGxlYWRaZXJvKGN1cnJlbnREYXRlVGltZS5nZXRVVENIb3VycygpKTtcbiAgbGV0IG1pbnV0ZXMgPSBsZWFkWmVybyhjdXJyZW50RGF0ZVRpbWUuZ2V0VVRDTWludXRlcygpKTtcbiAgbGV0IHNlY29uZHMgPSBsZWFkWmVybyhjdXJyZW50RGF0ZVRpbWUuZ2V0VVRDU2Vjb25kcygpKTsgICBcbiAgcmV0dXJuIGhvdXJzICsgXCI6XCIgKyBtaW51dGVzICsgXCI6XCIgKyBzZWNvbmRzO1xufVxubW9kdWxlLmV4cG9ydHMuZ2V0VGltZWZyb21EYXRlVGltZSA9IGdldFRpbWVmcm9tRGF0ZVRpbWU7XG4vKipcbiAqIFJldHVybnMgbmV3IGRhdGUgYmFzZWQgb24gZGF0ZSBhbmQgYWRkZWQgbnVtYmVyIG9mIHllYXJzLCBtb250aHMsIGRheXMsIGhvdXJzLCBtaW51dGVzIG9yIHNlY29uZHNcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRlIERhdGUgdmFsdWUgdG8gd2hpY2ggZGF0ZS10aW1lIGludGVydmFscyBzaG91bGQgYmUgYWRkZWRcbiAqIEBwYXJhbSB7bnVtYmVyfSB5ZWFycyBOdW1iZXIgb2YgeWVhcnMgdG8gYWRkXG4gKiBAcGFyYW0ge251bWJlcn0gbW9udGhzIE51bWJlciBvZiBtb250aHMgdG8gYWRkXG4gKiBAcGFyYW0ge251bWJlcn0gZGF5cyBOdW1iZXIgb2YgZGF5cyB0byBhZGRcbiAqIEBwYXJhbSB7bnVtYmVyfSBob3VycyBOdW1iZXIgb2YgaG91cnMgdG8gYWRkXG4gKiBAcGFyYW0ge251bWJlcn0gbWludXRlcyBOdW1iZXIgb2YgbWludXRlcyB0byBhZGRcbiAqIEBwYXJhbSB7bnVtYmVyfSBzZWNvbmRzIE51bWJlciBvZiBzZWNvbmRzIHRvIGFkZFxuICogQHJldHVybnMge29iamVjdH0gTmV3IGRhdGUgd2l0aCBhZGRlZCBudW1iZXIgb2YgZGF5c1xuICovXG5mdW5jdGlvbiBhZGREYXRlKGRhdGUsIHllYXJzLCBtb250aHMgPSAwLCBkYXlzID0gMCwgaG91cnMgPSAwLCBtaW51dGVzID0gMCwgc2Vjb25kcyA9IDApIHsgIFxuICBsZXQgcmVzdWx0ID0gcGFyc2VEYXRlVGltZShcIjIwMDAtMDEtMDFUMDA6MDA6MDAuMDAwWlwiKTtcbiAgICBcbiAgcmVzdWx0LnNldFVUQ0Z1bGxZZWFyKGRhdGUuZ2V0VVRDRnVsbFllYXIoKSArIHllYXJzKTtcbiAgcmVzdWx0LnNldFVUQ01vbnRoKGRhdGUuZ2V0VVRDTW9udGgoKSArIG1vbnRocyk7XG4gIHJlc3VsdC5zZXRVVENEYXRlKGRhdGUuZ2V0VVRDRGF0ZSgpICsgZGF5cyk7ICAgIFxuICByZXN1bHQuc2V0VVRDSG91cnMoZGF0ZS5nZXRVVENIb3VycygpICsgaG91cnMpOyAgICAgICAgIFxuICByZXN1bHQuc2V0VVRDTWludXRlcyhkYXRlLmdldFVUQ01pbnV0ZXMoKSArIG1pbnV0ZXMpOyAgICBcbiAgcmVzdWx0LnNldFVUQ1NlY29uZHMoZGF0ZS5nZXRVVENTZWNvbmRzKCkgKyBzZWNvbmRzKTsgICAgXG4gIHJlc3VsdC5zZXRVVENNaWxsaXNlY29uZHMoZGF0ZS5nZXRVVENNaWxsaXNlY29uZHMoKSk7XG4gICBcbiAgcmV0dXJuIG5ldyBEYXRlKHJlc3VsdCk7XG59XG5tb2R1bGUuZXhwb3J0cy5hZGREYXRlID0gYWRkRGF0ZTtcbi8qKlxuICogQ29udmVydCBzdHJpbmcgcmVwcmVzZW50ZWQgZGF0ZSBhbmQgdGltZSB0byBuYXRpdmUgZGF0ZS10aW1lIGZvcm1hdFxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZ0RhdGVUaW1lIFVUQyBkYXRlIGFuZCB0aW1lIHJlcHJlc2VudGVkIGFzIGEgc3RpbmcuIEV4YW1wbGU6ICcyMDE4LTAxLTMxVDIwOjU0OjIzLjA3MVonXG4gKiBAcmV0dXJucyB7ZGF0ZXRpbWV9IERhdGUgYW5kIHRpbWUgb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIHBhcnNlRGF0ZVRpbWUoc3RyaW5nRGF0ZVRpbWUpIHtcbiAgbGV0IHByZURhdGUgPSBEYXRlLnBhcnNlKHN0cmluZ0RhdGVUaW1lKTtcbiAgaWYoIWlzTmFOKHByZURhdGUpKSBcbiAgICByZXR1cm4gbmV3IERhdGUocHJlRGF0ZSk7ICAgICAgICAgICAgXG4gIGVsc2VcbiAgICByZXR1cm4gbnVsbDtcbn1cbm1vZHVsZS5leHBvcnRzLnBhcnNlRGF0ZVRpbWUgPSBwYXJzZURhdGVUaW1lO1xuXG4vKipcbiAqIFxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIERhdGUtdGltZSB2YWx1ZVxuICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMgT3B0aW9uYWwuIEEgbG9jYWxlIHN0cmluZyBvciBhcnJheSBvZiBsb2NhbGUgKHNlZSBEYXRlLnRvTG9jYWxlU3RyaW5nKVxuICogQHBhcmFtIHtPYmplY3R9IGxvY2FsZSBPcHRpb25hbC4gQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgb25lIG9yIG1vcmUgcHJvcGVydGllcyB0aGF0IHNwZWNpZnkgY29tcGFyaXNvbiBvcHRpb25zIChzZWUgRGF0ZS50b0xvY2FsZVN0cmluZylcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdGVkIGRhdGUgYW5kIHRpbWVcbiAqL1xuZnVuY3Rpb24gZm9ybWF0RGF0ZVRpbWUodmFsdWUsIG9wdGlvbnMsIGxvY2FsZSkgeyAgXG4gIGxldCBkYXRlVGltZSA9IG5ldyBEYXRlKHZhbHVlKTtcbiAgcmV0dXJuIHZhbHVlID09PSBudWxsID8gJycgOiBkYXRlVGltZS50b0xvY2FsZVN0cmluZyhsb2NhbGUsIG9wdGlvbnMpOyAgXG59XG5tb2R1bGUuZXhwb3J0cy5mb3JtYXREYXRlVGltZSA9IGZvcm1hdERhdGVUaW1lO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi90b29scy5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxudmFyIGNvbXBpbGVTY2hlbWEgPSByZXF1aXJlKCcuL2NvbXBpbGUnKVxuICAsIHJlc29sdmUgPSByZXF1aXJlKCcuL2NvbXBpbGUvcmVzb2x2ZScpXG4gICwgQ2FjaGUgPSByZXF1aXJlKCcuL2NhY2hlJylcbiAgLCBTY2hlbWFPYmplY3QgPSByZXF1aXJlKCcuL2NvbXBpbGUvc2NoZW1hX29iaicpXG4gICwgc3RhYmxlU3RyaW5naWZ5ID0gcmVxdWlyZSgnZmFzdC1qc29uLXN0YWJsZS1zdHJpbmdpZnknKVxuICAsIGZvcm1hdHMgPSByZXF1aXJlKCcuL2NvbXBpbGUvZm9ybWF0cycpXG4gICwgcnVsZXMgPSByZXF1aXJlKCcuL2NvbXBpbGUvcnVsZXMnKVxuICAsICRkYXRhTWV0YVNjaGVtYSA9IHJlcXVpcmUoJy4vZGF0YScpXG4gICwgdXRpbCA9IHJlcXVpcmUoJy4vY29tcGlsZS91dGlsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQWp2O1xuXG5BanYucHJvdG90eXBlLnZhbGlkYXRlID0gdmFsaWRhdGU7XG5BanYucHJvdG90eXBlLmNvbXBpbGUgPSBjb21waWxlO1xuQWp2LnByb3RvdHlwZS5hZGRTY2hlbWEgPSBhZGRTY2hlbWE7XG5BanYucHJvdG90eXBlLmFkZE1ldGFTY2hlbWEgPSBhZGRNZXRhU2NoZW1hO1xuQWp2LnByb3RvdHlwZS52YWxpZGF0ZVNjaGVtYSA9IHZhbGlkYXRlU2NoZW1hO1xuQWp2LnByb3RvdHlwZS5nZXRTY2hlbWEgPSBnZXRTY2hlbWE7XG5BanYucHJvdG90eXBlLnJlbW92ZVNjaGVtYSA9IHJlbW92ZVNjaGVtYTtcbkFqdi5wcm90b3R5cGUuYWRkRm9ybWF0ID0gYWRkRm9ybWF0O1xuQWp2LnByb3RvdHlwZS5lcnJvcnNUZXh0ID0gZXJyb3JzVGV4dDtcblxuQWp2LnByb3RvdHlwZS5fYWRkU2NoZW1hID0gX2FkZFNjaGVtYTtcbkFqdi5wcm90b3R5cGUuX2NvbXBpbGUgPSBfY29tcGlsZTtcblxuQWp2LnByb3RvdHlwZS5jb21waWxlQXN5bmMgPSByZXF1aXJlKCcuL2NvbXBpbGUvYXN5bmMnKTtcbnZhciBjdXN0b21LZXl3b3JkID0gcmVxdWlyZSgnLi9rZXl3b3JkJyk7XG5BanYucHJvdG90eXBlLmFkZEtleXdvcmQgPSBjdXN0b21LZXl3b3JkLmFkZDtcbkFqdi5wcm90b3R5cGUuZ2V0S2V5d29yZCA9IGN1c3RvbUtleXdvcmQuZ2V0O1xuQWp2LnByb3RvdHlwZS5yZW1vdmVLZXl3b3JkID0gY3VzdG9tS2V5d29yZC5yZW1vdmU7XG5BanYucHJvdG90eXBlLnZhbGlkYXRlS2V5d29yZCA9IGN1c3RvbUtleXdvcmQudmFsaWRhdGU7XG5cbnZhciBlcnJvckNsYXNzZXMgPSByZXF1aXJlKCcuL2NvbXBpbGUvZXJyb3JfY2xhc3NlcycpO1xuQWp2LlZhbGlkYXRpb25FcnJvciA9IGVycm9yQ2xhc3Nlcy5WYWxpZGF0aW9uO1xuQWp2Lk1pc3NpbmdSZWZFcnJvciA9IGVycm9yQ2xhc3Nlcy5NaXNzaW5nUmVmO1xuQWp2LiRkYXRhTWV0YVNjaGVtYSA9ICRkYXRhTWV0YVNjaGVtYTtcblxudmFyIE1FVEFfU0NIRU1BX0lEID0gJ2h0dHA6Ly9qc29uLXNjaGVtYS5vcmcvZHJhZnQtMDcvc2NoZW1hJztcblxudmFyIE1FVEFfSUdOT1JFX09QVElPTlMgPSBbICdyZW1vdmVBZGRpdGlvbmFsJywgJ3VzZURlZmF1bHRzJywgJ2NvZXJjZVR5cGVzJywgJ3N0cmljdERlZmF1bHRzJyBdO1xudmFyIE1FVEFfU1VQUE9SVF9EQVRBID0gWycvcHJvcGVydGllcyddO1xuXG4vKipcbiAqIENyZWF0ZXMgdmFsaWRhdG9yIGluc3RhbmNlLlxuICogVXNhZ2U6IGBBanYob3B0cylgXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBvcHRpb25hbCBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9IGFqdiBpbnN0YW5jZVxuICovXG5mdW5jdGlvbiBBanYob3B0cykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQWp2KSkgcmV0dXJuIG5ldyBBanYob3B0cyk7XG4gIG9wdHMgPSB0aGlzLl9vcHRzID0gdXRpbC5jb3B5KG9wdHMpIHx8IHt9O1xuICBzZXRMb2dnZXIodGhpcyk7XG4gIHRoaXMuX3NjaGVtYXMgPSB7fTtcbiAgdGhpcy5fcmVmcyA9IHt9O1xuICB0aGlzLl9mcmFnbWVudHMgPSB7fTtcbiAgdGhpcy5fZm9ybWF0cyA9IGZvcm1hdHMob3B0cy5mb3JtYXQpO1xuXG4gIHRoaXMuX2NhY2hlID0gb3B0cy5jYWNoZSB8fCBuZXcgQ2FjaGU7XG4gIHRoaXMuX2xvYWRpbmdTY2hlbWFzID0ge307XG4gIHRoaXMuX2NvbXBpbGF0aW9ucyA9IFtdO1xuICB0aGlzLlJVTEVTID0gcnVsZXMoKTtcbiAgdGhpcy5fZ2V0SWQgPSBjaG9vc2VHZXRJZChvcHRzKTtcblxuICBvcHRzLmxvb3BSZXF1aXJlZCA9IG9wdHMubG9vcFJlcXVpcmVkIHx8IEluZmluaXR5O1xuICBpZiAob3B0cy5lcnJvckRhdGFQYXRoID09ICdwcm9wZXJ0eScpIG9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSA9IHRydWU7XG4gIGlmIChvcHRzLnNlcmlhbGl6ZSA9PT0gdW5kZWZpbmVkKSBvcHRzLnNlcmlhbGl6ZSA9IHN0YWJsZVN0cmluZ2lmeTtcbiAgdGhpcy5fbWV0YU9wdHMgPSBnZXRNZXRhU2NoZW1hT3B0aW9ucyh0aGlzKTtcblxuICBpZiAob3B0cy5mb3JtYXRzKSBhZGRJbml0aWFsRm9ybWF0cyh0aGlzKTtcbiAgaWYgKG9wdHMua2V5d29yZHMpIGFkZEluaXRpYWxLZXl3b3Jkcyh0aGlzKTtcbiAgYWRkRGVmYXVsdE1ldGFTY2hlbWEodGhpcyk7XG4gIGlmICh0eXBlb2Ygb3B0cy5tZXRhID09ICdvYmplY3QnKSB0aGlzLmFkZE1ldGFTY2hlbWEob3B0cy5tZXRhKTtcbiAgaWYgKG9wdHMubnVsbGFibGUpIHRoaXMuYWRkS2V5d29yZCgnbnVsbGFibGUnLCB7bWV0YVNjaGVtYToge3R5cGU6ICdib29sZWFuJ319KTtcbiAgYWRkSW5pdGlhbFNjaGVtYXModGhpcyk7XG59XG5cblxuXG4vKipcbiAqIFZhbGlkYXRlIGRhdGEgdXNpbmcgc2NoZW1hXG4gKiBTY2hlbWEgd2lsbCBiZSBjb21waWxlZCBhbmQgY2FjaGVkICh1c2luZyBzZXJpYWxpemVkIEpTT04gYXMga2V5LiBbZmFzdC1qc29uLXN0YWJsZS1zdHJpbmdpZnldKGh0dHBzOi8vZ2l0aHViLmNvbS9lcG9iZXJlemtpbi9mYXN0LWpzb24tc3RhYmxlLXN0cmluZ2lmeSkgaXMgdXNlZCB0byBzZXJpYWxpemUuXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtICB7U3RyaW5nfE9iamVjdH0gc2NoZW1hS2V5UmVmIGtleSwgcmVmIG9yIHNjaGVtYSBvYmplY3RcbiAqIEBwYXJhbSAge0FueX0gZGF0YSB0byBiZSB2YWxpZGF0ZWRcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHZhbGlkYXRpb24gcmVzdWx0LiBFcnJvcnMgZnJvbSB0aGUgbGFzdCB2YWxpZGF0aW9uIHdpbGwgYmUgYXZhaWxhYmxlIGluIGBhanYuZXJyb3JzYCAoYW5kIGFsc28gaW4gY29tcGlsZWQgc2NoZW1hOiBgc2NoZW1hLmVycm9yc2ApLlxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZShzY2hlbWFLZXlSZWYsIGRhdGEpIHtcbiAgdmFyIHY7XG4gIGlmICh0eXBlb2Ygc2NoZW1hS2V5UmVmID09ICdzdHJpbmcnKSB7XG4gICAgdiA9IHRoaXMuZ2V0U2NoZW1hKHNjaGVtYUtleVJlZik7XG4gICAgaWYgKCF2KSB0aHJvdyBuZXcgRXJyb3IoJ25vIHNjaGVtYSB3aXRoIGtleSBvciByZWYgXCInICsgc2NoZW1hS2V5UmVmICsgJ1wiJyk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHNjaGVtYU9iaiA9IHRoaXMuX2FkZFNjaGVtYShzY2hlbWFLZXlSZWYpO1xuICAgIHYgPSBzY2hlbWFPYmoudmFsaWRhdGUgfHwgdGhpcy5fY29tcGlsZShzY2hlbWFPYmopO1xuICB9XG5cbiAgdmFyIHZhbGlkID0gdihkYXRhKTtcbiAgaWYgKHYuJGFzeW5jICE9PSB0cnVlKSB0aGlzLmVycm9ycyA9IHYuZXJyb3JzO1xuICByZXR1cm4gdmFsaWQ7XG59XG5cblxuLyoqXG4gKiBDcmVhdGUgdmFsaWRhdGluZyBmdW5jdGlvbiBmb3IgcGFzc2VkIHNjaGVtYS5cbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0gIHtPYmplY3R9IHNjaGVtYSBzY2hlbWEgb2JqZWN0XG4gKiBAcGFyYW0gIHtCb29sZWFufSBfbWV0YSB0cnVlIGlmIHNjaGVtYSBpcyBhIG1ldGEtc2NoZW1hLiBVc2VkIGludGVybmFsbHkgdG8gY29tcGlsZSBtZXRhIHNjaGVtYXMgb2YgY3VzdG9tIGtleXdvcmRzLlxuICogQHJldHVybiB7RnVuY3Rpb259IHZhbGlkYXRpbmcgZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gY29tcGlsZShzY2hlbWEsIF9tZXRhKSB7XG4gIHZhciBzY2hlbWFPYmogPSB0aGlzLl9hZGRTY2hlbWEoc2NoZW1hLCB1bmRlZmluZWQsIF9tZXRhKTtcbiAgcmV0dXJuIHNjaGVtYU9iai52YWxpZGF0ZSB8fCB0aGlzLl9jb21waWxlKHNjaGVtYU9iaik7XG59XG5cblxuLyoqXG4gKiBBZGRzIHNjaGVtYSB0byB0aGUgaW5zdGFuY2UuXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IHNjaGVtYSBzY2hlbWEgb3IgYXJyYXkgb2Ygc2NoZW1hcy4gSWYgYXJyYXkgaXMgcGFzc2VkLCBga2V5YCBhbmQgb3RoZXIgcGFyYW1ldGVycyB3aWxsIGJlIGlnbm9yZWQuXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IE9wdGlvbmFsIHNjaGVtYSBrZXkuIENhbiBiZSBwYXNzZWQgdG8gYHZhbGlkYXRlYCBtZXRob2QgaW5zdGVhZCBvZiBzY2hlbWEgb2JqZWN0IG9yIGlkL3JlZi4gT25lIHNjaGVtYSBwZXIgaW5zdGFuY2UgY2FuIGhhdmUgZW1wdHkgYGlkYCBhbmQgYGtleWAuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IF9za2lwVmFsaWRhdGlvbiB0cnVlIHRvIHNraXAgc2NoZW1hIHZhbGlkYXRpb24uIFVzZWQgaW50ZXJuYWxseSwgb3B0aW9uIHZhbGlkYXRlU2NoZW1hIHNob3VsZCBiZSB1c2VkIGluc3RlYWQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IF9tZXRhIHRydWUgaWYgc2NoZW1hIGlzIGEgbWV0YS1zY2hlbWEuIFVzZWQgaW50ZXJuYWxseSwgYWRkTWV0YVNjaGVtYSBzaG91bGQgYmUgdXNlZCBpbnN0ZWFkLlxuICogQHJldHVybiB7QWp2fSB0aGlzIGZvciBtZXRob2QgY2hhaW5pbmdcbiAqL1xuZnVuY3Rpb24gYWRkU2NoZW1hKHNjaGVtYSwga2V5LCBfc2tpcFZhbGlkYXRpb24sIF9tZXRhKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KHNjaGVtYSkpe1xuICAgIGZvciAodmFyIGk9MDsgaTxzY2hlbWEubGVuZ3RoOyBpKyspIHRoaXMuYWRkU2NoZW1hKHNjaGVtYVtpXSwgdW5kZWZpbmVkLCBfc2tpcFZhbGlkYXRpb24sIF9tZXRhKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICB2YXIgaWQgPSB0aGlzLl9nZXRJZChzY2hlbWEpO1xuICBpZiAoaWQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgaWQgIT0gJ3N0cmluZycpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdzY2hlbWEgaWQgbXVzdCBiZSBzdHJpbmcnKTtcbiAga2V5ID0gcmVzb2x2ZS5ub3JtYWxpemVJZChrZXkgfHwgaWQpO1xuICBjaGVja1VuaXF1ZSh0aGlzLCBrZXkpO1xuICB0aGlzLl9zY2hlbWFzW2tleV0gPSB0aGlzLl9hZGRTY2hlbWEoc2NoZW1hLCBfc2tpcFZhbGlkYXRpb24sIF9tZXRhLCB0cnVlKTtcbiAgcmV0dXJuIHRoaXM7XG59XG5cblxuLyoqXG4gKiBBZGQgc2NoZW1hIHRoYXQgd2lsbCBiZSB1c2VkIHRvIHZhbGlkYXRlIG90aGVyIHNjaGVtYXNcbiAqIG9wdGlvbnMgaW4gTUVUQV9JR05PUkVfT1BUSU9OUyBhcmUgYWx3YXkgc2V0IHRvIGZhbHNlXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtIHtPYmplY3R9IHNjaGVtYSBzY2hlbWEgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IG9wdGlvbmFsIHNjaGVtYSBrZXlcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gc2tpcFZhbGlkYXRpb24gdHJ1ZSB0byBza2lwIHNjaGVtYSB2YWxpZGF0aW9uLCBjYW4gYmUgdXNlZCB0byBvdmVycmlkZSB2YWxpZGF0ZVNjaGVtYSBvcHRpb24gZm9yIG1ldGEtc2NoZW1hXG4gKiBAcmV0dXJuIHtBanZ9IHRoaXMgZm9yIG1ldGhvZCBjaGFpbmluZ1xuICovXG5mdW5jdGlvbiBhZGRNZXRhU2NoZW1hKHNjaGVtYSwga2V5LCBza2lwVmFsaWRhdGlvbikge1xuICB0aGlzLmFkZFNjaGVtYShzY2hlbWEsIGtleSwgc2tpcFZhbGlkYXRpb24sIHRydWUpO1xuICByZXR1cm4gdGhpcztcbn1cblxuXG4vKipcbiAqIFZhbGlkYXRlIHNjaGVtYVxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY2hlbWEgc2NoZW1hIHRvIHZhbGlkYXRlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHRocm93T3JMb2dFcnJvciBwYXNzIHRydWUgdG8gdGhyb3cgKG9yIGxvZykgYW4gZXJyb3IgaWYgaW52YWxpZFxuICogQHJldHVybiB7Qm9vbGVhbn0gdHJ1ZSBpZiBzY2hlbWEgaXMgdmFsaWRcbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVTY2hlbWEoc2NoZW1hLCB0aHJvd09yTG9nRXJyb3IpIHtcbiAgdmFyICRzY2hlbWEgPSBzY2hlbWEuJHNjaGVtYTtcbiAgaWYgKCRzY2hlbWEgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgJHNjaGVtYSAhPSAnc3RyaW5nJylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJyRzY2hlbWEgbXVzdCBiZSBhIHN0cmluZycpO1xuICAkc2NoZW1hID0gJHNjaGVtYSB8fCB0aGlzLl9vcHRzLmRlZmF1bHRNZXRhIHx8IGRlZmF1bHRNZXRhKHRoaXMpO1xuICBpZiAoISRzY2hlbWEpIHtcbiAgICB0aGlzLmxvZ2dlci53YXJuKCdtZXRhLXNjaGVtYSBub3QgYXZhaWxhYmxlJyk7XG4gICAgdGhpcy5lcnJvcnMgPSBudWxsO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHZhciB2YWxpZCA9IHRoaXMudmFsaWRhdGUoJHNjaGVtYSwgc2NoZW1hKTtcbiAgaWYgKCF2YWxpZCAmJiB0aHJvd09yTG9nRXJyb3IpIHtcbiAgICB2YXIgbWVzc2FnZSA9ICdzY2hlbWEgaXMgaW52YWxpZDogJyArIHRoaXMuZXJyb3JzVGV4dCgpO1xuICAgIGlmICh0aGlzLl9vcHRzLnZhbGlkYXRlU2NoZW1hID09ICdsb2cnKSB0aGlzLmxvZ2dlci5lcnJvcihtZXNzYWdlKTtcbiAgICBlbHNlIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgfVxuICByZXR1cm4gdmFsaWQ7XG59XG5cblxuZnVuY3Rpb24gZGVmYXVsdE1ldGEoc2VsZikge1xuICB2YXIgbWV0YSA9IHNlbGYuX29wdHMubWV0YTtcbiAgc2VsZi5fb3B0cy5kZWZhdWx0TWV0YSA9IHR5cGVvZiBtZXRhID09ICdvYmplY3QnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBzZWxmLl9nZXRJZChtZXRhKSB8fCBtZXRhXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBzZWxmLmdldFNjaGVtYShNRVRBX1NDSEVNQV9JRClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gTUVUQV9TQ0hFTUFfSURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuICByZXR1cm4gc2VsZi5fb3B0cy5kZWZhdWx0TWV0YTtcbn1cblxuXG4vKipcbiAqIEdldCBjb21waWxlZCBzY2hlbWEgZnJvbSB0aGUgaW5zdGFuY2UgYnkgYGtleWAgb3IgYHJlZmAuXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtICB7U3RyaW5nfSBrZXlSZWYgYGtleWAgdGhhdCB3YXMgcGFzc2VkIHRvIGBhZGRTY2hlbWFgIG9yIGZ1bGwgc2NoZW1hIHJlZmVyZW5jZSAoYHNjaGVtYS5pZGAgb3IgcmVzb2x2ZWQgaWQpLlxuICogQHJldHVybiB7RnVuY3Rpb259IHNjaGVtYSB2YWxpZGF0aW5nIGZ1bmN0aW9uICh3aXRoIHByb3BlcnR5IGBzY2hlbWFgKS5cbiAqL1xuZnVuY3Rpb24gZ2V0U2NoZW1hKGtleVJlZikge1xuICB2YXIgc2NoZW1hT2JqID0gX2dldFNjaGVtYU9iaih0aGlzLCBrZXlSZWYpO1xuICBzd2l0Y2ggKHR5cGVvZiBzY2hlbWFPYmopIHtcbiAgICBjYXNlICdvYmplY3QnOiByZXR1cm4gc2NoZW1hT2JqLnZhbGlkYXRlIHx8IHRoaXMuX2NvbXBpbGUoc2NoZW1hT2JqKTtcbiAgICBjYXNlICdzdHJpbmcnOiByZXR1cm4gdGhpcy5nZXRTY2hlbWEoc2NoZW1hT2JqKTtcbiAgICBjYXNlICd1bmRlZmluZWQnOiByZXR1cm4gX2dldFNjaGVtYUZyYWdtZW50KHRoaXMsIGtleVJlZik7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBfZ2V0U2NoZW1hRnJhZ21lbnQoc2VsZiwgcmVmKSB7XG4gIHZhciByZXMgPSByZXNvbHZlLnNjaGVtYS5jYWxsKHNlbGYsIHsgc2NoZW1hOiB7fSB9LCByZWYpO1xuICBpZiAocmVzKSB7XG4gICAgdmFyIHNjaGVtYSA9IHJlcy5zY2hlbWFcbiAgICAgICwgcm9vdCA9IHJlcy5yb290XG4gICAgICAsIGJhc2VJZCA9IHJlcy5iYXNlSWQ7XG4gICAgdmFyIHYgPSBjb21waWxlU2NoZW1hLmNhbGwoc2VsZiwgc2NoZW1hLCByb290LCB1bmRlZmluZWQsIGJhc2VJZCk7XG4gICAgc2VsZi5fZnJhZ21lbnRzW3JlZl0gPSBuZXcgU2NoZW1hT2JqZWN0KHtcbiAgICAgIHJlZjogcmVmLFxuICAgICAgZnJhZ21lbnQ6IHRydWUsXG4gICAgICBzY2hlbWE6IHNjaGVtYSxcbiAgICAgIHJvb3Q6IHJvb3QsXG4gICAgICBiYXNlSWQ6IGJhc2VJZCxcbiAgICAgIHZhbGlkYXRlOiB2XG4gICAgfSk7XG4gICAgcmV0dXJuIHY7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBfZ2V0U2NoZW1hT2JqKHNlbGYsIGtleVJlZikge1xuICBrZXlSZWYgPSByZXNvbHZlLm5vcm1hbGl6ZUlkKGtleVJlZik7XG4gIHJldHVybiBzZWxmLl9zY2hlbWFzW2tleVJlZl0gfHwgc2VsZi5fcmVmc1trZXlSZWZdIHx8IHNlbGYuX2ZyYWdtZW50c1trZXlSZWZdO1xufVxuXG5cbi8qKlxuICogUmVtb3ZlIGNhY2hlZCBzY2hlbWEocykuXG4gKiBJZiBubyBwYXJhbWV0ZXIgaXMgcGFzc2VkIGFsbCBzY2hlbWFzIGJ1dCBtZXRhLXNjaGVtYXMgYXJlIHJlbW92ZWQuXG4gKiBJZiBSZWdFeHAgaXMgcGFzc2VkIGFsbCBzY2hlbWFzIHdpdGgga2V5L2lkIG1hdGNoaW5nIHBhdHRlcm4gYnV0IG1ldGEtc2NoZW1hcyBhcmUgcmVtb3ZlZC5cbiAqIEV2ZW4gaWYgc2NoZW1hIGlzIHJlZmVyZW5jZWQgYnkgb3RoZXIgc2NoZW1hcyBpdCBzdGlsbCBjYW4gYmUgcmVtb3ZlZCBhcyBvdGhlciBzY2hlbWFzIGhhdmUgbG9jYWwgcmVmZXJlbmNlcy5cbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0gIHtTdHJpbmd8T2JqZWN0fFJlZ0V4cH0gc2NoZW1hS2V5UmVmIGtleSwgcmVmLCBwYXR0ZXJuIHRvIG1hdGNoIGtleS9yZWYgb3Igc2NoZW1hIG9iamVjdFxuICogQHJldHVybiB7QWp2fSB0aGlzIGZvciBtZXRob2QgY2hhaW5pbmdcbiAqL1xuZnVuY3Rpb24gcmVtb3ZlU2NoZW1hKHNjaGVtYUtleVJlZikge1xuICBpZiAoc2NoZW1hS2V5UmVmIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgX3JlbW92ZUFsbFNjaGVtYXModGhpcywgdGhpcy5fc2NoZW1hcywgc2NoZW1hS2V5UmVmKTtcbiAgICBfcmVtb3ZlQWxsU2NoZW1hcyh0aGlzLCB0aGlzLl9yZWZzLCBzY2hlbWFLZXlSZWYpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHN3aXRjaCAodHlwZW9mIHNjaGVtYUtleVJlZikge1xuICAgIGNhc2UgJ3VuZGVmaW5lZCc6XG4gICAgICBfcmVtb3ZlQWxsU2NoZW1hcyh0aGlzLCB0aGlzLl9zY2hlbWFzKTtcbiAgICAgIF9yZW1vdmVBbGxTY2hlbWFzKHRoaXMsIHRoaXMuX3JlZnMpO1xuICAgICAgdGhpcy5fY2FjaGUuY2xlYXIoKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICB2YXIgc2NoZW1hT2JqID0gX2dldFNjaGVtYU9iaih0aGlzLCBzY2hlbWFLZXlSZWYpO1xuICAgICAgaWYgKHNjaGVtYU9iaikgdGhpcy5fY2FjaGUuZGVsKHNjaGVtYU9iai5jYWNoZUtleSk7XG4gICAgICBkZWxldGUgdGhpcy5fc2NoZW1hc1tzY2hlbWFLZXlSZWZdO1xuICAgICAgZGVsZXRlIHRoaXMuX3JlZnNbc2NoZW1hS2V5UmVmXTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICB2YXIgc2VyaWFsaXplID0gdGhpcy5fb3B0cy5zZXJpYWxpemU7XG4gICAgICB2YXIgY2FjaGVLZXkgPSBzZXJpYWxpemUgPyBzZXJpYWxpemUoc2NoZW1hS2V5UmVmKSA6IHNjaGVtYUtleVJlZjtcbiAgICAgIHRoaXMuX2NhY2hlLmRlbChjYWNoZUtleSk7XG4gICAgICB2YXIgaWQgPSB0aGlzLl9nZXRJZChzY2hlbWFLZXlSZWYpO1xuICAgICAgaWYgKGlkKSB7XG4gICAgICAgIGlkID0gcmVzb2x2ZS5ub3JtYWxpemVJZChpZCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9zY2hlbWFzW2lkXTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3JlZnNbaWRdO1xuICAgICAgfVxuICB9XG4gIHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIF9yZW1vdmVBbGxTY2hlbWFzKHNlbGYsIHNjaGVtYXMsIHJlZ2V4KSB7XG4gIGZvciAodmFyIGtleVJlZiBpbiBzY2hlbWFzKSB7XG4gICAgdmFyIHNjaGVtYU9iaiA9IHNjaGVtYXNba2V5UmVmXTtcbiAgICBpZiAoIXNjaGVtYU9iai5tZXRhICYmICghcmVnZXggfHwgcmVnZXgudGVzdChrZXlSZWYpKSkge1xuICAgICAgc2VsZi5fY2FjaGUuZGVsKHNjaGVtYU9iai5jYWNoZUtleSk7XG4gICAgICBkZWxldGUgc2NoZW1hc1trZXlSZWZdO1xuICAgIH1cbiAgfVxufVxuXG5cbi8qIEB0aGlzICAgQWp2ICovXG5mdW5jdGlvbiBfYWRkU2NoZW1hKHNjaGVtYSwgc2tpcFZhbGlkYXRpb24sIG1ldGEsIHNob3VsZEFkZFNjaGVtYSkge1xuICBpZiAodHlwZW9mIHNjaGVtYSAhPSAnb2JqZWN0JyAmJiB0eXBlb2Ygc2NoZW1hICE9ICdib29sZWFuJylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NjaGVtYSBzaG91bGQgYmUgb2JqZWN0IG9yIGJvb2xlYW4nKTtcbiAgdmFyIHNlcmlhbGl6ZSA9IHRoaXMuX29wdHMuc2VyaWFsaXplO1xuICB2YXIgY2FjaGVLZXkgPSBzZXJpYWxpemUgPyBzZXJpYWxpemUoc2NoZW1hKSA6IHNjaGVtYTtcbiAgdmFyIGNhY2hlZCA9IHRoaXMuX2NhY2hlLmdldChjYWNoZUtleSk7XG4gIGlmIChjYWNoZWQpIHJldHVybiBjYWNoZWQ7XG5cbiAgc2hvdWxkQWRkU2NoZW1hID0gc2hvdWxkQWRkU2NoZW1hIHx8IHRoaXMuX29wdHMuYWRkVXNlZFNjaGVtYSAhPT0gZmFsc2U7XG5cbiAgdmFyIGlkID0gcmVzb2x2ZS5ub3JtYWxpemVJZCh0aGlzLl9nZXRJZChzY2hlbWEpKTtcbiAgaWYgKGlkICYmIHNob3VsZEFkZFNjaGVtYSkgY2hlY2tVbmlxdWUodGhpcywgaWQpO1xuXG4gIHZhciB3aWxsVmFsaWRhdGUgPSB0aGlzLl9vcHRzLnZhbGlkYXRlU2NoZW1hICE9PSBmYWxzZSAmJiAhc2tpcFZhbGlkYXRpb247XG4gIHZhciByZWN1cnNpdmVNZXRhO1xuICBpZiAod2lsbFZhbGlkYXRlICYmICEocmVjdXJzaXZlTWV0YSA9IGlkICYmIGlkID09IHJlc29sdmUubm9ybWFsaXplSWQoc2NoZW1hLiRzY2hlbWEpKSlcbiAgICB0aGlzLnZhbGlkYXRlU2NoZW1hKHNjaGVtYSwgdHJ1ZSk7XG5cbiAgdmFyIGxvY2FsUmVmcyA9IHJlc29sdmUuaWRzLmNhbGwodGhpcywgc2NoZW1hKTtcblxuICB2YXIgc2NoZW1hT2JqID0gbmV3IFNjaGVtYU9iamVjdCh7XG4gICAgaWQ6IGlkLFxuICAgIHNjaGVtYTogc2NoZW1hLFxuICAgIGxvY2FsUmVmczogbG9jYWxSZWZzLFxuICAgIGNhY2hlS2V5OiBjYWNoZUtleSxcbiAgICBtZXRhOiBtZXRhXG4gIH0pO1xuXG4gIGlmIChpZFswXSAhPSAnIycgJiYgc2hvdWxkQWRkU2NoZW1hKSB0aGlzLl9yZWZzW2lkXSA9IHNjaGVtYU9iajtcbiAgdGhpcy5fY2FjaGUucHV0KGNhY2hlS2V5LCBzY2hlbWFPYmopO1xuXG4gIGlmICh3aWxsVmFsaWRhdGUgJiYgcmVjdXJzaXZlTWV0YSkgdGhpcy52YWxpZGF0ZVNjaGVtYShzY2hlbWEsIHRydWUpO1xuXG4gIHJldHVybiBzY2hlbWFPYmo7XG59XG5cblxuLyogQHRoaXMgICBBanYgKi9cbmZ1bmN0aW9uIF9jb21waWxlKHNjaGVtYU9iaiwgcm9vdCkge1xuICBpZiAoc2NoZW1hT2JqLmNvbXBpbGluZykge1xuICAgIHNjaGVtYU9iai52YWxpZGF0ZSA9IGNhbGxWYWxpZGF0ZTtcbiAgICBjYWxsVmFsaWRhdGUuc2NoZW1hID0gc2NoZW1hT2JqLnNjaGVtYTtcbiAgICBjYWxsVmFsaWRhdGUuZXJyb3JzID0gbnVsbDtcbiAgICBjYWxsVmFsaWRhdGUucm9vdCA9IHJvb3QgPyByb290IDogY2FsbFZhbGlkYXRlO1xuICAgIGlmIChzY2hlbWFPYmouc2NoZW1hLiRhc3luYyA9PT0gdHJ1ZSlcbiAgICAgIGNhbGxWYWxpZGF0ZS4kYXN5bmMgPSB0cnVlO1xuICAgIHJldHVybiBjYWxsVmFsaWRhdGU7XG4gIH1cbiAgc2NoZW1hT2JqLmNvbXBpbGluZyA9IHRydWU7XG5cbiAgdmFyIGN1cnJlbnRPcHRzO1xuICBpZiAoc2NoZW1hT2JqLm1ldGEpIHtcbiAgICBjdXJyZW50T3B0cyA9IHRoaXMuX29wdHM7XG4gICAgdGhpcy5fb3B0cyA9IHRoaXMuX21ldGFPcHRzO1xuICB9XG5cbiAgdmFyIHY7XG4gIHRyeSB7IHYgPSBjb21waWxlU2NoZW1hLmNhbGwodGhpcywgc2NoZW1hT2JqLnNjaGVtYSwgcm9vdCwgc2NoZW1hT2JqLmxvY2FsUmVmcyk7IH1cbiAgY2F0Y2goZSkge1xuICAgIGRlbGV0ZSBzY2hlbWFPYmoudmFsaWRhdGU7XG4gICAgdGhyb3cgZTtcbiAgfVxuICBmaW5hbGx5IHtcbiAgICBzY2hlbWFPYmouY29tcGlsaW5nID0gZmFsc2U7XG4gICAgaWYgKHNjaGVtYU9iai5tZXRhKSB0aGlzLl9vcHRzID0gY3VycmVudE9wdHM7XG4gIH1cblxuICBzY2hlbWFPYmoudmFsaWRhdGUgPSB2O1xuICBzY2hlbWFPYmoucmVmcyA9IHYucmVmcztcbiAgc2NoZW1hT2JqLnJlZlZhbCA9IHYucmVmVmFsO1xuICBzY2hlbWFPYmoucm9vdCA9IHYucm9vdDtcbiAgcmV0dXJuIHY7XG5cblxuICAvKiBAdGhpcyAgIHsqfSAtIGN1c3RvbSBjb250ZXh0LCBzZWUgcGFzc0NvbnRleHQgb3B0aW9uICovXG4gIGZ1bmN0aW9uIGNhbGxWYWxpZGF0ZSgpIHtcbiAgICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIF92YWxpZGF0ZSA9IHNjaGVtYU9iai52YWxpZGF0ZTtcbiAgICB2YXIgcmVzdWx0ID0gX3ZhbGlkYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgY2FsbFZhbGlkYXRlLmVycm9ycyA9IF92YWxpZGF0ZS5lcnJvcnM7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGNob29zZUdldElkKG9wdHMpIHtcbiAgc3dpdGNoIChvcHRzLnNjaGVtYUlkKSB7XG4gICAgY2FzZSAnYXV0byc6IHJldHVybiBfZ2V0JElkT3JJZDtcbiAgICBjYXNlICdpZCc6IHJldHVybiBfZ2V0SWQ7XG4gICAgZGVmYXVsdDogcmV0dXJuIF9nZXQkSWQ7XG4gIH1cbn1cblxuLyogQHRoaXMgICBBanYgKi9cbmZ1bmN0aW9uIF9nZXRJZChzY2hlbWEpIHtcbiAgaWYgKHNjaGVtYS4kaWQpIHRoaXMubG9nZ2VyLndhcm4oJ3NjaGVtYSAkaWQgaWdub3JlZCcsIHNjaGVtYS4kaWQpO1xuICByZXR1cm4gc2NoZW1hLmlkO1xufVxuXG4vKiBAdGhpcyAgIEFqdiAqL1xuZnVuY3Rpb24gX2dldCRJZChzY2hlbWEpIHtcbiAgaWYgKHNjaGVtYS5pZCkgdGhpcy5sb2dnZXIud2Fybignc2NoZW1hIGlkIGlnbm9yZWQnLCBzY2hlbWEuaWQpO1xuICByZXR1cm4gc2NoZW1hLiRpZDtcbn1cblxuXG5mdW5jdGlvbiBfZ2V0JElkT3JJZChzY2hlbWEpIHtcbiAgaWYgKHNjaGVtYS4kaWQgJiYgc2NoZW1hLmlkICYmIHNjaGVtYS4kaWQgIT0gc2NoZW1hLmlkKVxuICAgIHRocm93IG5ldyBFcnJvcignc2NoZW1hICRpZCBpcyBkaWZmZXJlbnQgZnJvbSBpZCcpO1xuICByZXR1cm4gc2NoZW1hLiRpZCB8fCBzY2hlbWEuaWQ7XG59XG5cblxuLyoqXG4gKiBDb252ZXJ0IGFycmF5IG9mIGVycm9yIG1lc3NhZ2Ugb2JqZWN0cyB0byBzdHJpbmdcbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0gIHtBcnJheTxPYmplY3Q+fSBlcnJvcnMgb3B0aW9uYWwgYXJyYXkgb2YgdmFsaWRhdGlvbiBlcnJvcnMsIGlmIG5vdCBwYXNzZWQgZXJyb3JzIGZyb20gdGhlIGluc3RhbmNlIGFyZSB1c2VkLlxuICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zIG9wdGlvbmFsIG9wdGlvbnMgd2l0aCBwcm9wZXJ0aWVzIGBzZXBhcmF0b3JgIGFuZCBgZGF0YVZhcmAuXG4gKiBAcmV0dXJuIHtTdHJpbmd9IGh1bWFuIHJlYWRhYmxlIHN0cmluZyB3aXRoIGFsbCBlcnJvcnMgZGVzY3JpcHRpb25zXG4gKi9cbmZ1bmN0aW9uIGVycm9yc1RleHQoZXJyb3JzLCBvcHRpb25zKSB7XG4gIGVycm9ycyA9IGVycm9ycyB8fCB0aGlzLmVycm9ycztcbiAgaWYgKCFlcnJvcnMpIHJldHVybiAnTm8gZXJyb3JzJztcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBzZXBhcmF0b3IgPSBvcHRpb25zLnNlcGFyYXRvciA9PT0gdW5kZWZpbmVkID8gJywgJyA6IG9wdGlvbnMuc2VwYXJhdG9yO1xuICB2YXIgZGF0YVZhciA9IG9wdGlvbnMuZGF0YVZhciA9PT0gdW5kZWZpbmVkID8gJ2RhdGEnIDogb3B0aW9ucy5kYXRhVmFyO1xuXG4gIHZhciB0ZXh0ID0gJyc7XG4gIGZvciAodmFyIGk9MDsgaTxlcnJvcnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgZSA9IGVycm9yc1tpXTtcbiAgICBpZiAoZSkgdGV4dCArPSBkYXRhVmFyICsgZS5kYXRhUGF0aCArICcgJyArIGUubWVzc2FnZSArIHNlcGFyYXRvcjtcbiAgfVxuICByZXR1cm4gdGV4dC5zbGljZSgwLCAtc2VwYXJhdG9yLmxlbmd0aCk7XG59XG5cblxuLyoqXG4gKiBBZGQgY3VzdG9tIGZvcm1hdFxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIGZvcm1hdCBuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ3xSZWdFeHB8RnVuY3Rpb259IGZvcm1hdCBzdHJpbmcgaXMgY29udmVydGVkIHRvIFJlZ0V4cDsgZnVuY3Rpb24gc2hvdWxkIHJldHVybiBib29sZWFuICh0cnVlIHdoZW4gdmFsaWQpXG4gKiBAcmV0dXJuIHtBanZ9IHRoaXMgZm9yIG1ldGhvZCBjaGFpbmluZ1xuICovXG5mdW5jdGlvbiBhZGRGb3JtYXQobmFtZSwgZm9ybWF0KSB7XG4gIGlmICh0eXBlb2YgZm9ybWF0ID09ICdzdHJpbmcnKSBmb3JtYXQgPSBuZXcgUmVnRXhwKGZvcm1hdCk7XG4gIHRoaXMuX2Zvcm1hdHNbbmFtZV0gPSBmb3JtYXQ7XG4gIHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIGFkZERlZmF1bHRNZXRhU2NoZW1hKHNlbGYpIHtcbiAgdmFyICRkYXRhU2NoZW1hO1xuICBpZiAoc2VsZi5fb3B0cy4kZGF0YSkge1xuICAgICRkYXRhU2NoZW1hID0gcmVxdWlyZSgnLi9yZWZzL2RhdGEuanNvbicpO1xuICAgIHNlbGYuYWRkTWV0YVNjaGVtYSgkZGF0YVNjaGVtYSwgJGRhdGFTY2hlbWEuJGlkLCB0cnVlKTtcbiAgfVxuICBpZiAoc2VsZi5fb3B0cy5tZXRhID09PSBmYWxzZSkgcmV0dXJuO1xuICB2YXIgbWV0YVNjaGVtYSA9IHJlcXVpcmUoJy4vcmVmcy9qc29uLXNjaGVtYS1kcmFmdC0wNy5qc29uJyk7XG4gIGlmIChzZWxmLl9vcHRzLiRkYXRhKSBtZXRhU2NoZW1hID0gJGRhdGFNZXRhU2NoZW1hKG1ldGFTY2hlbWEsIE1FVEFfU1VQUE9SVF9EQVRBKTtcbiAgc2VsZi5hZGRNZXRhU2NoZW1hKG1ldGFTY2hlbWEsIE1FVEFfU0NIRU1BX0lELCB0cnVlKTtcbiAgc2VsZi5fcmVmc1snaHR0cDovL2pzb24tc2NoZW1hLm9yZy9zY2hlbWEnXSA9IE1FVEFfU0NIRU1BX0lEO1xufVxuXG5cbmZ1bmN0aW9uIGFkZEluaXRpYWxTY2hlbWFzKHNlbGYpIHtcbiAgdmFyIG9wdHNTY2hlbWFzID0gc2VsZi5fb3B0cy5zY2hlbWFzO1xuICBpZiAoIW9wdHNTY2hlbWFzKSByZXR1cm47XG4gIGlmIChBcnJheS5pc0FycmF5KG9wdHNTY2hlbWFzKSkgc2VsZi5hZGRTY2hlbWEob3B0c1NjaGVtYXMpO1xuICBlbHNlIGZvciAodmFyIGtleSBpbiBvcHRzU2NoZW1hcykgc2VsZi5hZGRTY2hlbWEob3B0c1NjaGVtYXNba2V5XSwga2V5KTtcbn1cblxuXG5mdW5jdGlvbiBhZGRJbml0aWFsRm9ybWF0cyhzZWxmKSB7XG4gIGZvciAodmFyIG5hbWUgaW4gc2VsZi5fb3B0cy5mb3JtYXRzKSB7XG4gICAgdmFyIGZvcm1hdCA9IHNlbGYuX29wdHMuZm9ybWF0c1tuYW1lXTtcbiAgICBzZWxmLmFkZEZvcm1hdChuYW1lLCBmb3JtYXQpO1xuICB9XG59XG5cblxuZnVuY3Rpb24gYWRkSW5pdGlhbEtleXdvcmRzKHNlbGYpIHtcbiAgZm9yICh2YXIgbmFtZSBpbiBzZWxmLl9vcHRzLmtleXdvcmRzKSB7XG4gICAgdmFyIGtleXdvcmQgPSBzZWxmLl9vcHRzLmtleXdvcmRzW25hbWVdO1xuICAgIHNlbGYuYWRkS2V5d29yZChuYW1lLCBrZXl3b3JkKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGNoZWNrVW5pcXVlKHNlbGYsIGlkKSB7XG4gIGlmIChzZWxmLl9zY2hlbWFzW2lkXSB8fCBzZWxmLl9yZWZzW2lkXSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NjaGVtYSB3aXRoIGtleSBvciBpZCBcIicgKyBpZCArICdcIiBhbHJlYWR5IGV4aXN0cycpO1xufVxuXG5cbmZ1bmN0aW9uIGdldE1ldGFTY2hlbWFPcHRpb25zKHNlbGYpIHtcbiAgdmFyIG1ldGFPcHRzID0gdXRpbC5jb3B5KHNlbGYuX29wdHMpO1xuICBmb3IgKHZhciBpPTA7IGk8TUVUQV9JR05PUkVfT1BUSU9OUy5sZW5ndGg7IGkrKylcbiAgICBkZWxldGUgbWV0YU9wdHNbTUVUQV9JR05PUkVfT1BUSU9OU1tpXV07XG4gIHJldHVybiBtZXRhT3B0cztcbn1cblxuXG5mdW5jdGlvbiBzZXRMb2dnZXIoc2VsZikge1xuICB2YXIgbG9nZ2VyID0gc2VsZi5fb3B0cy5sb2dnZXI7XG4gIGlmIChsb2dnZXIgPT09IGZhbHNlKSB7XG4gICAgc2VsZi5sb2dnZXIgPSB7bG9nOiBub29wLCB3YXJuOiBub29wLCBlcnJvcjogbm9vcH07XG4gIH0gZWxzZSB7XG4gICAgaWYgKGxvZ2dlciA9PT0gdW5kZWZpbmVkKSBsb2dnZXIgPSBjb25zb2xlO1xuICAgIGlmICghKHR5cGVvZiBsb2dnZXIgPT0gJ29iamVjdCcgJiYgbG9nZ2VyLmxvZyAmJiBsb2dnZXIud2FybiAmJiBsb2dnZXIuZXJyb3IpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdsb2dnZXIgbXVzdCBpbXBsZW1lbnQgbG9nLCB3YXJuIGFuZCBlcnJvciBtZXRob2RzJyk7XG4gICAgc2VsZi5sb2dnZXIgPSBsb2dnZXI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBub29wKCkge31cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9hanYuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYlwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxuXG52YXIgQ2FjaGUgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIENhY2hlKCkge1xuICB0aGlzLl9jYWNoZSA9IHt9O1xufTtcblxuXG5DYWNoZS5wcm90b3R5cGUucHV0ID0gZnVuY3Rpb24gQ2FjaGVfcHV0KGtleSwgdmFsdWUpIHtcbiAgdGhpcy5fY2FjaGVba2V5XSA9IHZhbHVlO1xufTtcblxuXG5DYWNoZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gQ2FjaGVfZ2V0KGtleSkge1xuICByZXR1cm4gdGhpcy5fY2FjaGVba2V5XTtcbn07XG5cblxuQ2FjaGUucHJvdG90eXBlLmRlbCA9IGZ1bmN0aW9uIENhY2hlX2RlbChrZXkpIHtcbiAgZGVsZXRlIHRoaXMuX2NhY2hlW2tleV07XG59O1xuXG5cbkNhY2hlLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uIENhY2hlX2NsZWFyKCkge1xuICB0aGlzLl9jYWNoZSA9IHt9O1xufTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jYWNoZS5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWlzc2luZ1JlZkVycm9yID0gcmVxdWlyZSgnLi9lcnJvcl9jbGFzc2VzJykuTWlzc2luZ1JlZjtcblxubW9kdWxlLmV4cG9ydHMgPSBjb21waWxlQXN5bmM7XG5cblxuLyoqXG4gKiBDcmVhdGVzIHZhbGlkYXRpbmcgZnVuY3Rpb24gZm9yIHBhc3NlZCBzY2hlbWEgd2l0aCBhc3luY2hyb25vdXMgbG9hZGluZyBvZiBtaXNzaW5nIHNjaGVtYXMuXG4gKiBgbG9hZFNjaGVtYWAgb3B0aW9uIHNob3VsZCBiZSBhIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyBzY2hlbWEgdXJpIGFuZCByZXR1cm5zIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aXRoIHRoZSBzY2hlbWEuXG4gKiBAdGhpcyAgQWp2XG4gKiBAcGFyYW0ge09iamVjdH0gICBzY2hlbWEgc2NoZW1hIG9iamVjdFxuICogQHBhcmFtIHtCb29sZWFufSAgbWV0YSBvcHRpb25hbCB0cnVlIHRvIGNvbXBpbGUgbWV0YS1zY2hlbWE7IHRoaXMgcGFyYW1ldGVyIGNhbiBiZSBza2lwcGVkXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBhbiBvcHRpb25hbCBub2RlLXN0eWxlIGNhbGxiYWNrLCBpdCBpcyBjYWxsZWQgd2l0aCAyIHBhcmFtZXRlcnM6IGVycm9yIChvciBudWxsKSBhbmQgdmFsaWRhdGluZyBmdW5jdGlvbi5cbiAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2UgdGhhdCByZXNvbHZlcyB3aXRoIGEgdmFsaWRhdGluZyBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gY29tcGlsZUFzeW5jKHNjaGVtYSwgbWV0YSwgY2FsbGJhY2spIHtcbiAgLyogZXNsaW50IG5vLXNoYWRvdzogMCAqL1xuICAvKiBnbG9iYWwgUHJvbWlzZSAqL1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHR5cGVvZiB0aGlzLl9vcHRzLmxvYWRTY2hlbWEgIT0gJ2Z1bmN0aW9uJylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ29wdGlvbnMubG9hZFNjaGVtYSBzaG91bGQgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICh0eXBlb2YgbWV0YSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBtZXRhO1xuICAgIG1ldGEgPSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YXIgcCA9IGxvYWRNZXRhU2NoZW1hT2Yoc2NoZW1hKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2NoZW1hT2JqID0gc2VsZi5fYWRkU2NoZW1hKHNjaGVtYSwgdW5kZWZpbmVkLCBtZXRhKTtcbiAgICByZXR1cm4gc2NoZW1hT2JqLnZhbGlkYXRlIHx8IF9jb21waWxlQXN5bmMoc2NoZW1hT2JqKTtcbiAgfSk7XG5cbiAgaWYgKGNhbGxiYWNrKSB7XG4gICAgcC50aGVuKFxuICAgICAgZnVuY3Rpb24odikgeyBjYWxsYmFjayhudWxsLCB2KTsgfSxcbiAgICAgIGNhbGxiYWNrXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBwO1xuXG5cbiAgZnVuY3Rpb24gbG9hZE1ldGFTY2hlbWFPZihzY2gpIHtcbiAgICB2YXIgJHNjaGVtYSA9IHNjaC4kc2NoZW1hO1xuICAgIHJldHVybiAkc2NoZW1hICYmICFzZWxmLmdldFNjaGVtYSgkc2NoZW1hKVxuICAgICAgICAgICAgPyBjb21waWxlQXN5bmMuY2FsbChzZWxmLCB7ICRyZWY6ICRzY2hlbWEgfSwgdHJ1ZSlcbiAgICAgICAgICAgIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIF9jb21waWxlQXN5bmMoc2NoZW1hT2JqKSB7XG4gICAgdHJ5IHsgcmV0dXJuIHNlbGYuX2NvbXBpbGUoc2NoZW1hT2JqKTsgfVxuICAgIGNhdGNoKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTWlzc2luZ1JlZkVycm9yKSByZXR1cm4gbG9hZE1pc3NpbmdTY2hlbWEoZSk7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gbG9hZE1pc3NpbmdTY2hlbWEoZSkge1xuICAgICAgdmFyIHJlZiA9IGUubWlzc2luZ1NjaGVtYTtcbiAgICAgIGlmIChhZGRlZChyZWYpKSB0aHJvdyBuZXcgRXJyb3IoJ1NjaGVtYSAnICsgcmVmICsgJyBpcyBsb2FkZWQgYnV0ICcgKyBlLm1pc3NpbmdSZWYgKyAnIGNhbm5vdCBiZSByZXNvbHZlZCcpO1xuXG4gICAgICB2YXIgc2NoZW1hUHJvbWlzZSA9IHNlbGYuX2xvYWRpbmdTY2hlbWFzW3JlZl07XG4gICAgICBpZiAoIXNjaGVtYVByb21pc2UpIHtcbiAgICAgICAgc2NoZW1hUHJvbWlzZSA9IHNlbGYuX2xvYWRpbmdTY2hlbWFzW3JlZl0gPSBzZWxmLl9vcHRzLmxvYWRTY2hlbWEocmVmKTtcbiAgICAgICAgc2NoZW1hUHJvbWlzZS50aGVuKHJlbW92ZVByb21pc2UsIHJlbW92ZVByb21pc2UpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gc2NoZW1hUHJvbWlzZS50aGVuKGZ1bmN0aW9uIChzY2gpIHtcbiAgICAgICAgaWYgKCFhZGRlZChyZWYpKSB7XG4gICAgICAgICAgcmV0dXJuIGxvYWRNZXRhU2NoZW1hT2Yoc2NoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghYWRkZWQocmVmKSkgc2VsZi5hZGRTY2hlbWEoc2NoLCByZWYsIHVuZGVmaW5lZCwgbWV0YSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfY29tcGlsZUFzeW5jKHNjaGVtYU9iaik7XG4gICAgICB9KTtcblxuICAgICAgZnVuY3Rpb24gcmVtb3ZlUHJvbWlzZSgpIHtcbiAgICAgICAgZGVsZXRlIHNlbGYuX2xvYWRpbmdTY2hlbWFzW3JlZl07XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGFkZGVkKHJlZikge1xuICAgICAgICByZXR1cm4gc2VsZi5fcmVmc1tyZWZdIHx8IHNlbGYuX3NjaGVtYXNbcmVmXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL2FzeW5jLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxudmFyIHJlc29sdmUgPSByZXF1aXJlKCcuL3Jlc29sdmUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFZhbGlkYXRpb246IGVycm9yU3ViY2xhc3MoVmFsaWRhdGlvbkVycm9yKSxcbiAgTWlzc2luZ1JlZjogZXJyb3JTdWJjbGFzcyhNaXNzaW5nUmVmRXJyb3IpXG59O1xuXG5cbmZ1bmN0aW9uIFZhbGlkYXRpb25FcnJvcihlcnJvcnMpIHtcbiAgdGhpcy5tZXNzYWdlID0gJ3ZhbGlkYXRpb24gZmFpbGVkJztcbiAgdGhpcy5lcnJvcnMgPSBlcnJvcnM7XG4gIHRoaXMuYWp2ID0gdGhpcy52YWxpZGF0aW9uID0gdHJ1ZTtcbn1cblxuXG5NaXNzaW5nUmVmRXJyb3IubWVzc2FnZSA9IGZ1bmN0aW9uIChiYXNlSWQsIHJlZikge1xuICByZXR1cm4gJ2NhblxcJ3QgcmVzb2x2ZSByZWZlcmVuY2UgJyArIHJlZiArICcgZnJvbSBpZCAnICsgYmFzZUlkO1xufTtcblxuXG5mdW5jdGlvbiBNaXNzaW5nUmVmRXJyb3IoYmFzZUlkLCByZWYsIG1lc3NhZ2UpIHtcbiAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZSB8fCBNaXNzaW5nUmVmRXJyb3IubWVzc2FnZShiYXNlSWQsIHJlZik7XG4gIHRoaXMubWlzc2luZ1JlZiA9IHJlc29sdmUudXJsKGJhc2VJZCwgcmVmKTtcbiAgdGhpcy5taXNzaW5nU2NoZW1hID0gcmVzb2x2ZS5ub3JtYWxpemVJZChyZXNvbHZlLmZ1bGxQYXRoKHRoaXMubWlzc2luZ1JlZikpO1xufVxuXG5cbmZ1bmN0aW9uIGVycm9yU3ViY2xhc3MoU3ViY2xhc3MpIHtcbiAgU3ViY2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuICBTdWJjbGFzcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdWJjbGFzcztcbiAgcmV0dXJuIFN1YmNsYXNzO1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvZXJyb3JfY2xhc3Nlcy5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGVcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbnZhciBEQVRFID0gL14oXFxkXFxkXFxkXFxkKS0oXFxkXFxkKS0oXFxkXFxkKSQvO1xudmFyIERBWVMgPSBbMCwzMSwyOCwzMSwzMCwzMSwzMCwzMSwzMSwzMCwzMSwzMCwzMV07XG52YXIgVElNRSA9IC9eKFxcZFxcZCk6KFxcZFxcZCk6KFxcZFxcZCkoXFwuXFxkKyk/KHp8WystXVxcZFxcZCg/Ojo/XFxkXFxkKT8pPyQvaTtcbnZhciBIT1NUTkFNRSA9IC9eKD89LnsxLDI1M31cXC4/JClbYS16MC05XSg/OlthLXowLTktXXswLDYxfVthLXowLTldKT8oPzpcXC5bYS16MC05XSg/OlstMC05YS16XXswLDYxfVswLTlhLXpdKT8pKlxcLj8kL2k7XG52YXIgVVJJID0gL14oPzpbYS16XVthLXowLTkrXFwtLl0qOikoPzpcXC8/XFwvKD86KD86W2EtejAtOVxcLS5ffiEkJicoKSorLDs9Ol18JVswLTlhLWZdezJ9KSpAKT8oPzpcXFsoPzooPzooPzooPzpbMC05YS1mXXsxLDR9Oil7Nn18OjooPzpbMC05YS1mXXsxLDR9Oil7NX18KD86WzAtOWEtZl17MSw0fSk/OjooPzpbMC05YS1mXXsxLDR9Oil7NH18KD86KD86WzAtOWEtZl17MSw0fTopezAsMX1bMC05YS1mXXsxLDR9KT86Oig/OlswLTlhLWZdezEsNH06KXszfXwoPzooPzpbMC05YS1mXXsxLDR9Oil7MCwyfVswLTlhLWZdezEsNH0pPzo6KD86WzAtOWEtZl17MSw0fTopezJ9fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDN9WzAtOWEtZl17MSw0fSk/OjpbMC05YS1mXXsxLDR9OnwoPzooPzpbMC05YS1mXXsxLDR9Oil7MCw0fVswLTlhLWZdezEsNH0pPzo6KSg/OlswLTlhLWZdezEsNH06WzAtOWEtZl17MSw0fXwoPzooPzoyNVswLTVdfDJbMC00XVxcZHxbMDFdP1xcZFxcZD8pXFwuKXszfSg/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPykpfCg/Oig/OlswLTlhLWZdezEsNH06KXswLDV9WzAtOWEtZl17MSw0fSk/OjpbMC05YS1mXXsxLDR9fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDZ9WzAtOWEtZl17MSw0fSk/OjopfFtWdl1bMC05YS1mXStcXC5bYS16MC05XFwtLl9+ISQmJygpKissOz06XSspXFxdfCg/Oig/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPylcXC4pezN9KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KXwoPzpbYS16MC05XFwtLl9+ISQmJygpKissOz1dfCVbMC05YS1mXXsyfSkqKSg/OjpcXGQqKT8oPzpcXC8oPzpbYS16MC05XFwtLl9+ISQmJygpKissOz06QF18JVswLTlhLWZdezJ9KSopKnxcXC8oPzooPzpbYS16MC05XFwtLl9+ISQmJygpKissOz06QF18JVswLTlhLWZdezJ9KSsoPzpcXC8oPzpbYS16MC05XFwtLl9+ISQmJygpKissOz06QF18JVswLTlhLWZdezJ9KSopKik/fCg/OlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKyg/OlxcLyg/OlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKikqKSg/OlxcPyg/OlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpALz9dfCVbMC05YS1mXXsyfSkqKT8oPzojKD86W2EtejAtOVxcLS5ffiEkJicoKSorLDs9OkAvP118JVswLTlhLWZdezJ9KSopPyQvaTtcbnZhciBVUklSRUYgPSAvXig/OlthLXpdW2EtejAtOStcXC0uXSo6KT8oPzpcXC8/XFwvKD86KD86W2EtejAtOVxcLS5ffiEkJicoKSorLDs9Ol18JVswLTlhLWZdezJ9KSpAKT8oPzpcXFsoPzooPzooPzooPzpbMC05YS1mXXsxLDR9Oil7Nn18OjooPzpbMC05YS1mXXsxLDR9Oil7NX18KD86WzAtOWEtZl17MSw0fSk/OjooPzpbMC05YS1mXXsxLDR9Oil7NH18KD86KD86WzAtOWEtZl17MSw0fTopezAsMX1bMC05YS1mXXsxLDR9KT86Oig/OlswLTlhLWZdezEsNH06KXszfXwoPzooPzpbMC05YS1mXXsxLDR9Oil7MCwyfVswLTlhLWZdezEsNH0pPzo6KD86WzAtOWEtZl17MSw0fTopezJ9fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDN9WzAtOWEtZl17MSw0fSk/OjpbMC05YS1mXXsxLDR9OnwoPzooPzpbMC05YS1mXXsxLDR9Oil7MCw0fVswLTlhLWZdezEsNH0pPzo6KSg/OlswLTlhLWZdezEsNH06WzAtOWEtZl17MSw0fXwoPzooPzoyNVswLTVdfDJbMC00XVxcZHxbMDFdP1xcZFxcZD8pXFwuKXszfSg/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPykpfCg/Oig/OlswLTlhLWZdezEsNH06KXswLDV9WzAtOWEtZl17MSw0fSk/OjpbMC05YS1mXXsxLDR9fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDZ9WzAtOWEtZl17MSw0fSk/OjopfFtWdl1bMC05YS1mXStcXC5bYS16MC05XFwtLl9+ISQmJygpKissOz06XSspXFxdfCg/Oig/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPylcXC4pezN9KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KXwoPzpbYS16MC05XFwtLl9+ISQmJ1wiKCkqKyw7PV18JVswLTlhLWZdezJ9KSopKD86OlxcZCopPyg/OlxcLyg/OlthLXowLTlcXC0uX34hJCYnXCIoKSorLDs9OkBdfCVbMC05YS1mXXsyfSkqKSp8XFwvKD86KD86W2EtejAtOVxcLS5ffiEkJidcIigpKissOz06QF18JVswLTlhLWZdezJ9KSsoPzpcXC8oPzpbYS16MC05XFwtLl9+ISQmJ1wiKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKikqKT98KD86W2EtejAtOVxcLS5ffiEkJidcIigpKissOz06QF18JVswLTlhLWZdezJ9KSsoPzpcXC8oPzpbYS16MC05XFwtLl9+ISQmJ1wiKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKikqKT8oPzpcXD8oPzpbYS16MC05XFwtLl9+ISQmJ1wiKCkqKyw7PTpALz9dfCVbMC05YS1mXXsyfSkqKT8oPzojKD86W2EtejAtOVxcLS5ffiEkJidcIigpKissOz06QC8/XXwlWzAtOWEtZl17Mn0pKik/JC9pO1xuLy8gdXJpLXRlbXBsYXRlOiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjU3MFxudmFyIFVSSVRFTVBMQVRFID0gL14oPzooPzpbXlxceDAwLVxceDIwXCInPD4lXFxcXF5ge3x9XXwlWzAtOWEtZl17Mn0pfFxce1srIy4vOz8mPSwhQHxdPyg/OlthLXowLTlfXXwlWzAtOWEtZl17Mn0pKyg/OjpbMS05XVswLTldezAsM318XFwqKT8oPzosKD86W2EtejAtOV9dfCVbMC05YS1mXXsyfSkrKD86OlsxLTldWzAtOV17MCwzfXxcXCopPykqXFx9KSokL2k7XG4vLyBGb3IgdGhlIHNvdXJjZTogaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vZHBlcmluaS83MjkyOTRcbi8vIEZvciB0ZXN0IGNhc2VzOiBodHRwczovL21hdGhpYXNieW5lbnMuYmUvZGVtby91cmwtcmVnZXhcbi8vIEB0b2RvIERlbGV0ZSBjdXJyZW50IFVSTCBpbiBmYXZvdXIgb2YgdGhlIGNvbW1lbnRlZCBvdXQgVVJMIHJ1bGUgd2hlbiB0aGlzIGlzc3VlIGlzIGZpeGVkIGh0dHBzOi8vZ2l0aHViLmNvbS9lc2xpbnQvZXNsaW50L2lzc3Vlcy83OTgzLlxuLy8gdmFyIFVSTCA9IC9eKD86KD86aHR0cHM/fGZ0cCk6XFwvXFwvKSg/OlxcUysoPzo6XFxTKik/QCk/KD86KD8hMTAoPzpcXC5cXGR7MSwzfSl7M30pKD8hMTI3KD86XFwuXFxkezEsM30pezN9KSg/ITE2OVxcLjI1NCg/OlxcLlxcZHsxLDN9KXsyfSkoPyExOTJcXC4xNjgoPzpcXC5cXGR7MSwzfSl7Mn0pKD8hMTcyXFwuKD86MVs2LTldfDJcXGR8M1swLTFdKSg/OlxcLlxcZHsxLDN9KXsyfSkoPzpbMS05XVxcZD98MVxcZFxcZHwyWzAxXVxcZHwyMlswLTNdKSg/OlxcLig/OjE/XFxkezEsMn18MlswLTRdXFxkfDI1WzAtNV0pKXsyfSg/OlxcLig/OlsxLTldXFxkP3wxXFxkXFxkfDJbMC00XVxcZHwyNVswLTRdKSl8KD86KD86W2EtelxcdXswMGExfS1cXHV7ZmZmZn0wLTldKy0pKlthLXpcXHV7MDBhMX0tXFx1e2ZmZmZ9MC05XSspKD86XFwuKD86W2EtelxcdXswMGExfS1cXHV7ZmZmZn0wLTldKy0pKlthLXpcXHV7MDBhMX0tXFx1e2ZmZmZ9MC05XSspKig/OlxcLig/OlthLXpcXHV7MDBhMX0tXFx1e2ZmZmZ9XXsyLH0pKSkoPzo6XFxkezIsNX0pPyg/OlxcL1teXFxzXSopPyQvaXU7XG52YXIgVVJMID0gL14oPzooPzpodHRwW3NcXHUwMTdGXT98ZnRwKTpcXC9cXC8pKD86KD86W1xcMC1cXHgwOFxceDBFLVxceDFGIS1cXHg5RlxceEExLVxcdTE2N0ZcXHUxNjgxLVxcdTFGRkZcXHUyMDBCLVxcdTIwMjdcXHUyMDJBLVxcdTIwMkVcXHUyMDMwLVxcdTIwNUVcXHUyMDYwLVxcdTJGRkZcXHUzMDAxLVxcdUQ3RkZcXHVFMDAwLVxcdUZFRkVcXHVGRjAwLVxcdUZGRkZdfFtcXHVEODAwLVxcdURCRkZdW1xcdURDMDAtXFx1REZGRl18W1xcdUQ4MDAtXFx1REJGRl0oPyFbXFx1REMwMC1cXHVERkZGXSl8KD86W15cXHVEODAwLVxcdURCRkZdfF4pW1xcdURDMDAtXFx1REZGRl0pKyg/OjooPzpbXFwwLVxceDA4XFx4MEUtXFx4MUYhLVxceDlGXFx4QTEtXFx1MTY3RlxcdTE2ODEtXFx1MUZGRlxcdTIwMEItXFx1MjAyN1xcdTIwMkEtXFx1MjAyRVxcdTIwMzAtXFx1MjA1RVxcdTIwNjAtXFx1MkZGRlxcdTMwMDEtXFx1RDdGRlxcdUUwMDAtXFx1RkVGRVxcdUZGMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl1bXFx1REMwMC1cXHVERkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkqKT9AKT8oPzooPyExMCg/OlxcLlswLTldezEsM30pezN9KSg/ITEyNyg/OlxcLlswLTldezEsM30pezN9KSg/ITE2OVxcLjI1NCg/OlxcLlswLTldezEsM30pezJ9KSg/ITE5MlxcLjE2OCg/OlxcLlswLTldezEsM30pezJ9KSg/ITE3MlxcLig/OjFbNi05XXwyWzAtOV18M1swMV0pKD86XFwuWzAtOV17MSwzfSl7Mn0pKD86WzEtOV1bMC05XT98MVswLTldWzAtOV18MlswMV1bMC05XXwyMlswLTNdKSg/OlxcLig/OjE/WzAtOV17MSwyfXwyWzAtNF1bMC05XXwyNVswLTVdKSl7Mn0oPzpcXC4oPzpbMS05XVswLTldP3wxWzAtOV1bMC05XXwyWzAtNF1bMC05XXwyNVswLTRdKSl8KD86KD86KD86WzAtOWEtelxceEExLVxcdUQ3RkZcXHVFMDAwLVxcdUZGRkZdfFtcXHVEODAwLVxcdURCRkZdKD8hW1xcdURDMDAtXFx1REZGRl0pfCg/OlteXFx1RDgwMC1cXHVEQkZGXXxeKVtcXHVEQzAwLVxcdURGRkZdKSstKSooPzpbMC05YS16XFx4QTEtXFx1RDdGRlxcdUUwMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl0oPyFbXFx1REMwMC1cXHVERkZGXSl8KD86W15cXHVEODAwLVxcdURCRkZdfF4pW1xcdURDMDAtXFx1REZGRl0pKykoPzpcXC4oPzooPzpbMC05YS16XFx4QTEtXFx1RDdGRlxcdUUwMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl0oPyFbXFx1REMwMC1cXHVERkZGXSl8KD86W15cXHVEODAwLVxcdURCRkZdfF4pW1xcdURDMDAtXFx1REZGRl0pKy0pKig/OlswLTlhLXpcXHhBMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkrKSooPzpcXC4oPzooPzpbYS16XFx4QTEtXFx1RDdGRlxcdUUwMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl0oPyFbXFx1REMwMC1cXHVERkZGXSl8KD86W15cXHVEODAwLVxcdURCRkZdfF4pW1xcdURDMDAtXFx1REZGRl0pezIsfSkpKSg/OjpbMC05XXsyLDV9KT8oPzpcXC8oPzpbXFwwLVxceDA4XFx4MEUtXFx4MUYhLVxceDlGXFx4QTEtXFx1MTY3RlxcdTE2ODEtXFx1MUZGRlxcdTIwMEItXFx1MjAyN1xcdTIwMkEtXFx1MjAyRVxcdTIwMzAtXFx1MjA1RVxcdTIwNjAtXFx1MkZGRlxcdTMwMDEtXFx1RDdGRlxcdUUwMDAtXFx1RkVGRVxcdUZGMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl1bXFx1REMwMC1cXHVERkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkqKT8kL2k7XG52YXIgVVVJRCA9IC9eKD86dXJuOnV1aWQ6KT9bMC05YS1mXXs4fS0oPzpbMC05YS1mXXs0fS0pezN9WzAtOWEtZl17MTJ9JC9pO1xudmFyIEpTT05fUE9JTlRFUiA9IC9eKD86XFwvKD86W15+L118fjB8fjEpKikqJC87XG52YXIgSlNPTl9QT0lOVEVSX1VSSV9GUkFHTUVOVCA9IC9eIyg/OlxcLyg/OlthLXowLTlfXFwtLiEkJicoKSorLDs6PUBdfCVbMC05YS1mXXsyfXx+MHx+MSkqKSokL2k7XG52YXIgUkVMQVRJVkVfSlNPTl9QT0lOVEVSID0gL14oPzowfFsxLTldWzAtOV0qKSg/OiN8KD86XFwvKD86W15+L118fjB8fjEpKikqKSQvO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZm9ybWF0cztcblxuZnVuY3Rpb24gZm9ybWF0cyhtb2RlKSB7XG4gIG1vZGUgPSBtb2RlID09ICdmdWxsJyA/ICdmdWxsJyA6ICdmYXN0JztcbiAgcmV0dXJuIHV0aWwuY29weShmb3JtYXRzW21vZGVdKTtcbn1cblxuXG5mb3JtYXRzLmZhc3QgPSB7XG4gIC8vIGRhdGU6IGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzMzMzkjc2VjdGlvbi01LjZcbiAgZGF0ZTogL15cXGRcXGRcXGRcXGQtWzAtMV1cXGQtWzAtM11cXGQkLyxcbiAgLy8gZGF0ZS10aW1lOiBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzMzM5I3NlY3Rpb24tNS42XG4gIHRpbWU6IC9eKD86WzAtMl1cXGQ6WzAtNV1cXGQ6WzAtNV1cXGR8MjM6NTk6NjApKD86XFwuXFxkKyk/KD86enxbKy1dXFxkXFxkKD86Oj9cXGRcXGQpPyk/JC9pLFxuICAnZGF0ZS10aW1lJzogL15cXGRcXGRcXGRcXGQtWzAtMV1cXGQtWzAtM11cXGRbdFxcc10oPzpbMC0yXVxcZDpbMC01XVxcZDpbMC01XVxcZHwyMzo1OTo2MCkoPzpcXC5cXGQrKT8oPzp6fFsrLV1cXGRcXGQoPzo6P1xcZFxcZCk/KSQvaSxcbiAgLy8gdXJpOiBodHRwczovL2dpdGh1Yi5jb20vbWFmaW50b3NoL2lzLW15LWpzb24tdmFsaWQvYmxvYi9tYXN0ZXIvZm9ybWF0cy5qc1xuICB1cmk6IC9eKD86W2Etel1bYS16MC05K1xcLS5dKjopKD86XFwvP1xcLyk/W15cXHNdKiQvaSxcbiAgJ3VyaS1yZWZlcmVuY2UnOiAvXig/Oig/OlthLXpdW2EtejAtOStcXC0uXSo6KT9cXC8/XFwvKT8oPzpbXlxcXFxcXHMjXVteXFxzI10qKT8oPzojW15cXFxcXFxzXSopPyQvaSxcbiAgJ3VyaS10ZW1wbGF0ZSc6IFVSSVRFTVBMQVRFLFxuICB1cmw6IFVSTCxcbiAgLy8gZW1haWwgKHNvdXJjZXMgZnJvbSBqc2VuIHZhbGlkYXRvcik6XG4gIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMjAxMzIzL3VzaW5nLWEtcmVndWxhci1leHByZXNzaW9uLXRvLXZhbGlkYXRlLWFuLWVtYWlsLWFkZHJlc3MjYW5zd2VyLTg4MjkzNjNcbiAgLy8gaHR0cDovL3d3dy53My5vcmcvVFIvaHRtbDUvZm9ybXMuaHRtbCN2YWxpZC1lLW1haWwtYWRkcmVzcyAoc2VhcmNoIGZvciAnd2lsbGZ1bCB2aW9sYXRpb24nKVxuICBlbWFpbDogL15bYS16MC05LiEjJCUmJyorLz0/Xl9ge3x9fi1dK0BbYS16MC05XSg/OlthLXowLTktXXswLDYxfVthLXowLTldKT8oPzpcXC5bYS16MC05XSg/OlthLXowLTktXXswLDYxfVthLXowLTldKT8pKiQvaSxcbiAgaG9zdG5hbWU6IEhPU1ROQU1FLFxuICAvLyBvcHRpbWl6ZWQgaHR0cHM6Ly93d3cuc2FmYXJpYm9va3NvbmxpbmUuY29tL2xpYnJhcnkvdmlldy9yZWd1bGFyLWV4cHJlc3Npb25zLWNvb2tib29rLzk3ODA1OTY4MDI4MzcvY2gwN3MxNi5odG1sXG4gIGlwdjQ6IC9eKD86KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KVxcLil7M30oPzoyNVswLTVdfDJbMC00XVxcZHxbMDFdP1xcZFxcZD8pJC8sXG4gIC8vIG9wdGltaXplZCBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzUzNDk3L3JlZ3VsYXItZXhwcmVzc2lvbi10aGF0LW1hdGNoZXMtdmFsaWQtaXB2Ni1hZGRyZXNzZXNcbiAgaXB2NjogL15cXHMqKD86KD86KD86WzAtOWEtZl17MSw0fTopezd9KD86WzAtOWEtZl17MSw0fXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezZ9KD86OlswLTlhLWZdezEsNH18KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSl8OikpfCg/Oig/OlswLTlhLWZdezEsNH06KXs1fSg/Oig/Oig/OjpbMC05YS1mXXsxLDR9KXsxLDJ9KXw6KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSl8OikpfCg/Oig/OlswLTlhLWZdezEsNH06KXs0fSg/Oig/Oig/OjpbMC05YS1mXXsxLDR9KXsxLDN9KXwoPzooPzo6WzAtOWEtZl17MSw0fSk/Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezN9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsNH0pfCg/Oig/OjpbMC05YS1mXXsxLDR9KXswLDJ9Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezJ9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsNX0pfCg/Oig/OjpbMC05YS1mXXsxLDR9KXswLDN9Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezF9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsNn0pfCg/Oig/OjpbMC05YS1mXXsxLDR9KXswLDR9Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSl8KD86Oig/Oig/Oig/OjpbMC05YS1mXXsxLDR9KXsxLDd9KXwoPzooPzo6WzAtOWEtZl17MSw0fSl7MCw1fTooPzooPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoPzpcXC4oPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KSl8OikpKSg/OiUuKyk/XFxzKiQvaSxcbiAgcmVnZXg6IHJlZ2V4LFxuICAvLyB1dWlkOiBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM0MTIyXG4gIHV1aWQ6IFVVSUQsXG4gIC8vIEpTT04tcG9pbnRlcjogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDFcbiAgLy8gdXJpIGZyYWdtZW50OiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzk4NiNhcHBlbmRpeC1BXG4gICdqc29uLXBvaW50ZXInOiBKU09OX1BPSU5URVIsXG4gICdqc29uLXBvaW50ZXItdXJpLWZyYWdtZW50JzogSlNPTl9QT0lOVEVSX1VSSV9GUkFHTUVOVCxcbiAgLy8gcmVsYXRpdmUgSlNPTi1wb2ludGVyOiBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9kcmFmdC1sdWZmLXJlbGF0aXZlLWpzb24tcG9pbnRlci0wMFxuICAncmVsYXRpdmUtanNvbi1wb2ludGVyJzogUkVMQVRJVkVfSlNPTl9QT0lOVEVSXG59O1xuXG5cbmZvcm1hdHMuZnVsbCA9IHtcbiAgZGF0ZTogZGF0ZSxcbiAgdGltZTogdGltZSxcbiAgJ2RhdGUtdGltZSc6IGRhdGVfdGltZSxcbiAgdXJpOiB1cmksXG4gICd1cmktcmVmZXJlbmNlJzogVVJJUkVGLFxuICAndXJpLXRlbXBsYXRlJzogVVJJVEVNUExBVEUsXG4gIHVybDogVVJMLFxuICBlbWFpbDogL15bYS16MC05ISMkJSYnKisvPT9eX2B7fH1+LV0rKD86XFwuW2EtejAtOSEjJCUmJyorLz0/Xl9ge3x9fi1dKykqQCg/OlthLXowLTldKD86W2EtejAtOS1dKlthLXowLTldKT9cXC4pK1thLXowLTldKD86W2EtejAtOS1dKlthLXowLTldKT8kL2ksXG4gIGhvc3RuYW1lOiBIT1NUTkFNRSxcbiAgaXB2NDogL14oPzooPzoyNVswLTVdfDJbMC00XVxcZHxbMDFdP1xcZFxcZD8pXFwuKXszfSg/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPykkLyxcbiAgaXB2NjogL15cXHMqKD86KD86KD86WzAtOWEtZl17MSw0fTopezd9KD86WzAtOWEtZl17MSw0fXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezZ9KD86OlswLTlhLWZdezEsNH18KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSl8OikpfCg/Oig/OlswLTlhLWZdezEsNH06KXs1fSg/Oig/Oig/OjpbMC05YS1mXXsxLDR9KXsxLDJ9KXw6KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSl8OikpfCg/Oig/OlswLTlhLWZdezEsNH06KXs0fSg/Oig/Oig/OjpbMC05YS1mXXsxLDR9KXsxLDN9KXwoPzooPzo6WzAtOWEtZl17MSw0fSk/Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezN9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsNH0pfCg/Oig/OjpbMC05YS1mXXsxLDR9KXswLDJ9Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezJ9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsNX0pfCg/Oig/OjpbMC05YS1mXXsxLDR9KXswLDN9Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezF9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsNn0pfCg/Oig/OjpbMC05YS1mXXsxLDR9KXswLDR9Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSl8KD86Oig/Oig/Oig/OjpbMC05YS1mXXsxLDR9KXsxLDd9KXwoPzooPzo6WzAtOWEtZl17MSw0fSl7MCw1fTooPzooPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoPzpcXC4oPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KSl8OikpKSg/OiUuKyk/XFxzKiQvaSxcbiAgcmVnZXg6IHJlZ2V4LFxuICB1dWlkOiBVVUlELFxuICAnanNvbi1wb2ludGVyJzogSlNPTl9QT0lOVEVSLFxuICAnanNvbi1wb2ludGVyLXVyaS1mcmFnbWVudCc6IEpTT05fUE9JTlRFUl9VUklfRlJBR01FTlQsXG4gICdyZWxhdGl2ZS1qc29uLXBvaW50ZXInOiBSRUxBVElWRV9KU09OX1BPSU5URVJcbn07XG5cblxuZnVuY3Rpb24gaXNMZWFwWWVhcih5ZWFyKSB7XG4gIC8vIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzMzM5I2FwcGVuZGl4LUNcbiAgcmV0dXJuIHllYXIgJSA0ID09PSAwICYmICh5ZWFyICUgMTAwICE9PSAwIHx8IHllYXIgJSA0MDAgPT09IDApO1xufVxuXG5cbmZ1bmN0aW9uIGRhdGUoc3RyKSB7XG4gIC8vIGZ1bGwtZGF0ZSBmcm9tIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzMzMzkjc2VjdGlvbi01LjZcbiAgdmFyIG1hdGNoZXMgPSBzdHIubWF0Y2goREFURSk7XG4gIGlmICghbWF0Y2hlcykgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciB5ZWFyID0gK21hdGNoZXNbMV07XG4gIHZhciBtb250aCA9ICttYXRjaGVzWzJdO1xuICB2YXIgZGF5ID0gK21hdGNoZXNbM107XG5cbiAgcmV0dXJuIG1vbnRoID49IDEgJiYgbW9udGggPD0gMTIgJiYgZGF5ID49IDEgJiZcbiAgICAgICAgICBkYXkgPD0gKG1vbnRoID09IDIgJiYgaXNMZWFwWWVhcih5ZWFyKSA/IDI5IDogREFZU1ttb250aF0pO1xufVxuXG5cbmZ1bmN0aW9uIHRpbWUoc3RyLCBmdWxsKSB7XG4gIHZhciBtYXRjaGVzID0gc3RyLm1hdGNoKFRJTUUpO1xuICBpZiAoIW1hdGNoZXMpIHJldHVybiBmYWxzZTtcblxuICB2YXIgaG91ciA9IG1hdGNoZXNbMV07XG4gIHZhciBtaW51dGUgPSBtYXRjaGVzWzJdO1xuICB2YXIgc2Vjb25kID0gbWF0Y2hlc1szXTtcbiAgdmFyIHRpbWVab25lID0gbWF0Y2hlc1s1XTtcbiAgcmV0dXJuICgoaG91ciA8PSAyMyAmJiBtaW51dGUgPD0gNTkgJiYgc2Vjb25kIDw9IDU5KSB8fFxuICAgICAgICAgIChob3VyID09IDIzICYmIG1pbnV0ZSA9PSA1OSAmJiBzZWNvbmQgPT0gNjApKSAmJlxuICAgICAgICAgKCFmdWxsIHx8IHRpbWVab25lKTtcbn1cblxuXG52YXIgREFURV9USU1FX1NFUEFSQVRPUiA9IC90fFxccy9pO1xuZnVuY3Rpb24gZGF0ZV90aW1lKHN0cikge1xuICAvLyBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzMzM5I3NlY3Rpb24tNS42XG4gIHZhciBkYXRlVGltZSA9IHN0ci5zcGxpdChEQVRFX1RJTUVfU0VQQVJBVE9SKTtcbiAgcmV0dXJuIGRhdGVUaW1lLmxlbmd0aCA9PSAyICYmIGRhdGUoZGF0ZVRpbWVbMF0pICYmIHRpbWUoZGF0ZVRpbWVbMV0sIHRydWUpO1xufVxuXG5cbnZhciBOT1RfVVJJX0ZSQUdNRU5UID0gL1xcL3w6LztcbmZ1bmN0aW9uIHVyaShzdHIpIHtcbiAgLy8gaHR0cDovL2ptcndhcmUuY29tL2FydGljbGVzLzIwMDkvdXJpX3JlZ2V4cC9VUklfcmVnZXguaHRtbCArIG9wdGlvbmFsIHByb3RvY29sICsgcmVxdWlyZWQgXCIuXCJcbiAgcmV0dXJuIE5PVF9VUklfRlJBR01FTlQudGVzdChzdHIpICYmIFVSSS50ZXN0KHN0cik7XG59XG5cblxudmFyIFpfQU5DSE9SID0gL1teXFxcXF1cXFxcWi87XG5mdW5jdGlvbiByZWdleChzdHIpIHtcbiAgaWYgKFpfQU5DSE9SLnRlc3Qoc3RyKSkgcmV0dXJuIGZhbHNlO1xuICB0cnkge1xuICAgIG5ldyBSZWdFeHAoc3RyKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS9mb3JtYXRzLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxudmFyIHJlc29sdmUgPSByZXF1aXJlKCcuL3Jlc29sdmUnKVxuICAsIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxuICAsIGVycm9yQ2xhc3NlcyA9IHJlcXVpcmUoJy4vZXJyb3JfY2xhc3NlcycpXG4gICwgc3RhYmxlU3RyaW5naWZ5ID0gcmVxdWlyZSgnZmFzdC1qc29uLXN0YWJsZS1zdHJpbmdpZnknKTtcblxudmFyIHZhbGlkYXRlR2VuZXJhdG9yID0gcmVxdWlyZSgnLi4vZG90anMvdmFsaWRhdGUnKTtcblxuLyoqXG4gKiBGdW5jdGlvbnMgYmVsb3cgYXJlIHVzZWQgaW5zaWRlIGNvbXBpbGVkIHZhbGlkYXRpb25zIGZ1bmN0aW9uXG4gKi9cblxudmFyIHVjczJsZW5ndGggPSB1dGlsLnVjczJsZW5ndGg7XG52YXIgZXF1YWwgPSByZXF1aXJlKCdmYXN0LWRlZXAtZXF1YWwnKTtcblxuLy8gdGhpcyBlcnJvciBpcyB0aHJvd24gYnkgYXN5bmMgc2NoZW1hcyB0byByZXR1cm4gdmFsaWRhdGlvbiBlcnJvcnMgdmlhIGV4Y2VwdGlvblxudmFyIFZhbGlkYXRpb25FcnJvciA9IGVycm9yQ2xhc3Nlcy5WYWxpZGF0aW9uO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBpbGU7XG5cblxuLyoqXG4gKiBDb21waWxlcyBzY2hlbWEgdG8gdmFsaWRhdGlvbiBmdW5jdGlvblxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSAge09iamVjdH0gc2NoZW1hIHNjaGVtYSBvYmplY3RcbiAqIEBwYXJhbSAge09iamVjdH0gcm9vdCBvYmplY3Qgd2l0aCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgcm9vdCBzY2hlbWEgZm9yIHRoaXMgc2NoZW1hXG4gKiBAcGFyYW0gIHtPYmplY3R9IGxvY2FsUmVmcyB0aGUgaGFzaCBvZiBsb2NhbCByZWZlcmVuY2VzIGluc2lkZSB0aGUgc2NoZW1hIChjcmVhdGVkIGJ5IHJlc29sdmUuaWQpLCB1c2VkIGZvciBpbmxpbmUgcmVzb2x1dGlvblxuICogQHBhcmFtICB7U3RyaW5nfSBiYXNlSWQgYmFzZSBJRCBmb3IgSURzIGluIHRoZSBzY2hlbWFcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSB2YWxpZGF0aW9uIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGUoc2NoZW1hLCByb290LCBsb2NhbFJlZnMsIGJhc2VJZCkge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlLCBldmlsOiB0cnVlICovXG4gIC8qIGVzbGludCBuby1zaGFkb3c6IDAgKi9cbiAgdmFyIHNlbGYgPSB0aGlzXG4gICAgLCBvcHRzID0gdGhpcy5fb3B0c1xuICAgICwgcmVmVmFsID0gWyB1bmRlZmluZWQgXVxuICAgICwgcmVmcyA9IHt9XG4gICAgLCBwYXR0ZXJucyA9IFtdXG4gICAgLCBwYXR0ZXJuc0hhc2ggPSB7fVxuICAgICwgZGVmYXVsdHMgPSBbXVxuICAgICwgZGVmYXVsdHNIYXNoID0ge31cbiAgICAsIGN1c3RvbVJ1bGVzID0gW107XG5cbiAgcm9vdCA9IHJvb3QgfHwgeyBzY2hlbWE6IHNjaGVtYSwgcmVmVmFsOiByZWZWYWwsIHJlZnM6IHJlZnMgfTtcblxuICB2YXIgYyA9IGNoZWNrQ29tcGlsaW5nLmNhbGwodGhpcywgc2NoZW1hLCByb290LCBiYXNlSWQpO1xuICB2YXIgY29tcGlsYXRpb24gPSB0aGlzLl9jb21waWxhdGlvbnNbYy5pbmRleF07XG4gIGlmIChjLmNvbXBpbGluZykgcmV0dXJuIChjb21waWxhdGlvbi5jYWxsVmFsaWRhdGUgPSBjYWxsVmFsaWRhdGUpO1xuXG4gIHZhciBmb3JtYXRzID0gdGhpcy5fZm9ybWF0cztcbiAgdmFyIFJVTEVTID0gdGhpcy5SVUxFUztcblxuICB0cnkge1xuICAgIHZhciB2ID0gbG9jYWxDb21waWxlKHNjaGVtYSwgcm9vdCwgbG9jYWxSZWZzLCBiYXNlSWQpO1xuICAgIGNvbXBpbGF0aW9uLnZhbGlkYXRlID0gdjtcbiAgICB2YXIgY3YgPSBjb21waWxhdGlvbi5jYWxsVmFsaWRhdGU7XG4gICAgaWYgKGN2KSB7XG4gICAgICBjdi5zY2hlbWEgPSB2LnNjaGVtYTtcbiAgICAgIGN2LmVycm9ycyA9IG51bGw7XG4gICAgICBjdi5yZWZzID0gdi5yZWZzO1xuICAgICAgY3YucmVmVmFsID0gdi5yZWZWYWw7XG4gICAgICBjdi5yb290ID0gdi5yb290O1xuICAgICAgY3YuJGFzeW5jID0gdi4kYXN5bmM7XG4gICAgICBpZiAob3B0cy5zb3VyY2VDb2RlKSBjdi5zb3VyY2UgPSB2LnNvdXJjZTtcbiAgICB9XG4gICAgcmV0dXJuIHY7XG4gIH0gZmluYWxseSB7XG4gICAgZW5kQ29tcGlsaW5nLmNhbGwodGhpcywgc2NoZW1hLCByb290LCBiYXNlSWQpO1xuICB9XG5cbiAgLyogQHRoaXMgICB7Kn0gLSBjdXN0b20gY29udGV4dCwgc2VlIHBhc3NDb250ZXh0IG9wdGlvbiAqL1xuICBmdW5jdGlvbiBjYWxsVmFsaWRhdGUoKSB7XG4gICAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciB2YWxpZGF0ZSA9IGNvbXBpbGF0aW9uLnZhbGlkYXRlO1xuICAgIHZhciByZXN1bHQgPSB2YWxpZGF0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGNhbGxWYWxpZGF0ZS5lcnJvcnMgPSB2YWxpZGF0ZS5lcnJvcnM7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxvY2FsQ29tcGlsZShfc2NoZW1hLCBfcm9vdCwgbG9jYWxSZWZzLCBiYXNlSWQpIHtcbiAgICB2YXIgaXNSb290ID0gIV9yb290IHx8IChfcm9vdCAmJiBfcm9vdC5zY2hlbWEgPT0gX3NjaGVtYSk7XG4gICAgaWYgKF9yb290LnNjaGVtYSAhPSByb290LnNjaGVtYSlcbiAgICAgIHJldHVybiBjb21waWxlLmNhbGwoc2VsZiwgX3NjaGVtYSwgX3Jvb3QsIGxvY2FsUmVmcywgYmFzZUlkKTtcblxuICAgIHZhciAkYXN5bmMgPSBfc2NoZW1hLiRhc3luYyA9PT0gdHJ1ZTtcblxuICAgIHZhciBzb3VyY2VDb2RlID0gdmFsaWRhdGVHZW5lcmF0b3Ioe1xuICAgICAgaXNUb3A6IHRydWUsXG4gICAgICBzY2hlbWE6IF9zY2hlbWEsXG4gICAgICBpc1Jvb3Q6IGlzUm9vdCxcbiAgICAgIGJhc2VJZDogYmFzZUlkLFxuICAgICAgcm9vdDogX3Jvb3QsXG4gICAgICBzY2hlbWFQYXRoOiAnJyxcbiAgICAgIGVyclNjaGVtYVBhdGg6ICcjJyxcbiAgICAgIGVycm9yUGF0aDogJ1wiXCInLFxuICAgICAgTWlzc2luZ1JlZkVycm9yOiBlcnJvckNsYXNzZXMuTWlzc2luZ1JlZixcbiAgICAgIFJVTEVTOiBSVUxFUyxcbiAgICAgIHZhbGlkYXRlOiB2YWxpZGF0ZUdlbmVyYXRvcixcbiAgICAgIHV0aWw6IHV0aWwsXG4gICAgICByZXNvbHZlOiByZXNvbHZlLFxuICAgICAgcmVzb2x2ZVJlZjogcmVzb2x2ZVJlZixcbiAgICAgIHVzZVBhdHRlcm46IHVzZVBhdHRlcm4sXG4gICAgICB1c2VEZWZhdWx0OiB1c2VEZWZhdWx0LFxuICAgICAgdXNlQ3VzdG9tUnVsZTogdXNlQ3VzdG9tUnVsZSxcbiAgICAgIG9wdHM6IG9wdHMsXG4gICAgICBmb3JtYXRzOiBmb3JtYXRzLFxuICAgICAgbG9nZ2VyOiBzZWxmLmxvZ2dlcixcbiAgICAgIHNlbGY6IHNlbGZcbiAgICB9KTtcblxuICAgIHNvdXJjZUNvZGUgPSB2YXJzKHJlZlZhbCwgcmVmVmFsQ29kZSkgKyB2YXJzKHBhdHRlcm5zLCBwYXR0ZXJuQ29kZSlcbiAgICAgICAgICAgICAgICAgICArIHZhcnMoZGVmYXVsdHMsIGRlZmF1bHRDb2RlKSArIHZhcnMoY3VzdG9tUnVsZXMsIGN1c3RvbVJ1bGVDb2RlKVxuICAgICAgICAgICAgICAgICAgICsgc291cmNlQ29kZTtcblxuICAgIGlmIChvcHRzLnByb2Nlc3NDb2RlKSBzb3VyY2VDb2RlID0gb3B0cy5wcm9jZXNzQ29kZShzb3VyY2VDb2RlLCBfc2NoZW1hKTtcbiAgICAvLyBjb25zb2xlLmxvZygnXFxuXFxuXFxuICoqKiBcXG4nLCBKU09OLnN0cmluZ2lmeShzb3VyY2VDb2RlKSk7XG4gICAgdmFyIHZhbGlkYXRlO1xuICAgIHRyeSB7XG4gICAgICB2YXIgbWFrZVZhbGlkYXRlID0gbmV3IEZ1bmN0aW9uKFxuICAgICAgICAnc2VsZicsXG4gICAgICAgICdSVUxFUycsXG4gICAgICAgICdmb3JtYXRzJyxcbiAgICAgICAgJ3Jvb3QnLFxuICAgICAgICAncmVmVmFsJyxcbiAgICAgICAgJ2RlZmF1bHRzJyxcbiAgICAgICAgJ2N1c3RvbVJ1bGVzJyxcbiAgICAgICAgJ2VxdWFsJyxcbiAgICAgICAgJ3VjczJsZW5ndGgnLFxuICAgICAgICAnVmFsaWRhdGlvbkVycm9yJyxcbiAgICAgICAgc291cmNlQ29kZVxuICAgICAgKTtcblxuICAgICAgdmFsaWRhdGUgPSBtYWtlVmFsaWRhdGUoXG4gICAgICAgIHNlbGYsXG4gICAgICAgIFJVTEVTLFxuICAgICAgICBmb3JtYXRzLFxuICAgICAgICByb290LFxuICAgICAgICByZWZWYWwsXG4gICAgICAgIGRlZmF1bHRzLFxuICAgICAgICBjdXN0b21SdWxlcyxcbiAgICAgICAgZXF1YWwsXG4gICAgICAgIHVjczJsZW5ndGgsXG4gICAgICAgIFZhbGlkYXRpb25FcnJvclxuICAgICAgKTtcblxuICAgICAgcmVmVmFsWzBdID0gdmFsaWRhdGU7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBzZWxmLmxvZ2dlci5lcnJvcignRXJyb3IgY29tcGlsaW5nIHNjaGVtYSwgZnVuY3Rpb24gY29kZTonLCBzb3VyY2VDb2RlKTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgdmFsaWRhdGUuc2NoZW1hID0gX3NjaGVtYTtcbiAgICB2YWxpZGF0ZS5lcnJvcnMgPSBudWxsO1xuICAgIHZhbGlkYXRlLnJlZnMgPSByZWZzO1xuICAgIHZhbGlkYXRlLnJlZlZhbCA9IHJlZlZhbDtcbiAgICB2YWxpZGF0ZS5yb290ID0gaXNSb290ID8gdmFsaWRhdGUgOiBfcm9vdDtcbiAgICBpZiAoJGFzeW5jKSB2YWxpZGF0ZS4kYXN5bmMgPSB0cnVlO1xuICAgIGlmIChvcHRzLnNvdXJjZUNvZGUgPT09IHRydWUpIHtcbiAgICAgIHZhbGlkYXRlLnNvdXJjZSA9IHtcbiAgICAgICAgY29kZTogc291cmNlQ29kZSxcbiAgICAgICAgcGF0dGVybnM6IHBhdHRlcm5zLFxuICAgICAgICBkZWZhdWx0czogZGVmYXVsdHNcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbGlkYXRlO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVzb2x2ZVJlZihiYXNlSWQsIHJlZiwgaXNSb290KSB7XG4gICAgcmVmID0gcmVzb2x2ZS51cmwoYmFzZUlkLCByZWYpO1xuICAgIHZhciByZWZJbmRleCA9IHJlZnNbcmVmXTtcbiAgICB2YXIgX3JlZlZhbCwgcmVmQ29kZTtcbiAgICBpZiAocmVmSW5kZXggIT09IHVuZGVmaW5lZCkge1xuICAgICAgX3JlZlZhbCA9IHJlZlZhbFtyZWZJbmRleF07XG4gICAgICByZWZDb2RlID0gJ3JlZlZhbFsnICsgcmVmSW5kZXggKyAnXSc7XG4gICAgICByZXR1cm4gcmVzb2x2ZWRSZWYoX3JlZlZhbCwgcmVmQ29kZSk7XG4gICAgfVxuICAgIGlmICghaXNSb290ICYmIHJvb3QucmVmcykge1xuICAgICAgdmFyIHJvb3RSZWZJZCA9IHJvb3QucmVmc1tyZWZdO1xuICAgICAgaWYgKHJvb3RSZWZJZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIF9yZWZWYWwgPSByb290LnJlZlZhbFtyb290UmVmSWRdO1xuICAgICAgICByZWZDb2RlID0gYWRkTG9jYWxSZWYocmVmLCBfcmVmVmFsKTtcbiAgICAgICAgcmV0dXJuIHJlc29sdmVkUmVmKF9yZWZWYWwsIHJlZkNvZGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJlZkNvZGUgPSBhZGRMb2NhbFJlZihyZWYpO1xuICAgIHZhciB2ID0gcmVzb2x2ZS5jYWxsKHNlbGYsIGxvY2FsQ29tcGlsZSwgcm9vdCwgcmVmKTtcbiAgICBpZiAodiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YXIgbG9jYWxTY2hlbWEgPSBsb2NhbFJlZnMgJiYgbG9jYWxSZWZzW3JlZl07XG4gICAgICBpZiAobG9jYWxTY2hlbWEpIHtcbiAgICAgICAgdiA9IHJlc29sdmUuaW5saW5lUmVmKGxvY2FsU2NoZW1hLCBvcHRzLmlubGluZVJlZnMpXG4gICAgICAgICAgICA/IGxvY2FsU2NoZW1hXG4gICAgICAgICAgICA6IGNvbXBpbGUuY2FsbChzZWxmLCBsb2NhbFNjaGVtYSwgcm9vdCwgbG9jYWxSZWZzLCBiYXNlSWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh2ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlbW92ZUxvY2FsUmVmKHJlZik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcGxhY2VMb2NhbFJlZihyZWYsIHYpO1xuICAgICAgcmV0dXJuIHJlc29sdmVkUmVmKHYsIHJlZkNvZGUpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZExvY2FsUmVmKHJlZiwgdikge1xuICAgIHZhciByZWZJZCA9IHJlZlZhbC5sZW5ndGg7XG4gICAgcmVmVmFsW3JlZklkXSA9IHY7XG4gICAgcmVmc1tyZWZdID0gcmVmSWQ7XG4gICAgcmV0dXJuICdyZWZWYWwnICsgcmVmSWQ7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVMb2NhbFJlZihyZWYpIHtcbiAgICBkZWxldGUgcmVmc1tyZWZdO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVwbGFjZUxvY2FsUmVmKHJlZiwgdikge1xuICAgIHZhciByZWZJZCA9IHJlZnNbcmVmXTtcbiAgICByZWZWYWxbcmVmSWRdID0gdjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc29sdmVkUmVmKHJlZlZhbCwgY29kZSkge1xuICAgIHJldHVybiB0eXBlb2YgcmVmVmFsID09ICdvYmplY3QnIHx8IHR5cGVvZiByZWZWYWwgPT0gJ2Jvb2xlYW4nXG4gICAgICAgICAgICA/IHsgY29kZTogY29kZSwgc2NoZW1hOiByZWZWYWwsIGlubGluZTogdHJ1ZSB9XG4gICAgICAgICAgICA6IHsgY29kZTogY29kZSwgJGFzeW5jOiByZWZWYWwgJiYgISFyZWZWYWwuJGFzeW5jIH07XG4gIH1cblxuICBmdW5jdGlvbiB1c2VQYXR0ZXJuKHJlZ2V4U3RyKSB7XG4gICAgdmFyIGluZGV4ID0gcGF0dGVybnNIYXNoW3JlZ2V4U3RyXTtcbiAgICBpZiAoaW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgaW5kZXggPSBwYXR0ZXJuc0hhc2hbcmVnZXhTdHJdID0gcGF0dGVybnMubGVuZ3RoO1xuICAgICAgcGF0dGVybnNbaW5kZXhdID0gcmVnZXhTdHI7XG4gICAgfVxuICAgIHJldHVybiAncGF0dGVybicgKyBpbmRleDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVzZURlZmF1bHQodmFsdWUpIHtcbiAgICBzd2l0Y2ggKHR5cGVvZiB2YWx1ZSkge1xuICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICByZXR1cm4gJycgKyB2YWx1ZTtcbiAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgIHJldHVybiB1dGlsLnRvUXVvdGVkU3RyaW5nKHZhbHVlKTtcbiAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkgcmV0dXJuICdudWxsJztcbiAgICAgICAgdmFyIHZhbHVlU3RyID0gc3RhYmxlU3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgICAgdmFyIGluZGV4ID0gZGVmYXVsdHNIYXNoW3ZhbHVlU3RyXTtcbiAgICAgICAgaWYgKGluZGV4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpbmRleCA9IGRlZmF1bHRzSGFzaFt2YWx1ZVN0cl0gPSBkZWZhdWx0cy5sZW5ndGg7XG4gICAgICAgICAgZGVmYXVsdHNbaW5kZXhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdkZWZhdWx0JyArIGluZGV4O1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVzZUN1c3RvbVJ1bGUocnVsZSwgc2NoZW1hLCBwYXJlbnRTY2hlbWEsIGl0KSB7XG4gICAgaWYgKHNlbGYuX29wdHMudmFsaWRhdGVTY2hlbWEgIT09IGZhbHNlKSB7XG4gICAgICB2YXIgZGVwcyA9IHJ1bGUuZGVmaW5pdGlvbi5kZXBlbmRlbmNpZXM7XG4gICAgICBpZiAoZGVwcyAmJiAhZGVwcy5ldmVyeShmdW5jdGlvbihrZXl3b3JkKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocGFyZW50U2NoZW1hLCBrZXl3b3JkKTtcbiAgICAgIH0pKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3BhcmVudCBzY2hlbWEgbXVzdCBoYXZlIGFsbCByZXF1aXJlZCBrZXl3b3JkczogJyArIGRlcHMuam9pbignLCcpKTtcblxuICAgICAgdmFyIHZhbGlkYXRlU2NoZW1hID0gcnVsZS5kZWZpbml0aW9uLnZhbGlkYXRlU2NoZW1hO1xuICAgICAgaWYgKHZhbGlkYXRlU2NoZW1hKSB7XG4gICAgICAgIHZhciB2YWxpZCA9IHZhbGlkYXRlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgIGlmICghdmFsaWQpIHtcbiAgICAgICAgICB2YXIgbWVzc2FnZSA9ICdrZXl3b3JkIHNjaGVtYSBpcyBpbnZhbGlkOiAnICsgc2VsZi5lcnJvcnNUZXh0KHZhbGlkYXRlU2NoZW1hLmVycm9ycyk7XG4gICAgICAgICAgaWYgKHNlbGYuX29wdHMudmFsaWRhdGVTY2hlbWEgPT0gJ2xvZycpIHNlbGYubG9nZ2VyLmVycm9yKG1lc3NhZ2UpO1xuICAgICAgICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGNvbXBpbGUgPSBydWxlLmRlZmluaXRpb24uY29tcGlsZVxuICAgICAgLCBpbmxpbmUgPSBydWxlLmRlZmluaXRpb24uaW5saW5lXG4gICAgICAsIG1hY3JvID0gcnVsZS5kZWZpbml0aW9uLm1hY3JvO1xuXG4gICAgdmFyIHZhbGlkYXRlO1xuICAgIGlmIChjb21waWxlKSB7XG4gICAgICB2YWxpZGF0ZSA9IGNvbXBpbGUuY2FsbChzZWxmLCBzY2hlbWEsIHBhcmVudFNjaGVtYSwgaXQpO1xuICAgIH0gZWxzZSBpZiAobWFjcm8pIHtcbiAgICAgIHZhbGlkYXRlID0gbWFjcm8uY2FsbChzZWxmLCBzY2hlbWEsIHBhcmVudFNjaGVtYSwgaXQpO1xuICAgICAgaWYgKG9wdHMudmFsaWRhdGVTY2hlbWEgIT09IGZhbHNlKSBzZWxmLnZhbGlkYXRlU2NoZW1hKHZhbGlkYXRlLCB0cnVlKTtcbiAgICB9IGVsc2UgaWYgKGlubGluZSkge1xuICAgICAgdmFsaWRhdGUgPSBpbmxpbmUuY2FsbChzZWxmLCBpdCwgcnVsZS5rZXl3b3JkLCBzY2hlbWEsIHBhcmVudFNjaGVtYSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbGlkYXRlID0gcnVsZS5kZWZpbml0aW9uLnZhbGlkYXRlO1xuICAgICAgaWYgKCF2YWxpZGF0ZSkgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh2YWxpZGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjdXN0b20ga2V5d29yZCBcIicgKyBydWxlLmtleXdvcmQgKyAnXCJmYWlsZWQgdG8gY29tcGlsZScpO1xuXG4gICAgdmFyIGluZGV4ID0gY3VzdG9tUnVsZXMubGVuZ3RoO1xuICAgIGN1c3RvbVJ1bGVzW2luZGV4XSA9IHZhbGlkYXRlO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvZGU6ICdjdXN0b21SdWxlJyArIGluZGV4LFxuICAgICAgdmFsaWRhdGU6IHZhbGlkYXRlXG4gICAgfTtcbiAgfVxufVxuXG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBzY2hlbWEgaXMgY3VycmVudGx5IGNvbXBpbGVkXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtICB7T2JqZWN0fSBzY2hlbWEgc2NoZW1hIHRvIGNvbXBpbGVcbiAqIEBwYXJhbSAge09iamVjdH0gcm9vdCByb290IG9iamVjdFxuICogQHBhcmFtICB7U3RyaW5nfSBiYXNlSWQgYmFzZSBzY2hlbWEgSURcbiAqIEByZXR1cm4ge09iamVjdH0gb2JqZWN0IHdpdGggcHJvcGVydGllcyBcImluZGV4XCIgKGNvbXBpbGF0aW9uIGluZGV4KSBhbmQgXCJjb21waWxpbmdcIiAoYm9vbGVhbilcbiAqL1xuZnVuY3Rpb24gY2hlY2tDb21waWxpbmcoc2NoZW1hLCByb290LCBiYXNlSWQpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICB2YXIgaW5kZXggPSBjb21wSW5kZXguY2FsbCh0aGlzLCBzY2hlbWEsIHJvb3QsIGJhc2VJZCk7XG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4geyBpbmRleDogaW5kZXgsIGNvbXBpbGluZzogdHJ1ZSB9O1xuICBpbmRleCA9IHRoaXMuX2NvbXBpbGF0aW9ucy5sZW5ndGg7XG4gIHRoaXMuX2NvbXBpbGF0aW9uc1tpbmRleF0gPSB7XG4gICAgc2NoZW1hOiBzY2hlbWEsXG4gICAgcm9vdDogcm9vdCxcbiAgICBiYXNlSWQ6IGJhc2VJZFxuICB9O1xuICByZXR1cm4geyBpbmRleDogaW5kZXgsIGNvbXBpbGluZzogZmFsc2UgfTtcbn1cblxuXG4vKipcbiAqIFJlbW92ZXMgdGhlIHNjaGVtYSBmcm9tIHRoZSBjdXJyZW50bHkgY29tcGlsZWQgbGlzdFxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSAge09iamVjdH0gc2NoZW1hIHNjaGVtYSB0byBjb21waWxlXG4gKiBAcGFyYW0gIHtPYmplY3R9IHJvb3Qgcm9vdCBvYmplY3RcbiAqIEBwYXJhbSAge1N0cmluZ30gYmFzZUlkIGJhc2Ugc2NoZW1hIElEXG4gKi9cbmZ1bmN0aW9uIGVuZENvbXBpbGluZyhzY2hlbWEsIHJvb3QsIGJhc2VJZCkge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gIHZhciBpID0gY29tcEluZGV4LmNhbGwodGhpcywgc2NoZW1hLCByb290LCBiYXNlSWQpO1xuICBpZiAoaSA+PSAwKSB0aGlzLl9jb21waWxhdGlvbnMuc3BsaWNlKGksIDEpO1xufVxuXG5cbi8qKlxuICogSW5kZXggb2Ygc2NoZW1hIGNvbXBpbGF0aW9uIGluIHRoZSBjdXJyZW50bHkgY29tcGlsZWQgbGlzdFxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSAge09iamVjdH0gc2NoZW1hIHNjaGVtYSB0byBjb21waWxlXG4gKiBAcGFyYW0gIHtPYmplY3R9IHJvb3Qgcm9vdCBvYmplY3RcbiAqIEBwYXJhbSAge1N0cmluZ30gYmFzZUlkIGJhc2Ugc2NoZW1hIElEXG4gKiBAcmV0dXJuIHtJbnRlZ2VyfSBjb21waWxhdGlvbiBpbmRleFxuICovXG5mdW5jdGlvbiBjb21wSW5kZXgoc2NoZW1hLCByb290LCBiYXNlSWQpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICBmb3IgKHZhciBpPTA7IGk8dGhpcy5fY29tcGlsYXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGMgPSB0aGlzLl9jb21waWxhdGlvbnNbaV07XG4gICAgaWYgKGMuc2NoZW1hID09IHNjaGVtYSAmJiBjLnJvb3QgPT0gcm9vdCAmJiBjLmJhc2VJZCA9PSBiYXNlSWQpIHJldHVybiBpO1xuICB9XG4gIHJldHVybiAtMTtcbn1cblxuXG5mdW5jdGlvbiBwYXR0ZXJuQ29kZShpLCBwYXR0ZXJucykge1xuICByZXR1cm4gJ3ZhciBwYXR0ZXJuJyArIGkgKyAnID0gbmV3IFJlZ0V4cCgnICsgdXRpbC50b1F1b3RlZFN0cmluZyhwYXR0ZXJuc1tpXSkgKyAnKTsnO1xufVxuXG5cbmZ1bmN0aW9uIGRlZmF1bHRDb2RlKGkpIHtcbiAgcmV0dXJuICd2YXIgZGVmYXVsdCcgKyBpICsgJyA9IGRlZmF1bHRzWycgKyBpICsgJ107Jztcbn1cblxuXG5mdW5jdGlvbiByZWZWYWxDb2RlKGksIHJlZlZhbCkge1xuICByZXR1cm4gcmVmVmFsW2ldID09PSB1bmRlZmluZWQgPyAnJyA6ICd2YXIgcmVmVmFsJyArIGkgKyAnID0gcmVmVmFsWycgKyBpICsgJ107Jztcbn1cblxuXG5mdW5jdGlvbiBjdXN0b21SdWxlQ29kZShpKSB7XG4gIHJldHVybiAndmFyIGN1c3RvbVJ1bGUnICsgaSArICcgPSBjdXN0b21SdWxlc1snICsgaSArICddOyc7XG59XG5cblxuZnVuY3Rpb24gdmFycyhhcnIsIHN0YXRlbWVudCkge1xuICBpZiAoIWFyci5sZW5ndGgpIHJldHVybiAnJztcbiAgdmFyIGNvZGUgPSAnJztcbiAgZm9yICh2YXIgaT0wOyBpPGFyci5sZW5ndGg7IGkrKylcbiAgICBjb2RlICs9IHN0YXRlbWVudChpLCBhcnIpO1xuICByZXR1cm4gY29kZTtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL2luZGV4LmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxudmFyIFVSSSA9IHJlcXVpcmUoJ3VyaS1qcycpXG4gICwgZXF1YWwgPSByZXF1aXJlKCdmYXN0LWRlZXAtZXF1YWwnKVxuICAsIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxuICAsIFNjaGVtYU9iamVjdCA9IHJlcXVpcmUoJy4vc2NoZW1hX29iaicpXG4gICwgdHJhdmVyc2UgPSByZXF1aXJlKCdqc29uLXNjaGVtYS10cmF2ZXJzZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlc29sdmU7XG5cbnJlc29sdmUubm9ybWFsaXplSWQgPSBub3JtYWxpemVJZDtcbnJlc29sdmUuZnVsbFBhdGggPSBnZXRGdWxsUGF0aDtcbnJlc29sdmUudXJsID0gcmVzb2x2ZVVybDtcbnJlc29sdmUuaWRzID0gcmVzb2x2ZUlkcztcbnJlc29sdmUuaW5saW5lUmVmID0gaW5saW5lUmVmO1xucmVzb2x2ZS5zY2hlbWEgPSByZXNvbHZlU2NoZW1hO1xuXG4vKipcbiAqIFtyZXNvbHZlIGFuZCBjb21waWxlIHRoZSByZWZlcmVuY2VzICgkcmVmKV1cbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY29tcGlsZSByZWZlcmVuY2UgdG8gc2NoZW1hIGNvbXBpbGF0aW9uIGZ1bmNpdG9uIChsb2NhbENvbXBpbGUpXG4gKiBAcGFyYW0gIHtPYmplY3R9IHJvb3Qgb2JqZWN0IHdpdGggaW5mb3JtYXRpb24gYWJvdXQgdGhlIHJvb3Qgc2NoZW1hIGZvciB0aGUgY3VycmVudCBzY2hlbWFcbiAqIEBwYXJhbSAge1N0cmluZ30gcmVmIHJlZmVyZW5jZSB0byByZXNvbHZlXG4gKiBAcmV0dXJuIHtPYmplY3R8RnVuY3Rpb259IHNjaGVtYSBvYmplY3QgKGlmIHRoZSBzY2hlbWEgY2FuIGJlIGlubGluZWQpIG9yIHZhbGlkYXRpb24gZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZShjb21waWxlLCByb290LCByZWYpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICB2YXIgcmVmVmFsID0gdGhpcy5fcmVmc1tyZWZdO1xuICBpZiAodHlwZW9mIHJlZlZhbCA9PSAnc3RyaW5nJykge1xuICAgIGlmICh0aGlzLl9yZWZzW3JlZlZhbF0pIHJlZlZhbCA9IHRoaXMuX3JlZnNbcmVmVmFsXTtcbiAgICBlbHNlIHJldHVybiByZXNvbHZlLmNhbGwodGhpcywgY29tcGlsZSwgcm9vdCwgcmVmVmFsKTtcbiAgfVxuXG4gIHJlZlZhbCA9IHJlZlZhbCB8fCB0aGlzLl9zY2hlbWFzW3JlZl07XG4gIGlmIChyZWZWYWwgaW5zdGFuY2VvZiBTY2hlbWFPYmplY3QpIHtcbiAgICByZXR1cm4gaW5saW5lUmVmKHJlZlZhbC5zY2hlbWEsIHRoaXMuX29wdHMuaW5saW5lUmVmcylcbiAgICAgICAgICAgID8gcmVmVmFsLnNjaGVtYVxuICAgICAgICAgICAgOiByZWZWYWwudmFsaWRhdGUgfHwgdGhpcy5fY29tcGlsZShyZWZWYWwpO1xuICB9XG5cbiAgdmFyIHJlcyA9IHJlc29sdmVTY2hlbWEuY2FsbCh0aGlzLCByb290LCByZWYpO1xuICB2YXIgc2NoZW1hLCB2LCBiYXNlSWQ7XG4gIGlmIChyZXMpIHtcbiAgICBzY2hlbWEgPSByZXMuc2NoZW1hO1xuICAgIHJvb3QgPSByZXMucm9vdDtcbiAgICBiYXNlSWQgPSByZXMuYmFzZUlkO1xuICB9XG5cbiAgaWYgKHNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYU9iamVjdCkge1xuICAgIHYgPSBzY2hlbWEudmFsaWRhdGUgfHwgY29tcGlsZS5jYWxsKHRoaXMsIHNjaGVtYS5zY2hlbWEsIHJvb3QsIHVuZGVmaW5lZCwgYmFzZUlkKTtcbiAgfSBlbHNlIGlmIChzY2hlbWEgIT09IHVuZGVmaW5lZCkge1xuICAgIHYgPSBpbmxpbmVSZWYoc2NoZW1hLCB0aGlzLl9vcHRzLmlubGluZVJlZnMpXG4gICAgICAgID8gc2NoZW1hXG4gICAgICAgIDogY29tcGlsZS5jYWxsKHRoaXMsIHNjaGVtYSwgcm9vdCwgdW5kZWZpbmVkLCBiYXNlSWQpO1xuICB9XG5cbiAgcmV0dXJuIHY7XG59XG5cblxuLyoqXG4gKiBSZXNvbHZlIHNjaGVtYSwgaXRzIHJvb3QgYW5kIGJhc2VJZFxuICogQHRoaXMgQWp2XG4gKiBAcGFyYW0gIHtPYmplY3R9IHJvb3Qgcm9vdCBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIHNjaGVtYSwgcmVmVmFsLCByZWZzXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHJlZiAgcmVmZXJlbmNlIHRvIHJlc29sdmVcbiAqIEByZXR1cm4ge09iamVjdH0gb2JqZWN0IHdpdGggcHJvcGVydGllcyBzY2hlbWEsIHJvb3QsIGJhc2VJZFxuICovXG5mdW5jdGlvbiByZXNvbHZlU2NoZW1hKHJvb3QsIHJlZikge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gIHZhciBwID0gVVJJLnBhcnNlKHJlZilcbiAgICAsIHJlZlBhdGggPSBfZ2V0RnVsbFBhdGgocClcbiAgICAsIGJhc2VJZCA9IGdldEZ1bGxQYXRoKHRoaXMuX2dldElkKHJvb3Quc2NoZW1hKSk7XG4gIGlmIChPYmplY3Qua2V5cyhyb290LnNjaGVtYSkubGVuZ3RoID09PSAwIHx8IHJlZlBhdGggIT09IGJhc2VJZCkge1xuICAgIHZhciBpZCA9IG5vcm1hbGl6ZUlkKHJlZlBhdGgpO1xuICAgIHZhciByZWZWYWwgPSB0aGlzLl9yZWZzW2lkXTtcbiAgICBpZiAodHlwZW9mIHJlZlZhbCA9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIHJlc29sdmVSZWN1cnNpdmUuY2FsbCh0aGlzLCByb290LCByZWZWYWwsIHApO1xuICAgIH0gZWxzZSBpZiAocmVmVmFsIGluc3RhbmNlb2YgU2NoZW1hT2JqZWN0KSB7XG4gICAgICBpZiAoIXJlZlZhbC52YWxpZGF0ZSkgdGhpcy5fY29tcGlsZShyZWZWYWwpO1xuICAgICAgcm9vdCA9IHJlZlZhbDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVmVmFsID0gdGhpcy5fc2NoZW1hc1tpZF07XG4gICAgICBpZiAocmVmVmFsIGluc3RhbmNlb2YgU2NoZW1hT2JqZWN0KSB7XG4gICAgICAgIGlmICghcmVmVmFsLnZhbGlkYXRlKSB0aGlzLl9jb21waWxlKHJlZlZhbCk7XG4gICAgICAgIGlmIChpZCA9PSBub3JtYWxpemVJZChyZWYpKVxuICAgICAgICAgIHJldHVybiB7IHNjaGVtYTogcmVmVmFsLCByb290OiByb290LCBiYXNlSWQ6IGJhc2VJZCB9O1xuICAgICAgICByb290ID0gcmVmVmFsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXJvb3Quc2NoZW1hKSByZXR1cm47XG4gICAgYmFzZUlkID0gZ2V0RnVsbFBhdGgodGhpcy5fZ2V0SWQocm9vdC5zY2hlbWEpKTtcbiAgfVxuICByZXR1cm4gZ2V0SnNvblBvaW50ZXIuY2FsbCh0aGlzLCBwLCBiYXNlSWQsIHJvb3Quc2NoZW1hLCByb290KTtcbn1cblxuXG4vKiBAdGhpcyBBanYgKi9cbmZ1bmN0aW9uIHJlc29sdmVSZWN1cnNpdmUocm9vdCwgcmVmLCBwYXJzZWRSZWYpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICB2YXIgcmVzID0gcmVzb2x2ZVNjaGVtYS5jYWxsKHRoaXMsIHJvb3QsIHJlZik7XG4gIGlmIChyZXMpIHtcbiAgICB2YXIgc2NoZW1hID0gcmVzLnNjaGVtYTtcbiAgICB2YXIgYmFzZUlkID0gcmVzLmJhc2VJZDtcbiAgICByb290ID0gcmVzLnJvb3Q7XG4gICAgdmFyIGlkID0gdGhpcy5fZ2V0SWQoc2NoZW1hKTtcbiAgICBpZiAoaWQpIGJhc2VJZCA9IHJlc29sdmVVcmwoYmFzZUlkLCBpZCk7XG4gICAgcmV0dXJuIGdldEpzb25Qb2ludGVyLmNhbGwodGhpcywgcGFyc2VkUmVmLCBiYXNlSWQsIHNjaGVtYSwgcm9vdCk7XG4gIH1cbn1cblxuXG52YXIgUFJFVkVOVF9TQ09QRV9DSEFOR0UgPSB1dGlsLnRvSGFzaChbJ3Byb3BlcnRpZXMnLCAncGF0dGVyblByb3BlcnRpZXMnLCAnZW51bScsICdkZXBlbmRlbmNpZXMnLCAnZGVmaW5pdGlvbnMnXSk7XG4vKiBAdGhpcyBBanYgKi9cbmZ1bmN0aW9uIGdldEpzb25Qb2ludGVyKHBhcnNlZFJlZiwgYmFzZUlkLCBzY2hlbWEsIHJvb3QpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICBwYXJzZWRSZWYuZnJhZ21lbnQgPSBwYXJzZWRSZWYuZnJhZ21lbnQgfHwgJyc7XG4gIGlmIChwYXJzZWRSZWYuZnJhZ21lbnQuc2xpY2UoMCwxKSAhPSAnLycpIHJldHVybjtcbiAgdmFyIHBhcnRzID0gcGFyc2VkUmVmLmZyYWdtZW50LnNwbGl0KCcvJyk7XG5cbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBwYXJ0ID0gcGFydHNbaV07XG4gICAgaWYgKHBhcnQpIHtcbiAgICAgIHBhcnQgPSB1dGlsLnVuZXNjYXBlRnJhZ21lbnQocGFydCk7XG4gICAgICBzY2hlbWEgPSBzY2hlbWFbcGFydF07XG4gICAgICBpZiAoc2NoZW1hID09PSB1bmRlZmluZWQpIGJyZWFrO1xuICAgICAgdmFyIGlkO1xuICAgICAgaWYgKCFQUkVWRU5UX1NDT1BFX0NIQU5HRVtwYXJ0XSkge1xuICAgICAgICBpZCA9IHRoaXMuX2dldElkKHNjaGVtYSk7XG4gICAgICAgIGlmIChpZCkgYmFzZUlkID0gcmVzb2x2ZVVybChiYXNlSWQsIGlkKTtcbiAgICAgICAgaWYgKHNjaGVtYS4kcmVmKSB7XG4gICAgICAgICAgdmFyICRyZWYgPSByZXNvbHZlVXJsKGJhc2VJZCwgc2NoZW1hLiRyZWYpO1xuICAgICAgICAgIHZhciByZXMgPSByZXNvbHZlU2NoZW1hLmNhbGwodGhpcywgcm9vdCwgJHJlZik7XG4gICAgICAgICAgaWYgKHJlcykge1xuICAgICAgICAgICAgc2NoZW1hID0gcmVzLnNjaGVtYTtcbiAgICAgICAgICAgIHJvb3QgPSByZXMucm9vdDtcbiAgICAgICAgICAgIGJhc2VJZCA9IHJlcy5iYXNlSWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChzY2hlbWEgIT09IHVuZGVmaW5lZCAmJiBzY2hlbWEgIT09IHJvb3Quc2NoZW1hKVxuICAgIHJldHVybiB7IHNjaGVtYTogc2NoZW1hLCByb290OiByb290LCBiYXNlSWQ6IGJhc2VJZCB9O1xufVxuXG5cbnZhciBTSU1QTEVfSU5MSU5FRCA9IHV0aWwudG9IYXNoKFtcbiAgJ3R5cGUnLCAnZm9ybWF0JywgJ3BhdHRlcm4nLFxuICAnbWF4TGVuZ3RoJywgJ21pbkxlbmd0aCcsXG4gICdtYXhQcm9wZXJ0aWVzJywgJ21pblByb3BlcnRpZXMnLFxuICAnbWF4SXRlbXMnLCAnbWluSXRlbXMnLFxuICAnbWF4aW11bScsICdtaW5pbXVtJyxcbiAgJ3VuaXF1ZUl0ZW1zJywgJ211bHRpcGxlT2YnLFxuICAncmVxdWlyZWQnLCAnZW51bSdcbl0pO1xuZnVuY3Rpb24gaW5saW5lUmVmKHNjaGVtYSwgbGltaXQpIHtcbiAgaWYgKGxpbWl0ID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlO1xuICBpZiAobGltaXQgPT09IHVuZGVmaW5lZCB8fCBsaW1pdCA9PT0gdHJ1ZSkgcmV0dXJuIGNoZWNrTm9SZWYoc2NoZW1hKTtcbiAgZWxzZSBpZiAobGltaXQpIHJldHVybiBjb3VudEtleXMoc2NoZW1hKSA8PSBsaW1pdDtcbn1cblxuXG5mdW5jdGlvbiBjaGVja05vUmVmKHNjaGVtYSkge1xuICB2YXIgaXRlbTtcbiAgaWYgKEFycmF5LmlzQXJyYXkoc2NoZW1hKSkge1xuICAgIGZvciAodmFyIGk9MDsgaTxzY2hlbWEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGl0ZW0gPSBzY2hlbWFbaV07XG4gICAgICBpZiAodHlwZW9mIGl0ZW0gPT0gJ29iamVjdCcgJiYgIWNoZWNrTm9SZWYoaXRlbSkpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIga2V5IGluIHNjaGVtYSkge1xuICAgICAgaWYgKGtleSA9PSAnJHJlZicpIHJldHVybiBmYWxzZTtcbiAgICAgIGl0ZW0gPSBzY2hlbWFba2V5XTtcbiAgICAgIGlmICh0eXBlb2YgaXRlbSA9PSAnb2JqZWN0JyAmJiAhY2hlY2tOb1JlZihpdGVtKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuXG5mdW5jdGlvbiBjb3VudEtleXMoc2NoZW1hKSB7XG4gIHZhciBjb3VudCA9IDAsIGl0ZW07XG4gIGlmIChBcnJheS5pc0FycmF5KHNjaGVtYSkpIHtcbiAgICBmb3IgKHZhciBpPTA7IGk8c2NoZW1hLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpdGVtID0gc2NoZW1hW2ldO1xuICAgICAgaWYgKHR5cGVvZiBpdGVtID09ICdvYmplY3QnKSBjb3VudCArPSBjb3VudEtleXMoaXRlbSk7XG4gICAgICBpZiAoY291bnQgPT0gSW5maW5pdHkpIHJldHVybiBJbmZpbml0eTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIga2V5IGluIHNjaGVtYSkge1xuICAgICAgaWYgKGtleSA9PSAnJHJlZicpIHJldHVybiBJbmZpbml0eTtcbiAgICAgIGlmIChTSU1QTEVfSU5MSU5FRFtrZXldKSB7XG4gICAgICAgIGNvdW50Kys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpdGVtID0gc2NoZW1hW2tleV07XG4gICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PSAnb2JqZWN0JykgY291bnQgKz0gY291bnRLZXlzKGl0ZW0pICsgMTtcbiAgICAgICAgaWYgKGNvdW50ID09IEluZmluaXR5KSByZXR1cm4gSW5maW5pdHk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBjb3VudDtcbn1cblxuXG5mdW5jdGlvbiBnZXRGdWxsUGF0aChpZCwgbm9ybWFsaXplKSB7XG4gIGlmIChub3JtYWxpemUgIT09IGZhbHNlKSBpZCA9IG5vcm1hbGl6ZUlkKGlkKTtcbiAgdmFyIHAgPSBVUkkucGFyc2UoaWQpO1xuICByZXR1cm4gX2dldEZ1bGxQYXRoKHApO1xufVxuXG5cbmZ1bmN0aW9uIF9nZXRGdWxsUGF0aChwKSB7XG4gIHJldHVybiBVUkkuc2VyaWFsaXplKHApLnNwbGl0KCcjJylbMF0gKyAnIyc7XG59XG5cblxudmFyIFRSQUlMSU5HX1NMQVNIX0hBU0ggPSAvI1xcLz8kLztcbmZ1bmN0aW9uIG5vcm1hbGl6ZUlkKGlkKSB7XG4gIHJldHVybiBpZCA/IGlkLnJlcGxhY2UoVFJBSUxJTkdfU0xBU0hfSEFTSCwgJycpIDogJyc7XG59XG5cblxuZnVuY3Rpb24gcmVzb2x2ZVVybChiYXNlSWQsIGlkKSB7XG4gIGlkID0gbm9ybWFsaXplSWQoaWQpO1xuICByZXR1cm4gVVJJLnJlc29sdmUoYmFzZUlkLCBpZCk7XG59XG5cblxuLyogQHRoaXMgQWp2ICovXG5mdW5jdGlvbiByZXNvbHZlSWRzKHNjaGVtYSkge1xuICB2YXIgc2NoZW1hSWQgPSBub3JtYWxpemVJZCh0aGlzLl9nZXRJZChzY2hlbWEpKTtcbiAgdmFyIGJhc2VJZHMgPSB7Jyc6IHNjaGVtYUlkfTtcbiAgdmFyIGZ1bGxQYXRocyA9IHsnJzogZ2V0RnVsbFBhdGgoc2NoZW1hSWQsIGZhbHNlKX07XG4gIHZhciBsb2NhbFJlZnMgPSB7fTtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHRyYXZlcnNlKHNjaGVtYSwge2FsbEtleXM6IHRydWV9LCBmdW5jdGlvbihzY2gsIGpzb25QdHIsIHJvb3RTY2hlbWEsIHBhcmVudEpzb25QdHIsIHBhcmVudEtleXdvcmQsIHBhcmVudFNjaGVtYSwga2V5SW5kZXgpIHtcbiAgICBpZiAoanNvblB0ciA9PT0gJycpIHJldHVybjtcbiAgICB2YXIgaWQgPSBzZWxmLl9nZXRJZChzY2gpO1xuICAgIHZhciBiYXNlSWQgPSBiYXNlSWRzW3BhcmVudEpzb25QdHJdO1xuICAgIHZhciBmdWxsUGF0aCA9IGZ1bGxQYXRoc1twYXJlbnRKc29uUHRyXSArICcvJyArIHBhcmVudEtleXdvcmQ7XG4gICAgaWYgKGtleUluZGV4ICE9PSB1bmRlZmluZWQpXG4gICAgICBmdWxsUGF0aCArPSAnLycgKyAodHlwZW9mIGtleUluZGV4ID09ICdudW1iZXInID8ga2V5SW5kZXggOiB1dGlsLmVzY2FwZUZyYWdtZW50KGtleUluZGV4KSk7XG5cbiAgICBpZiAodHlwZW9mIGlkID09ICdzdHJpbmcnKSB7XG4gICAgICBpZCA9IGJhc2VJZCA9IG5vcm1hbGl6ZUlkKGJhc2VJZCA/IFVSSS5yZXNvbHZlKGJhc2VJZCwgaWQpIDogaWQpO1xuXG4gICAgICB2YXIgcmVmVmFsID0gc2VsZi5fcmVmc1tpZF07XG4gICAgICBpZiAodHlwZW9mIHJlZlZhbCA9PSAnc3RyaW5nJykgcmVmVmFsID0gc2VsZi5fcmVmc1tyZWZWYWxdO1xuICAgICAgaWYgKHJlZlZhbCAmJiByZWZWYWwuc2NoZW1hKSB7XG4gICAgICAgIGlmICghZXF1YWwoc2NoLCByZWZWYWwuc2NoZW1hKSlcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2lkIFwiJyArIGlkICsgJ1wiIHJlc29sdmVzIHRvIG1vcmUgdGhhbiBvbmUgc2NoZW1hJyk7XG4gICAgICB9IGVsc2UgaWYgKGlkICE9IG5vcm1hbGl6ZUlkKGZ1bGxQYXRoKSkge1xuICAgICAgICBpZiAoaWRbMF0gPT0gJyMnKSB7XG4gICAgICAgICAgaWYgKGxvY2FsUmVmc1tpZF0gJiYgIWVxdWFsKHNjaCwgbG9jYWxSZWZzW2lkXSkpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2lkIFwiJyArIGlkICsgJ1wiIHJlc29sdmVzIHRvIG1vcmUgdGhhbiBvbmUgc2NoZW1hJyk7XG4gICAgICAgICAgbG9jYWxSZWZzW2lkXSA9IHNjaDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLl9yZWZzW2lkXSA9IGZ1bGxQYXRoO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGJhc2VJZHNbanNvblB0cl0gPSBiYXNlSWQ7XG4gICAgZnVsbFBhdGhzW2pzb25QdHJdID0gZnVsbFBhdGg7XG4gIH0pO1xuXG4gIHJldHVybiBsb2NhbFJlZnM7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS9yZXNvbHZlLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxudmFyIHJ1bGVNb2R1bGVzID0gcmVxdWlyZSgnLi4vZG90anMnKVxuICAsIHRvSGFzaCA9IHJlcXVpcmUoJy4vdXRpbCcpLnRvSGFzaDtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBydWxlcygpIHtcbiAgdmFyIFJVTEVTID0gW1xuICAgIHsgdHlwZTogJ251bWJlcicsXG4gICAgICBydWxlczogWyB7ICdtYXhpbXVtJzogWydleGNsdXNpdmVNYXhpbXVtJ10gfSxcbiAgICAgICAgICAgICAgIHsgJ21pbmltdW0nOiBbJ2V4Y2x1c2l2ZU1pbmltdW0nXSB9LCAnbXVsdGlwbGVPZicsICdmb3JtYXQnXSB9LFxuICAgIHsgdHlwZTogJ3N0cmluZycsXG4gICAgICBydWxlczogWyAnbWF4TGVuZ3RoJywgJ21pbkxlbmd0aCcsICdwYXR0ZXJuJywgJ2Zvcm1hdCcgXSB9LFxuICAgIHsgdHlwZTogJ2FycmF5JyxcbiAgICAgIHJ1bGVzOiBbICdtYXhJdGVtcycsICdtaW5JdGVtcycsICdpdGVtcycsICdjb250YWlucycsICd1bmlxdWVJdGVtcycgXSB9LFxuICAgIHsgdHlwZTogJ29iamVjdCcsXG4gICAgICBydWxlczogWyAnbWF4UHJvcGVydGllcycsICdtaW5Qcm9wZXJ0aWVzJywgJ3JlcXVpcmVkJywgJ2RlcGVuZGVuY2llcycsICdwcm9wZXJ0eU5hbWVzJyxcbiAgICAgICAgICAgICAgIHsgJ3Byb3BlcnRpZXMnOiBbJ2FkZGl0aW9uYWxQcm9wZXJ0aWVzJywgJ3BhdHRlcm5Qcm9wZXJ0aWVzJ10gfSBdIH0sXG4gICAgeyBydWxlczogWyAnJHJlZicsICdjb25zdCcsICdlbnVtJywgJ25vdCcsICdhbnlPZicsICdvbmVPZicsICdhbGxPZicsICdpZicgXSB9XG4gIF07XG5cbiAgdmFyIEFMTCA9IFsgJ3R5cGUnLCAnJGNvbW1lbnQnIF07XG4gIHZhciBLRVlXT1JEUyA9IFtcbiAgICAnJHNjaGVtYScsICckaWQnLCAnaWQnLCAnJGRhdGEnLCAnJGFzeW5jJywgJ3RpdGxlJyxcbiAgICAnZGVzY3JpcHRpb24nLCAnZGVmYXVsdCcsICdkZWZpbml0aW9ucycsXG4gICAgJ2V4YW1wbGVzJywgJ3JlYWRPbmx5JywgJ3dyaXRlT25seScsXG4gICAgJ2NvbnRlbnRNZWRpYVR5cGUnLCAnY29udGVudEVuY29kaW5nJyxcbiAgICAnYWRkaXRpb25hbEl0ZW1zJywgJ3RoZW4nLCAnZWxzZSdcbiAgXTtcbiAgdmFyIFRZUEVTID0gWyAnbnVtYmVyJywgJ2ludGVnZXInLCAnc3RyaW5nJywgJ2FycmF5JywgJ29iamVjdCcsICdib29sZWFuJywgJ251bGwnIF07XG4gIFJVTEVTLmFsbCA9IHRvSGFzaChBTEwpO1xuICBSVUxFUy50eXBlcyA9IHRvSGFzaChUWVBFUyk7XG5cbiAgUlVMRVMuZm9yRWFjaChmdW5jdGlvbiAoZ3JvdXApIHtcbiAgICBncm91cC5ydWxlcyA9IGdyb3VwLnJ1bGVzLm1hcChmdW5jdGlvbiAoa2V5d29yZCkge1xuICAgICAgdmFyIGltcGxLZXl3b3JkcztcbiAgICAgIGlmICh0eXBlb2Yga2V5d29yZCA9PSAnb2JqZWN0Jykge1xuICAgICAgICB2YXIga2V5ID0gT2JqZWN0LmtleXMoa2V5d29yZClbMF07XG4gICAgICAgIGltcGxLZXl3b3JkcyA9IGtleXdvcmRba2V5XTtcbiAgICAgICAga2V5d29yZCA9IGtleTtcbiAgICAgICAgaW1wbEtleXdvcmRzLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgICAgICBBTEwucHVzaChrKTtcbiAgICAgICAgICBSVUxFUy5hbGxba10gPSB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIEFMTC5wdXNoKGtleXdvcmQpO1xuICAgICAgdmFyIHJ1bGUgPSBSVUxFUy5hbGxba2V5d29yZF0gPSB7XG4gICAgICAgIGtleXdvcmQ6IGtleXdvcmQsXG4gICAgICAgIGNvZGU6IHJ1bGVNb2R1bGVzW2tleXdvcmRdLFxuICAgICAgICBpbXBsZW1lbnRzOiBpbXBsS2V5d29yZHNcbiAgICAgIH07XG4gICAgICByZXR1cm4gcnVsZTtcbiAgICB9KTtcblxuICAgIFJVTEVTLmFsbC4kY29tbWVudCA9IHtcbiAgICAgIGtleXdvcmQ6ICckY29tbWVudCcsXG4gICAgICBjb2RlOiBydWxlTW9kdWxlcy4kY29tbWVudFxuICAgIH07XG5cbiAgICBpZiAoZ3JvdXAudHlwZSkgUlVMRVMudHlwZXNbZ3JvdXAudHlwZV0gPSBncm91cDtcbiAgfSk7XG5cbiAgUlVMRVMua2V5d29yZHMgPSB0b0hhc2goQUxMLmNvbmNhdChLRVlXT1JEUykpO1xuICBSVUxFUy5jdXN0b20gPSB7fTtcblxuICByZXR1cm4gUlVMRVM7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvcnVsZXMuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjaGVtYU9iamVjdDtcblxuZnVuY3Rpb24gU2NoZW1hT2JqZWN0KG9iaikge1xuICB1dGlsLmNvcHkob2JqLCB0aGlzKTtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL3NjaGVtYV9vYmouanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG4vLyBodHRwczovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZ1xuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL3B1bnljb2RlLmpzIC0gcHVueWNvZGUudWNzMi5kZWNvZGVcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdWNzMmxlbmd0aChzdHIpIHtcbiAgdmFyIGxlbmd0aCA9IDBcbiAgICAsIGxlbiA9IHN0ci5sZW5ndGhcbiAgICAsIHBvcyA9IDBcbiAgICAsIHZhbHVlO1xuICB3aGlsZSAocG9zIDwgbGVuKSB7XG4gICAgbGVuZ3RoKys7XG4gICAgdmFsdWUgPSBzdHIuY2hhckNvZGVBdChwb3MrKyk7XG4gICAgaWYgKHZhbHVlID49IDB4RDgwMCAmJiB2YWx1ZSA8PSAweERCRkYgJiYgcG9zIDwgbGVuKSB7XG4gICAgICAvLyBoaWdoIHN1cnJvZ2F0ZSwgYW5kIHRoZXJlIGlzIGEgbmV4dCBjaGFyYWN0ZXJcbiAgICAgIHZhbHVlID0gc3RyLmNoYXJDb2RlQXQocG9zKTtcbiAgICAgIGlmICgodmFsdWUgJiAweEZDMDApID09IDB4REMwMCkgcG9zKys7IC8vIGxvdyBzdXJyb2dhdGVcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGxlbmd0aDtcbn07XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS91Y3MybGVuZ3RoLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29weTogY29weSxcbiAgY2hlY2tEYXRhVHlwZTogY2hlY2tEYXRhVHlwZSxcbiAgY2hlY2tEYXRhVHlwZXM6IGNoZWNrRGF0YVR5cGVzLFxuICBjb2VyY2VUb1R5cGVzOiBjb2VyY2VUb1R5cGVzLFxuICB0b0hhc2g6IHRvSGFzaCxcbiAgZ2V0UHJvcGVydHk6IGdldFByb3BlcnR5LFxuICBlc2NhcGVRdW90ZXM6IGVzY2FwZVF1b3RlcyxcbiAgZXF1YWw6IHJlcXVpcmUoJ2Zhc3QtZGVlcC1lcXVhbCcpLFxuICB1Y3MybGVuZ3RoOiByZXF1aXJlKCcuL3VjczJsZW5ndGgnKSxcbiAgdmFyT2NjdXJlbmNlczogdmFyT2NjdXJlbmNlcyxcbiAgdmFyUmVwbGFjZTogdmFyUmVwbGFjZSxcbiAgc2NoZW1hSGFzUnVsZXM6IHNjaGVtYUhhc1J1bGVzLFxuICBzY2hlbWFIYXNSdWxlc0V4Y2VwdDogc2NoZW1hSGFzUnVsZXNFeGNlcHQsXG4gIHNjaGVtYVVua25vd25SdWxlczogc2NoZW1hVW5rbm93blJ1bGVzLFxuICB0b1F1b3RlZFN0cmluZzogdG9RdW90ZWRTdHJpbmcsXG4gIGdldFBhdGhFeHByOiBnZXRQYXRoRXhwcixcbiAgZ2V0UGF0aDogZ2V0UGF0aCxcbiAgZ2V0RGF0YTogZ2V0RGF0YSxcbiAgdW5lc2NhcGVGcmFnbWVudDogdW5lc2NhcGVGcmFnbWVudCxcbiAgdW5lc2NhcGVKc29uUG9pbnRlcjogdW5lc2NhcGVKc29uUG9pbnRlcixcbiAgZXNjYXBlRnJhZ21lbnQ6IGVzY2FwZUZyYWdtZW50LFxuICBlc2NhcGVKc29uUG9pbnRlcjogZXNjYXBlSnNvblBvaW50ZXJcbn07XG5cblxuZnVuY3Rpb24gY29weShvLCB0bykge1xuICB0byA9IHRvIHx8IHt9O1xuICBmb3IgKHZhciBrZXkgaW4gbykgdG9ba2V5XSA9IG9ba2V5XTtcbiAgcmV0dXJuIHRvO1xufVxuXG5cbmZ1bmN0aW9uIGNoZWNrRGF0YVR5cGUoZGF0YVR5cGUsIGRhdGEsIHN0cmljdE51bWJlcnMsIG5lZ2F0ZSkge1xuICB2YXIgRVFVQUwgPSBuZWdhdGUgPyAnICE9PSAnIDogJyA9PT0gJ1xuICAgICwgQU5EID0gbmVnYXRlID8gJyB8fCAnIDogJyAmJiAnXG4gICAgLCBPSyA9IG5lZ2F0ZSA/ICchJyA6ICcnXG4gICAgLCBOT1QgPSBuZWdhdGUgPyAnJyA6ICchJztcbiAgc3dpdGNoIChkYXRhVHlwZSkge1xuICAgIGNhc2UgJ251bGwnOiByZXR1cm4gZGF0YSArIEVRVUFMICsgJ251bGwnO1xuICAgIGNhc2UgJ2FycmF5JzogcmV0dXJuIE9LICsgJ0FycmF5LmlzQXJyYXkoJyArIGRhdGEgKyAnKSc7XG4gICAgY2FzZSAnb2JqZWN0JzogcmV0dXJuICcoJyArIE9LICsgZGF0YSArIEFORCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICd0eXBlb2YgJyArIGRhdGEgKyBFUVVBTCArICdcIm9iamVjdFwiJyArIEFORCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgIE5PVCArICdBcnJheS5pc0FycmF5KCcgKyBkYXRhICsgJykpJztcbiAgICBjYXNlICdpbnRlZ2VyJzogcmV0dXJuICcodHlwZW9mICcgKyBkYXRhICsgRVFVQUwgKyAnXCJudW1iZXJcIicgKyBBTkQgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgTk9UICsgJygnICsgZGF0YSArICcgJSAxKScgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgQU5EICsgZGF0YSArIEVRVUFMICsgZGF0YSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAoc3RyaWN0TnVtYmVycyA/IChBTkQgKyBPSyArICdpc0Zpbml0ZSgnICsgZGF0YSArICcpJykgOiAnJykgKyAnKSc7XG4gICAgY2FzZSAnbnVtYmVyJzogcmV0dXJuICcodHlwZW9mICcgKyBkYXRhICsgRVFVQUwgKyAnXCInICsgZGF0YVR5cGUgKyAnXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKHN0cmljdE51bWJlcnMgPyAoQU5EICsgT0sgKyAnaXNGaW5pdGUoJyArIGRhdGEgKyAnKScpIDogJycpICsgJyknO1xuICAgIGRlZmF1bHQ6IHJldHVybiAndHlwZW9mICcgKyBkYXRhICsgRVFVQUwgKyAnXCInICsgZGF0YVR5cGUgKyAnXCInO1xuICB9XG59XG5cblxuZnVuY3Rpb24gY2hlY2tEYXRhVHlwZXMoZGF0YVR5cGVzLCBkYXRhLCBzdHJpY3ROdW1iZXJzKSB7XG4gIHN3aXRjaCAoZGF0YVR5cGVzLmxlbmd0aCkge1xuICAgIGNhc2UgMTogcmV0dXJuIGNoZWNrRGF0YVR5cGUoZGF0YVR5cGVzWzBdLCBkYXRhLCBzdHJpY3ROdW1iZXJzLCB0cnVlKTtcbiAgICBkZWZhdWx0OlxuICAgICAgdmFyIGNvZGUgPSAnJztcbiAgICAgIHZhciB0eXBlcyA9IHRvSGFzaChkYXRhVHlwZXMpO1xuICAgICAgaWYgKHR5cGVzLmFycmF5ICYmIHR5cGVzLm9iamVjdCkge1xuICAgICAgICBjb2RlID0gdHlwZXMubnVsbCA/ICcoJzogJyghJyArIGRhdGEgKyAnIHx8ICc7XG4gICAgICAgIGNvZGUgKz0gJ3R5cGVvZiAnICsgZGF0YSArICcgIT09IFwib2JqZWN0XCIpJztcbiAgICAgICAgZGVsZXRlIHR5cGVzLm51bGw7XG4gICAgICAgIGRlbGV0ZSB0eXBlcy5hcnJheTtcbiAgICAgICAgZGVsZXRlIHR5cGVzLm9iamVjdDtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlcy5udW1iZXIpIGRlbGV0ZSB0eXBlcy5pbnRlZ2VyO1xuICAgICAgZm9yICh2YXIgdCBpbiB0eXBlcylcbiAgICAgICAgY29kZSArPSAoY29kZSA/ICcgJiYgJyA6ICcnICkgKyBjaGVja0RhdGFUeXBlKHQsIGRhdGEsIHN0cmljdE51bWJlcnMsIHRydWUpO1xuXG4gICAgICByZXR1cm4gY29kZTtcbiAgfVxufVxuXG5cbnZhciBDT0VSQ0VfVE9fVFlQRVMgPSB0b0hhc2goWyAnc3RyaW5nJywgJ251bWJlcicsICdpbnRlZ2VyJywgJ2Jvb2xlYW4nLCAnbnVsbCcgXSk7XG5mdW5jdGlvbiBjb2VyY2VUb1R5cGVzKG9wdGlvbkNvZXJjZVR5cGVzLCBkYXRhVHlwZXMpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YVR5cGVzKSkge1xuICAgIHZhciB0eXBlcyA9IFtdO1xuICAgIGZvciAodmFyIGk9MDsgaTxkYXRhVHlwZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB0ID0gZGF0YVR5cGVzW2ldO1xuICAgICAgaWYgKENPRVJDRV9UT19UWVBFU1t0XSkgdHlwZXNbdHlwZXMubGVuZ3RoXSA9IHQ7XG4gICAgICBlbHNlIGlmIChvcHRpb25Db2VyY2VUeXBlcyA9PT0gJ2FycmF5JyAmJiB0ID09PSAnYXJyYXknKSB0eXBlc1t0eXBlcy5sZW5ndGhdID0gdDtcbiAgICB9XG4gICAgaWYgKHR5cGVzLmxlbmd0aCkgcmV0dXJuIHR5cGVzO1xuICB9IGVsc2UgaWYgKENPRVJDRV9UT19UWVBFU1tkYXRhVHlwZXNdKSB7XG4gICAgcmV0dXJuIFtkYXRhVHlwZXNdO1xuICB9IGVsc2UgaWYgKG9wdGlvbkNvZXJjZVR5cGVzID09PSAnYXJyYXknICYmIGRhdGFUeXBlcyA9PT0gJ2FycmF5Jykge1xuICAgIHJldHVybiBbJ2FycmF5J107XG4gIH1cbn1cblxuXG5mdW5jdGlvbiB0b0hhc2goYXJyKSB7XG4gIHZhciBoYXNoID0ge307XG4gIGZvciAodmFyIGk9MDsgaTxhcnIubGVuZ3RoOyBpKyspIGhhc2hbYXJyW2ldXSA9IHRydWU7XG4gIHJldHVybiBoYXNoO1xufVxuXG5cbnZhciBJREVOVElGSUVSID0gL15bYS16JF9dW2EteiRfMC05XSokL2k7XG52YXIgU0lOR0xFX1FVT1RFID0gLyd8XFxcXC9nO1xuZnVuY3Rpb24gZ2V0UHJvcGVydHkoa2V5KSB7XG4gIHJldHVybiB0eXBlb2Yga2V5ID09ICdudW1iZXInXG4gICAgICAgICAgPyAnWycgKyBrZXkgKyAnXSdcbiAgICAgICAgICA6IElERU5USUZJRVIudGVzdChrZXkpXG4gICAgICAgICAgICA/ICcuJyArIGtleVxuICAgICAgICAgICAgOiBcIlsnXCIgKyBlc2NhcGVRdW90ZXMoa2V5KSArIFwiJ11cIjtcbn1cblxuXG5mdW5jdGlvbiBlc2NhcGVRdW90ZXMoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZShTSU5HTEVfUVVPVEUsICdcXFxcJCYnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcci9nLCAnXFxcXHInKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcZi9nLCAnXFxcXGYnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKTtcbn1cblxuXG5mdW5jdGlvbiB2YXJPY2N1cmVuY2VzKHN0ciwgZGF0YVZhcikge1xuICBkYXRhVmFyICs9ICdbXjAtOV0nO1xuICB2YXIgbWF0Y2hlcyA9IHN0ci5tYXRjaChuZXcgUmVnRXhwKGRhdGFWYXIsICdnJykpO1xuICByZXR1cm4gbWF0Y2hlcyA/IG1hdGNoZXMubGVuZ3RoIDogMDtcbn1cblxuXG5mdW5jdGlvbiB2YXJSZXBsYWNlKHN0ciwgZGF0YVZhciwgZXhwcikge1xuICBkYXRhVmFyICs9ICcoW14wLTldKSc7XG4gIGV4cHIgPSBleHByLnJlcGxhY2UoL1xcJC9nLCAnJCQkJCcpO1xuICByZXR1cm4gc3RyLnJlcGxhY2UobmV3IFJlZ0V4cChkYXRhVmFyLCAnZycpLCBleHByICsgJyQxJyk7XG59XG5cblxuZnVuY3Rpb24gc2NoZW1hSGFzUnVsZXMoc2NoZW1hLCBydWxlcykge1xuICBpZiAodHlwZW9mIHNjaGVtYSA9PSAnYm9vbGVhbicpIHJldHVybiAhc2NoZW1hO1xuICBmb3IgKHZhciBrZXkgaW4gc2NoZW1hKSBpZiAocnVsZXNba2V5XSkgcmV0dXJuIHRydWU7XG59XG5cblxuZnVuY3Rpb24gc2NoZW1hSGFzUnVsZXNFeGNlcHQoc2NoZW1hLCBydWxlcywgZXhjZXB0S2V5d29yZCkge1xuICBpZiAodHlwZW9mIHNjaGVtYSA9PSAnYm9vbGVhbicpIHJldHVybiAhc2NoZW1hICYmIGV4Y2VwdEtleXdvcmQgIT0gJ25vdCc7XG4gIGZvciAodmFyIGtleSBpbiBzY2hlbWEpIGlmIChrZXkgIT0gZXhjZXB0S2V5d29yZCAmJiBydWxlc1trZXldKSByZXR1cm4gdHJ1ZTtcbn1cblxuXG5mdW5jdGlvbiBzY2hlbWFVbmtub3duUnVsZXMoc2NoZW1hLCBydWxlcykge1xuICBpZiAodHlwZW9mIHNjaGVtYSA9PSAnYm9vbGVhbicpIHJldHVybjtcbiAgZm9yICh2YXIga2V5IGluIHNjaGVtYSkgaWYgKCFydWxlc1trZXldKSByZXR1cm4ga2V5O1xufVxuXG5cbmZ1bmN0aW9uIHRvUXVvdGVkU3RyaW5nKHN0cikge1xuICByZXR1cm4gJ1xcJycgKyBlc2NhcGVRdW90ZXMoc3RyKSArICdcXCcnO1xufVxuXG5cbmZ1bmN0aW9uIGdldFBhdGhFeHByKGN1cnJlbnRQYXRoLCBleHByLCBqc29uUG9pbnRlcnMsIGlzTnVtYmVyKSB7XG4gIHZhciBwYXRoID0ganNvblBvaW50ZXJzIC8vIGZhbHNlIGJ5IGRlZmF1bHRcbiAgICAgICAgICAgICAgPyAnXFwnL1xcJyArICcgKyBleHByICsgKGlzTnVtYmVyID8gJycgOiAnLnJlcGxhY2UoL34vZywgXFwnfjBcXCcpLnJlcGxhY2UoL1xcXFwvL2csIFxcJ34xXFwnKScpXG4gICAgICAgICAgICAgIDogKGlzTnVtYmVyID8gJ1xcJ1tcXCcgKyAnICsgZXhwciArICcgKyBcXCddXFwnJyA6ICdcXCdbXFxcXFxcJ1xcJyArICcgKyBleHByICsgJyArIFxcJ1xcXFxcXCddXFwnJyk7XG4gIHJldHVybiBqb2luUGF0aHMoY3VycmVudFBhdGgsIHBhdGgpO1xufVxuXG5cbmZ1bmN0aW9uIGdldFBhdGgoY3VycmVudFBhdGgsIHByb3AsIGpzb25Qb2ludGVycykge1xuICB2YXIgcGF0aCA9IGpzb25Qb2ludGVycyAvLyBmYWxzZSBieSBkZWZhdWx0XG4gICAgICAgICAgICAgID8gdG9RdW90ZWRTdHJpbmcoJy8nICsgZXNjYXBlSnNvblBvaW50ZXIocHJvcCkpXG4gICAgICAgICAgICAgIDogdG9RdW90ZWRTdHJpbmcoZ2V0UHJvcGVydHkocHJvcCkpO1xuICByZXR1cm4gam9pblBhdGhzKGN1cnJlbnRQYXRoLCBwYXRoKTtcbn1cblxuXG52YXIgSlNPTl9QT0lOVEVSID0gL15cXC8oPzpbXn5dfH4wfH4xKSokLztcbnZhciBSRUxBVElWRV9KU09OX1BPSU5URVIgPSAvXihbMC05XSspKCN8XFwvKD86W15+XXx+MHx+MSkqKT8kLztcbmZ1bmN0aW9uIGdldERhdGEoJGRhdGEsIGx2bCwgcGF0aHMpIHtcbiAgdmFyIHVwLCBqc29uUG9pbnRlciwgZGF0YSwgbWF0Y2hlcztcbiAgaWYgKCRkYXRhID09PSAnJykgcmV0dXJuICdyb290RGF0YSc7XG4gIGlmICgkZGF0YVswXSA9PSAnLycpIHtcbiAgICBpZiAoIUpTT05fUE9JTlRFUi50ZXN0KCRkYXRhKSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEpTT04tcG9pbnRlcjogJyArICRkYXRhKTtcbiAgICBqc29uUG9pbnRlciA9ICRkYXRhO1xuICAgIGRhdGEgPSAncm9vdERhdGEnO1xuICB9IGVsc2Uge1xuICAgIG1hdGNoZXMgPSAkZGF0YS5tYXRjaChSRUxBVElWRV9KU09OX1BPSU5URVIpO1xuICAgIGlmICghbWF0Y2hlcykgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEpTT04tcG9pbnRlcjogJyArICRkYXRhKTtcbiAgICB1cCA9ICttYXRjaGVzWzFdO1xuICAgIGpzb25Qb2ludGVyID0gbWF0Y2hlc1syXTtcbiAgICBpZiAoanNvblBvaW50ZXIgPT0gJyMnKSB7XG4gICAgICBpZiAodXAgPj0gbHZsKSB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBhY2Nlc3MgcHJvcGVydHkvaW5kZXggJyArIHVwICsgJyBsZXZlbHMgdXAsIGN1cnJlbnQgbGV2ZWwgaXMgJyArIGx2bCk7XG4gICAgICByZXR1cm4gcGF0aHNbbHZsIC0gdXBdO1xuICAgIH1cblxuICAgIGlmICh1cCA+IGx2bCkgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgYWNjZXNzIGRhdGEgJyArIHVwICsgJyBsZXZlbHMgdXAsIGN1cnJlbnQgbGV2ZWwgaXMgJyArIGx2bCk7XG4gICAgZGF0YSA9ICdkYXRhJyArICgobHZsIC0gdXApIHx8ICcnKTtcbiAgICBpZiAoIWpzb25Qb2ludGVyKSByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHZhciBleHByID0gZGF0YTtcbiAgdmFyIHNlZ21lbnRzID0ganNvblBvaW50ZXIuc3BsaXQoJy8nKTtcbiAgZm9yICh2YXIgaT0wOyBpPHNlZ21lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlZ21lbnQgPSBzZWdtZW50c1tpXTtcbiAgICBpZiAoc2VnbWVudCkge1xuICAgICAgZGF0YSArPSBnZXRQcm9wZXJ0eSh1bmVzY2FwZUpzb25Qb2ludGVyKHNlZ21lbnQpKTtcbiAgICAgIGV4cHIgKz0gJyAmJiAnICsgZGF0YTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGV4cHI7XG59XG5cblxuZnVuY3Rpb24gam9pblBhdGhzIChhLCBiKSB7XG4gIGlmIChhID09ICdcIlwiJykgcmV0dXJuIGI7XG4gIHJldHVybiAoYSArICcgKyAnICsgYikucmVwbGFjZSgvKFteXFxcXF0pJyBcXCsgJy9nLCAnJDEnKTtcbn1cblxuXG5mdW5jdGlvbiB1bmVzY2FwZUZyYWdtZW50KHN0cikge1xuICByZXR1cm4gdW5lc2NhcGVKc29uUG9pbnRlcihkZWNvZGVVUklDb21wb25lbnQoc3RyKSk7XG59XG5cblxuZnVuY3Rpb24gZXNjYXBlRnJhZ21lbnQoc3RyKSB7XG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoZXNjYXBlSnNvblBvaW50ZXIoc3RyKSk7XG59XG5cblxuZnVuY3Rpb24gZXNjYXBlSnNvblBvaW50ZXIoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvfi9nLCAnfjAnKS5yZXBsYWNlKC9cXC8vZywgJ34xJyk7XG59XG5cblxuZnVuY3Rpb24gdW5lc2NhcGVKc29uUG9pbnRlcihzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9+MS9nLCAnLycpLnJlcGxhY2UoL34wL2csICd+Jyk7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS91dGlsLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxudmFyIEtFWVdPUkRTID0gW1xuICAnbXVsdGlwbGVPZicsXG4gICdtYXhpbXVtJyxcbiAgJ2V4Y2x1c2l2ZU1heGltdW0nLFxuICAnbWluaW11bScsXG4gICdleGNsdXNpdmVNaW5pbXVtJyxcbiAgJ21heExlbmd0aCcsXG4gICdtaW5MZW5ndGgnLFxuICAncGF0dGVybicsXG4gICdhZGRpdGlvbmFsSXRlbXMnLFxuICAnbWF4SXRlbXMnLFxuICAnbWluSXRlbXMnLFxuICAndW5pcXVlSXRlbXMnLFxuICAnbWF4UHJvcGVydGllcycsXG4gICdtaW5Qcm9wZXJ0aWVzJyxcbiAgJ3JlcXVpcmVkJyxcbiAgJ2FkZGl0aW9uYWxQcm9wZXJ0aWVzJyxcbiAgJ2VudW0nLFxuICAnZm9ybWF0JyxcbiAgJ2NvbnN0J1xuXTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAobWV0YVNjaGVtYSwga2V5d29yZHNKc29uUG9pbnRlcnMpIHtcbiAgZm9yICh2YXIgaT0wOyBpPGtleXdvcmRzSnNvblBvaW50ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgbWV0YVNjaGVtYSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkobWV0YVNjaGVtYSkpO1xuICAgIHZhciBzZWdtZW50cyA9IGtleXdvcmRzSnNvblBvaW50ZXJzW2ldLnNwbGl0KCcvJyk7XG4gICAgdmFyIGtleXdvcmRzID0gbWV0YVNjaGVtYTtcbiAgICB2YXIgajtcbiAgICBmb3IgKGo9MTsgajxzZWdtZW50cy5sZW5ndGg7IGorKylcbiAgICAgIGtleXdvcmRzID0ga2V5d29yZHNbc2VnbWVudHNbal1dO1xuXG4gICAgZm9yIChqPTA7IGo8S0VZV09SRFMubGVuZ3RoOyBqKyspIHtcbiAgICAgIHZhciBrZXkgPSBLRVlXT1JEU1tqXTtcbiAgICAgIHZhciBzY2hlbWEgPSBrZXl3b3Jkc1trZXldO1xuICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICBrZXl3b3Jkc1trZXldID0ge1xuICAgICAgICAgIGFueU9mOiBbXG4gICAgICAgICAgICBzY2hlbWEsXG4gICAgICAgICAgICB7ICRyZWY6ICdodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vYWp2LXZhbGlkYXRvci9hanYvbWFzdGVyL2xpYi9yZWZzL2RhdGEuanNvbiMnIH1cbiAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1ldGFTY2hlbWE7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RhdGEuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYlwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxudmFyIG1ldGFTY2hlbWEgPSByZXF1aXJlKCcuL3JlZnMvanNvbi1zY2hlbWEtZHJhZnQtMDcuanNvbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgJGlkOiAnaHR0cHM6Ly9naXRodWIuY29tL2Fqdi12YWxpZGF0b3IvYWp2L2Jsb2IvbWFzdGVyL2xpYi9kZWZpbml0aW9uX3NjaGVtYS5qcycsXG4gIGRlZmluaXRpb25zOiB7XG4gICAgc2ltcGxlVHlwZXM6IG1ldGFTY2hlbWEuZGVmaW5pdGlvbnMuc2ltcGxlVHlwZXNcbiAgfSxcbiAgdHlwZTogJ29iamVjdCcsXG4gIGRlcGVuZGVuY2llczoge1xuICAgIHNjaGVtYTogWyd2YWxpZGF0ZSddLFxuICAgICRkYXRhOiBbJ3ZhbGlkYXRlJ10sXG4gICAgc3RhdGVtZW50czogWydpbmxpbmUnXSxcbiAgICB2YWxpZDoge25vdDoge3JlcXVpcmVkOiBbJ21hY3JvJ119fVxuICB9LFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgdHlwZTogbWV0YVNjaGVtYS5wcm9wZXJ0aWVzLnR5cGUsXG4gICAgc2NoZW1hOiB7dHlwZTogJ2Jvb2xlYW4nfSxcbiAgICBzdGF0ZW1lbnRzOiB7dHlwZTogJ2Jvb2xlYW4nfSxcbiAgICBkZXBlbmRlbmNpZXM6IHtcbiAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICBpdGVtczoge3R5cGU6ICdzdHJpbmcnfVxuICAgIH0sXG4gICAgbWV0YVNjaGVtYToge3R5cGU6ICdvYmplY3QnfSxcbiAgICBtb2RpZnlpbmc6IHt0eXBlOiAnYm9vbGVhbid9LFxuICAgIHZhbGlkOiB7dHlwZTogJ2Jvb2xlYW4nfSxcbiAgICAkZGF0YToge3R5cGU6ICdib29sZWFuJ30sXG4gICAgYXN5bmM6IHt0eXBlOiAnYm9vbGVhbid9LFxuICAgIGVycm9yczoge1xuICAgICAgYW55T2Y6IFtcbiAgICAgICAge3R5cGU6ICdib29sZWFuJ30sXG4gICAgICAgIHtjb25zdDogJ2Z1bGwnfVxuICAgICAgXVxuICAgIH1cbiAgfVxufTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kZWZpbml0aW9uX3NjaGVtYS5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9fbGltaXQoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRlcnJvcktleXdvcmQ7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkaXNEYXRhID0gaXQub3B0cy4kZGF0YSAmJiAkc2NoZW1hICYmICRzY2hlbWEuJGRhdGEsXG4gICAgJHNjaGVtYVZhbHVlO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciBzY2hlbWEnICsgKCRsdmwpICsgJyA9ICcgKyAoaXQudXRpbC5nZXREYXRhKCRzY2hlbWEuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFycikpICsgJzsgJztcbiAgICAkc2NoZW1hVmFsdWUgPSAnc2NoZW1hJyArICRsdmw7XG4gIH0gZWxzZSB7XG4gICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYTtcbiAgfVxuICB2YXIgJGlzTWF4ID0gJGtleXdvcmQgPT0gJ21heGltdW0nLFxuICAgICRleGNsdXNpdmVLZXl3b3JkID0gJGlzTWF4ID8gJ2V4Y2x1c2l2ZU1heGltdW0nIDogJ2V4Y2x1c2l2ZU1pbmltdW0nLFxuICAgICRzY2hlbWFFeGNsID0gaXQuc2NoZW1hWyRleGNsdXNpdmVLZXl3b3JkXSxcbiAgICAkaXNEYXRhRXhjbCA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYUV4Y2wgJiYgJHNjaGVtYUV4Y2wuJGRhdGEsXG4gICAgJG9wID0gJGlzTWF4ID8gJzwnIDogJz4nLFxuICAgICRub3RPcCA9ICRpc01heCA/ICc+JyA6ICc8JyxcbiAgICAkZXJyb3JLZXl3b3JkID0gdW5kZWZpbmVkO1xuICBpZiAoISgkaXNEYXRhIHx8IHR5cGVvZiAkc2NoZW1hID09ICdudW1iZXInIHx8ICRzY2hlbWEgPT09IHVuZGVmaW5lZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJGtleXdvcmQgKyAnIG11c3QgYmUgbnVtYmVyJyk7XG4gIH1cbiAgaWYgKCEoJGlzRGF0YUV4Y2wgfHwgJHNjaGVtYUV4Y2wgPT09IHVuZGVmaW5lZCB8fCB0eXBlb2YgJHNjaGVtYUV4Y2wgPT0gJ251bWJlcicgfHwgdHlwZW9mICRzY2hlbWFFeGNsID09ICdib29sZWFuJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJGV4Y2x1c2l2ZUtleXdvcmQgKyAnIG11c3QgYmUgbnVtYmVyIG9yIGJvb2xlYW4nKTtcbiAgfVxuICBpZiAoJGlzRGF0YUV4Y2wpIHtcbiAgICB2YXIgJHNjaGVtYVZhbHVlRXhjbCA9IGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hRXhjbC4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSxcbiAgICAgICRleGNsdXNpdmUgPSAnZXhjbHVzaXZlJyArICRsdmwsXG4gICAgICAkZXhjbFR5cGUgPSAnZXhjbFR5cGUnICsgJGx2bCxcbiAgICAgICRleGNsSXNOdW1iZXIgPSAnZXhjbElzTnVtYmVyJyArICRsdmwsXG4gICAgICAkb3BFeHByID0gJ29wJyArICRsdmwsXG4gICAgICAkb3BTdHIgPSAnXFwnICsgJyArICRvcEV4cHIgKyAnICsgXFwnJztcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hRXhjbCcgKyAoJGx2bCkgKyAnID0gJyArICgkc2NoZW1hVmFsdWVFeGNsKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlRXhjbCA9ICdzY2hlbWFFeGNsJyArICRsdmw7XG4gICAgb3V0ICs9ICcgdmFyICcgKyAoJGV4Y2x1c2l2ZSkgKyAnOyB2YXIgJyArICgkZXhjbFR5cGUpICsgJyA9IHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZUV4Y2wpICsgJzsgaWYgKCcgKyAoJGV4Y2xUeXBlKSArICcgIT0gXFwnYm9vbGVhblxcJyAmJiAnICsgKCRleGNsVHlwZSkgKyAnICE9IFxcJ3VuZGVmaW5lZFxcJyAmJiAnICsgKCRleGNsVHlwZSkgKyAnICE9IFxcJ251bWJlclxcJykgeyAnO1xuICAgIHZhciAkZXJyb3JLZXl3b3JkID0gJGV4Y2x1c2l2ZUtleXdvcmQ7XG4gICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJGVycm9yS2V5d29yZCB8fCAnX2V4Y2x1c2l2ZUxpbWl0JykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczoge30gJztcbiAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJycgKyAoJGV4Y2x1c2l2ZUtleXdvcmQpICsgJyBzaG91bGQgYmUgYm9vbGVhblxcJyAnO1xuICAgICAgfVxuICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB7fSAnO1xuICAgIH1cbiAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gZWxzZSBpZiAoICc7XG4gICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgIG91dCArPSAnICgnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mICcgKyAoJHNjaGVtYVZhbHVlKSArICcgIT0gXFwnbnVtYmVyXFwnKSB8fCAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyAnICsgKCRleGNsVHlwZSkgKyAnID09IFxcJ251bWJlclxcJyA/ICggKCcgKyAoJGV4Y2x1c2l2ZSkgKyAnID0gJyArICgkc2NoZW1hVmFsdWUpICsgJyA9PT0gdW5kZWZpbmVkIHx8ICcgKyAoJHNjaGVtYVZhbHVlRXhjbCkgKyAnICcgKyAoJG9wKSArICc9ICcgKyAoJHNjaGVtYVZhbHVlKSArICcpID8gJyArICgkZGF0YSkgKyAnICcgKyAoJG5vdE9wKSArICc9ICcgKyAoJHNjaGVtYVZhbHVlRXhjbCkgKyAnIDogJyArICgkZGF0YSkgKyAnICcgKyAoJG5vdE9wKSArICcgJyArICgkc2NoZW1hVmFsdWUpICsgJyApIDogKCAoJyArICgkZXhjbHVzaXZlKSArICcgPSAnICsgKCRzY2hlbWFWYWx1ZUV4Y2wpICsgJyA9PT0gdHJ1ZSkgPyAnICsgKCRkYXRhKSArICcgJyArICgkbm90T3ApICsgJz0gJyArICgkc2NoZW1hVmFsdWUpICsgJyA6ICcgKyAoJGRhdGEpICsgJyAnICsgKCRub3RPcCkgKyAnICcgKyAoJHNjaGVtYVZhbHVlKSArICcgKSB8fCAnICsgKCRkYXRhKSArICcgIT09ICcgKyAoJGRhdGEpICsgJykgeyB2YXIgb3AnICsgKCRsdmwpICsgJyA9ICcgKyAoJGV4Y2x1c2l2ZSkgKyAnID8gXFwnJyArICgkb3ApICsgJ1xcJyA6IFxcJycgKyAoJG9wKSArICc9XFwnOyAnO1xuICAgIGlmICgkc2NoZW1hID09PSB1bmRlZmluZWQpIHtcbiAgICAgICRlcnJvcktleXdvcmQgPSAkZXhjbHVzaXZlS2V5d29yZDtcbiAgICAgICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRleGNsdXNpdmVLZXl3b3JkO1xuICAgICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYVZhbHVlRXhjbDtcbiAgICAgICRpc0RhdGEgPSAkaXNEYXRhRXhjbDtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyICRleGNsSXNOdW1iZXIgPSB0eXBlb2YgJHNjaGVtYUV4Y2wgPT0gJ251bWJlcicsXG4gICAgICAkb3BTdHIgPSAkb3A7XG4gICAgaWYgKCRleGNsSXNOdW1iZXIgJiYgJGlzRGF0YSkge1xuICAgICAgdmFyICRvcEV4cHIgPSAnXFwnJyArICRvcFN0ciArICdcXCcnO1xuICAgICAgb3V0ICs9ICcgaWYgKCAnO1xuICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgb3V0ICs9ICcgKCcgKyAoJHNjaGVtYVZhbHVlKSArICcgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPSBcXCdudW1iZXJcXCcpIHx8ICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAoICcgKyAoJHNjaGVtYVZhbHVlKSArICcgPT09IHVuZGVmaW5lZCB8fCAnICsgKCRzY2hlbWFFeGNsKSArICcgJyArICgkb3ApICsgJz0gJyArICgkc2NoZW1hVmFsdWUpICsgJyA/ICcgKyAoJGRhdGEpICsgJyAnICsgKCRub3RPcCkgKyAnPSAnICsgKCRzY2hlbWFFeGNsKSArICcgOiAnICsgKCRkYXRhKSArICcgJyArICgkbm90T3ApICsgJyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICkgfHwgJyArICgkZGF0YSkgKyAnICE9PSAnICsgKCRkYXRhKSArICcpIHsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCRleGNsSXNOdW1iZXIgJiYgJHNjaGVtYSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICRleGNsdXNpdmUgPSB0cnVlO1xuICAgICAgICAkZXJyb3JLZXl3b3JkID0gJGV4Y2x1c2l2ZUtleXdvcmQ7XG4gICAgICAgICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRleGNsdXNpdmVLZXl3b3JkO1xuICAgICAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hRXhjbDtcbiAgICAgICAgJG5vdE9wICs9ICc9JztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICgkZXhjbElzTnVtYmVyKSAkc2NoZW1hVmFsdWUgPSBNYXRoWyRpc01heCA/ICdtaW4nIDogJ21heCddKCRzY2hlbWFFeGNsLCAkc2NoZW1hKTtcbiAgICAgICAgaWYgKCRzY2hlbWFFeGNsID09PSAoJGV4Y2xJc051bWJlciA/ICRzY2hlbWFWYWx1ZSA6IHRydWUpKSB7XG4gICAgICAgICAgJGV4Y2x1c2l2ZSA9IHRydWU7XG4gICAgICAgICAgJGVycm9yS2V5d29yZCA9ICRleGNsdXNpdmVLZXl3b3JkO1xuICAgICAgICAgICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRleGNsdXNpdmVLZXl3b3JkO1xuICAgICAgICAgICRub3RPcCArPSAnPSc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJGV4Y2x1c2l2ZSA9IGZhbHNlO1xuICAgICAgICAgICRvcFN0ciArPSAnPSc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciAkb3BFeHByID0gJ1xcJycgKyAkb3BTdHIgKyAnXFwnJztcbiAgICAgIG91dCArPSAnIGlmICggJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAnICgnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mICcgKyAoJHNjaGVtYVZhbHVlKSArICcgIT0gXFwnbnVtYmVyXFwnKSB8fCAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgJyArICgkZGF0YSkgKyAnICcgKyAoJG5vdE9wKSArICcgJyArICgkc2NoZW1hVmFsdWUpICsgJyB8fCAnICsgKCRkYXRhKSArICcgIT09ICcgKyAoJGRhdGEpICsgJykgeyAnO1xuICAgIH1cbiAgfVxuICAkZXJyb3JLZXl3b3JkID0gJGVycm9yS2V5d29yZCB8fCAka2V5d29yZDtcbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ19saW1pdCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgY29tcGFyaXNvbjogJyArICgkb3BFeHByKSArICcsIGxpbWl0OiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnLCBleGNsdXNpdmU6ICcgKyAoJGV4Y2x1c2l2ZSkgKyAnIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGJlICcgKyAoJG9wU3RyKSArICcgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAnXFwnICsgJyArICgkc2NoZW1hVmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKCRzY2hlbWFWYWx1ZSkgKyAnXFwnJztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6ICAnO1xuICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgb3V0ICs9ICd2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArICgkc2NoZW1hKTtcbiAgICAgIH1cbiAgICAgIG91dCArPSAnICAgICAgICAgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB7fSAnO1xuICB9XG4gIHZhciBfX2VyciA9IG91dDtcbiAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gIH1cbiAgb3V0ICs9ICcgfSAnO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvX2xpbWl0LmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX19saW1pdEl0ZW1zKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZXJyb3JLZXl3b3JkO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgaWYgKCEoJGlzRGF0YSB8fCB0eXBlb2YgJHNjaGVtYSA9PSAnbnVtYmVyJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJGtleXdvcmQgKyAnIG11c3QgYmUgbnVtYmVyJyk7XG4gIH1cbiAgdmFyICRvcCA9ICRrZXl3b3JkID09ICdtYXhJdGVtcycgPyAnPicgOiAnPCc7XG4gIG91dCArPSAnaWYgKCAnO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnICgnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mICcgKyAoJHNjaGVtYVZhbHVlKSArICcgIT0gXFwnbnVtYmVyXFwnKSB8fCAnO1xuICB9XG4gIG91dCArPSAnICcgKyAoJGRhdGEpICsgJy5sZW5ndGggJyArICgkb3ApICsgJyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnKSB7ICc7XG4gIHZhciAkZXJyb3JLZXl3b3JkID0gJGtleXdvcmQ7XG4gIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgkZXJyb3JLZXl3b3JkIHx8ICdfbGltaXRJdGVtcycpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbGltaXQ6ICcgKyAoJHNjaGVtYVZhbHVlKSArICcgfSAnO1xuICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgTk9UIGhhdmUgJztcbiAgICAgIGlmICgka2V5d29yZCA9PSAnbWF4SXRlbXMnKSB7XG4gICAgICAgIG91dCArPSAnbW9yZSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJ2Zld2VyJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIHRoYW4gJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAnXFwnICsgJyArICgkc2NoZW1hVmFsdWUpICsgJyArIFxcJyc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyBpdGVtc1xcJyAnO1xuICAgIH1cbiAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICBvdXQgKz0gJyAsIHNjaGVtYTogICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ3ZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKCRzY2hlbWEpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgICAgICAgICAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHt9ICc7XG4gIH1cbiAgdmFyIF9fZXJyID0gb3V0O1xuICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgIGlmIChpdC5hc3luYykge1xuICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgfVxuICBvdXQgKz0gJ30gJztcbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL19saW1pdEl0ZW1zLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX19saW1pdExlbmd0aChpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGVycm9yS2V5d29yZDtcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICRpc0RhdGEgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWEgJiYgJHNjaGVtYS4kZGF0YSxcbiAgICAkc2NoZW1hVmFsdWU7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLmdldERhdGEoJHNjaGVtYS4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgfSBlbHNlIHtcbiAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hO1xuICB9XG4gIGlmICghKCRpc0RhdGEgfHwgdHlwZW9mICRzY2hlbWEgPT0gJ251bWJlcicpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCRrZXl3b3JkICsgJyBtdXN0IGJlIG51bWJlcicpO1xuICB9XG4gIHZhciAkb3AgPSAka2V5d29yZCA9PSAnbWF4TGVuZ3RoJyA/ICc+JyA6ICc8JztcbiAgb3V0ICs9ICdpZiAoICc7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgKCcgKyAoJHNjaGVtYVZhbHVlKSArICcgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPSBcXCdudW1iZXJcXCcpIHx8ICc7XG4gIH1cbiAgaWYgKGl0Lm9wdHMudW5pY29kZSA9PT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyAnICsgKCRkYXRhKSArICcubGVuZ3RoICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdWNzMmxlbmd0aCgnICsgKCRkYXRhKSArICcpICc7XG4gIH1cbiAgb3V0ICs9ICcgJyArICgkb3ApICsgJyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnKSB7ICc7XG4gIHZhciAkZXJyb3JLZXl3b3JkID0gJGtleXdvcmQ7XG4gIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgkZXJyb3JLZXl3b3JkIHx8ICdfbGltaXRMZW5ndGgnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGxpbWl0OiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIE5PVCBiZSAnO1xuICAgICAgaWYgKCRrZXl3b3JkID09ICdtYXhMZW5ndGgnKSB7XG4gICAgICAgIG91dCArPSAnbG9uZ2VyJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnc2hvcnRlcic7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB0aGFuICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ1xcJyArICcgKyAoJHNjaGVtYVZhbHVlKSArICcgKyBcXCcnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKCRzY2hlbWEpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgY2hhcmFjdGVyc1xcJyAnO1xuICAgIH1cbiAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICBvdXQgKz0gJyAsIHNjaGVtYTogICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ3ZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKCRzY2hlbWEpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgICAgICAgICAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHt9ICc7XG4gIH1cbiAgdmFyIF9fZXJyID0gb3V0O1xuICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgIGlmIChpdC5hc3luYykge1xuICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgfVxuICBvdXQgKz0gJ30gJztcbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL19saW1pdExlbmd0aC5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9fbGltaXRQcm9wZXJ0aWVzKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZXJyb3JLZXl3b3JkO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgaWYgKCEoJGlzRGF0YSB8fCB0eXBlb2YgJHNjaGVtYSA9PSAnbnVtYmVyJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJGtleXdvcmQgKyAnIG11c3QgYmUgbnVtYmVyJyk7XG4gIH1cbiAgdmFyICRvcCA9ICRrZXl3b3JkID09ICdtYXhQcm9wZXJ0aWVzJyA/ICc+JyA6ICc8JztcbiAgb3V0ICs9ICdpZiAoICc7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgKCcgKyAoJHNjaGVtYVZhbHVlKSArICcgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPSBcXCdudW1iZXJcXCcpIHx8ICc7XG4gIH1cbiAgb3V0ICs9ICcgT2JqZWN0LmtleXMoJyArICgkZGF0YSkgKyAnKS5sZW5ndGggJyArICgkb3ApICsgJyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnKSB7ICc7XG4gIHZhciAkZXJyb3JLZXl3b3JkID0gJGtleXdvcmQ7XG4gIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgkZXJyb3JLZXl3b3JkIHx8ICdfbGltaXRQcm9wZXJ0aWVzJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBsaW1pdDogJyArICgkc2NoZW1hVmFsdWUpICsgJyB9ICc7XG4gICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBOT1QgaGF2ZSAnO1xuICAgICAgaWYgKCRrZXl3b3JkID09ICdtYXhQcm9wZXJ0aWVzJykge1xuICAgICAgICBvdXQgKz0gJ21vcmUnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICdmZXdlcic7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB0aGFuICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ1xcJyArICcgKyAoJHNjaGVtYVZhbHVlKSArICcgKyBcXCcnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKCRzY2hlbWEpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgcHJvcGVydGllc1xcJyAnO1xuICAgIH1cbiAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICBvdXQgKz0gJyAsIHNjaGVtYTogICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ3ZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKCRzY2hlbWEpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgICAgICAgICAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHt9ICc7XG4gIH1cbiAgdmFyIF9fZXJyID0gb3V0O1xuICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgIGlmIChpdC5hc3luYykge1xuICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgfVxuICBvdXQgKz0gJ30gJztcbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL19saW1pdFByb3BlcnRpZXMuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfYWxsT2YoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICB2YXIgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgdmFyICRjdXJyZW50QmFzZUlkID0gJGl0LmJhc2VJZCxcbiAgICAkYWxsU2NoZW1hc0VtcHR5ID0gdHJ1ZTtcbiAgdmFyIGFycjEgPSAkc2NoZW1hO1xuICBpZiAoYXJyMSkge1xuICAgIHZhciAkc2NoLCAkaSA9IC0xLFxuICAgICAgbDEgPSBhcnIxLmxlbmd0aCAtIDE7XG4gICAgd2hpbGUgKCRpIDwgbDEpIHtcbiAgICAgICRzY2ggPSBhcnIxWyRpICs9IDFdO1xuICAgICAgaWYgKChpdC5vcHRzLnN0cmljdEtleXdvcmRzID8gKHR5cGVvZiAkc2NoID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRzY2gpLmxlbmd0aCA+IDApIHx8ICRzY2ggPT09IGZhbHNlIDogaXQudXRpbC5zY2hlbWFIYXNSdWxlcygkc2NoLCBpdC5SVUxFUy5hbGwpKSkge1xuICAgICAgICAkYWxsU2NoZW1hc0VtcHR5ID0gZmFsc2U7XG4gICAgICAgICRpdC5zY2hlbWEgPSAkc2NoO1xuICAgICAgICAkaXQuc2NoZW1hUGF0aCA9ICRzY2hlbWFQYXRoICsgJ1snICsgJGkgKyAnXSc7XG4gICAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGggKyAnLycgKyAkaTtcbiAgICAgICAgb3V0ICs9ICcgICcgKyAoaXQudmFsaWRhdGUoJGl0KSkgKyAnICc7XG4gICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgICBvdXQgKz0gJyBpZiAoJyArICgkbmV4dFZhbGlkKSArICcpIHsgJztcbiAgICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBpZiAoJGFsbFNjaGVtYXNFbXB0eSkge1xuICAgICAgb3V0ICs9ICcgaWYgKHRydWUpIHsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgJyArICgkY2xvc2luZ0JyYWNlcy5zbGljZSgwLCAtMSkpICsgJyAnO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2FsbE9mLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2FueU9mKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkdmFsaWQgPSAndmFsaWQnICsgJGx2bDtcbiAgdmFyICRlcnJzID0gJ2VycnNfXycgKyAkbHZsO1xuICB2YXIgJGl0ID0gaXQudXRpbC5jb3B5KGl0KTtcbiAgdmFyICRjbG9zaW5nQnJhY2VzID0gJyc7XG4gICRpdC5sZXZlbCsrO1xuICB2YXIgJG5leHRWYWxpZCA9ICd2YWxpZCcgKyAkaXQubGV2ZWw7XG4gIHZhciAkbm9FbXB0eVNjaGVtYSA9ICRzY2hlbWEuZXZlcnkoZnVuY3Rpb24oJHNjaCkge1xuICAgIHJldHVybiAoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHNjaCA9PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cygkc2NoKS5sZW5ndGggPiAwKSB8fCAkc2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHNjaCwgaXQuUlVMRVMuYWxsKSk7XG4gIH0pO1xuICBpZiAoJG5vRW1wdHlTY2hlbWEpIHtcbiAgICB2YXIgJGN1cnJlbnRCYXNlSWQgPSAkaXQuYmFzZUlkO1xuICAgIG91dCArPSAnIHZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7IHZhciAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7ICAnO1xuICAgIHZhciAkd2FzQ29tcG9zaXRlID0gaXQuY29tcG9zaXRlUnVsZTtcbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICAgIHZhciBhcnIxID0gJHNjaGVtYTtcbiAgICBpZiAoYXJyMSkge1xuICAgICAgdmFyICRzY2gsICRpID0gLTEsXG4gICAgICAgIGwxID0gYXJyMS5sZW5ndGggLSAxO1xuICAgICAgd2hpbGUgKCRpIDwgbDEpIHtcbiAgICAgICAgJHNjaCA9IGFycjFbJGkgKz0gMV07XG4gICAgICAgICRpdC5zY2hlbWEgPSAkc2NoO1xuICAgICAgICAkaXQuc2NoZW1hUGF0aCA9ICRzY2hlbWFQYXRoICsgJ1snICsgJGkgKyAnXSc7XG4gICAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGggKyAnLycgKyAkaTtcbiAgICAgICAgb3V0ICs9ICcgICcgKyAoaXQudmFsaWRhdGUoJGl0KSkgKyAnICc7XG4gICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgICAgb3V0ICs9ICcgJyArICgkdmFsaWQpICsgJyA9ICcgKyAoJHZhbGlkKSArICcgfHwgJyArICgkbmV4dFZhbGlkKSArICc7IGlmICghJyArICgkdmFsaWQpICsgJykgeyAnO1xuICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICB9XG4gICAgfVxuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9ICR3YXNDb21wb3NpdGU7XG4gICAgb3V0ICs9ICcgJyArICgkY2xvc2luZ0JyYWNlcykgKyAnIGlmICghJyArICgkdmFsaWQpICsgJykgeyAgIHZhciBlcnIgPSAgICc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnYW55T2YnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7fSAnO1xuICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIG1hdGNoIHNvbWUgc2NoZW1hIGluIGFueU9mXFwnICc7XG4gICAgICB9XG4gICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgfVxuICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IodkVycm9ycyk7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSB2RXJyb3JzOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICB9XG4gICAgfVxuICAgIG91dCArPSAnIH0gZWxzZSB7ICBlcnJvcnMgPSAnICsgKCRlcnJzKSArICc7IGlmICh2RXJyb3JzICE9PSBudWxsKSB7IGlmICgnICsgKCRlcnJzKSArICcpIHZFcnJvcnMubGVuZ3RoID0gJyArICgkZXJycykgKyAnOyBlbHNlIHZFcnJvcnMgPSBudWxsOyB9ICc7XG4gICAgaWYgKGl0Lm9wdHMuYWxsRXJyb3JzKSB7XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICBvdXQgKz0gJyBpZiAodHJ1ZSkgeyAnO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2FueU9mLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2NvbW1lbnQoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGNvbW1lbnQgPSBpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRzY2hlbWEpO1xuICBpZiAoaXQub3B0cy4kY29tbWVudCA9PT0gdHJ1ZSkge1xuICAgIG91dCArPSAnIGNvbnNvbGUubG9nKCcgKyAoJGNvbW1lbnQpICsgJyk7JztcbiAgfSBlbHNlIGlmICh0eXBlb2YgaXQub3B0cy4kY29tbWVudCA9PSAnZnVuY3Rpb24nKSB7XG4gICAgb3V0ICs9ICcgc2VsZi5fb3B0cy4kY29tbWVudCgnICsgKCRjb21tZW50KSArICcsICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJywgdmFsaWRhdGUucm9vdC5zY2hlbWEpOyc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9jb21tZW50LmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2NvbnN0KGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkdmFsaWQgPSAndmFsaWQnICsgJGx2bDtcbiAgdmFyICRpc0RhdGEgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWEgJiYgJHNjaGVtYS4kZGF0YSxcbiAgICAkc2NoZW1hVmFsdWU7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLmdldERhdGEoJHNjaGVtYS4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgfSBlbHNlIHtcbiAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hO1xuICB9XG4gIGlmICghJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciBzY2hlbWEnICsgKCRsdmwpICsgJyA9IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJzsnO1xuICB9XG4gIG91dCArPSAndmFyICcgKyAoJHZhbGlkKSArICcgPSBlcXVhbCgnICsgKCRkYXRhKSArICcsIHNjaGVtYScgKyAoJGx2bCkgKyAnKTsgaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICAgJztcbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdjb25zdCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgYWxsb3dlZFZhbHVlOiBzY2hlbWEnICsgKCRsdmwpICsgJyB9ICc7XG4gICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBiZSBlcXVhbCB0byBjb25zdGFudFxcJyAnO1xuICAgIH1cbiAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnIH0nO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvY29uc3QuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfY29udGFpbnMoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICB2YXIgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgdmFyICRpZHggPSAnaScgKyAkbHZsLFxuICAgICRkYXRhTnh0ID0gJGl0LmRhdGFMZXZlbCA9IGl0LmRhdGFMZXZlbCArIDEsXG4gICAgJG5leHREYXRhID0gJ2RhdGEnICsgJGRhdGFOeHQsXG4gICAgJGN1cnJlbnRCYXNlSWQgPSBpdC5iYXNlSWQsXG4gICAgJG5vbkVtcHR5U2NoZW1hID0gKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2hlbWEgPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaGVtYSkubGVuZ3RoID4gMCkgfHwgJHNjaGVtYSA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2hlbWEsIGl0LlJVTEVTLmFsbCkpO1xuICBvdXQgKz0gJ3ZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7dmFyICcgKyAoJHZhbGlkKSArICc7JztcbiAgaWYgKCRub25FbXB0eVNjaGVtYSkge1xuICAgIHZhciAkd2FzQ29tcG9zaXRlID0gaXQuY29tcG9zaXRlUnVsZTtcbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICAgICRpdC5zY2hlbWEgPSAkc2NoZW1hO1xuICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGg7XG4gICAgJGl0LmVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aDtcbiAgICBvdXQgKz0gJyB2YXIgJyArICgkbmV4dFZhbGlkKSArICcgPSBmYWxzZTsgZm9yICh2YXIgJyArICgkaWR4KSArICcgPSAwOyAnICsgKCRpZHgpICsgJyA8ICcgKyAoJGRhdGEpICsgJy5sZW5ndGg7ICcgKyAoJGlkeCkgKyAnKyspIHsgJztcbiAgICAkaXQuZXJyb3JQYXRoID0gaXQudXRpbC5nZXRQYXRoRXhwcihpdC5lcnJvclBhdGgsICRpZHgsIGl0Lm9wdHMuanNvblBvaW50ZXJzLCB0cnVlKTtcbiAgICB2YXIgJHBhc3NEYXRhID0gJGRhdGEgKyAnWycgKyAkaWR4ICsgJ10nO1xuICAgICRpdC5kYXRhUGF0aEFyclskZGF0YU54dF0gPSAkaWR4O1xuICAgIHZhciAkY29kZSA9IGl0LnZhbGlkYXRlKCRpdCk7XG4gICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgIGlmIChpdC51dGlsLnZhck9jY3VyZW5jZXMoJGNvZGUsICRuZXh0RGF0YSkgPCAyKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKGl0LnV0aWwudmFyUmVwbGFjZSgkY29kZSwgJG5leHREYXRhLCAkcGFzc0RhdGEpKSArICcgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJG5leHREYXRhKSArICcgPSAnICsgKCRwYXNzRGF0YSkgKyAnOyAnICsgKCRjb2RlKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSBicmVhazsgfSAgJztcbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSAkd2FzQ29tcG9zaXRlO1xuICAgIG91dCArPSAnICcgKyAoJGNsb3NpbmdCcmFjZXMpICsgJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSB7JztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyBpZiAoJyArICgkZGF0YSkgKyAnLmxlbmd0aCA9PSAwKSB7JztcbiAgfVxuICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ2NvbnRhaW5zJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczoge30gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGNvbnRhaW4gYSB2YWxpZCBpdGVtXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB7fSAnO1xuICB9XG4gIHZhciBfX2VyciA9IG91dDtcbiAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gIH1cbiAgb3V0ICs9ICcgfSBlbHNlIHsgJztcbiAgaWYgKCRub25FbXB0eVNjaGVtYSkge1xuICAgIG91dCArPSAnICBlcnJvcnMgPSAnICsgKCRlcnJzKSArICc7IGlmICh2RXJyb3JzICE9PSBudWxsKSB7IGlmICgnICsgKCRlcnJzKSArICcpIHZFcnJvcnMubGVuZ3RoID0gJyArICgkZXJycykgKyAnOyBlbHNlIHZFcnJvcnMgPSBudWxsOyB9ICc7XG4gIH1cbiAgaWYgKGl0Lm9wdHMuYWxsRXJyb3JzKSB7XG4gICAgb3V0ICs9ICcgfSAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvY29udGFpbnMuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfY3VzdG9tKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZXJyb3JLZXl3b3JkO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmw7XG4gIHZhciAkZXJycyA9ICdlcnJzX18nICsgJGx2bDtcbiAgdmFyICRpc0RhdGEgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWEgJiYgJHNjaGVtYS4kZGF0YSxcbiAgICAkc2NoZW1hVmFsdWU7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLmdldERhdGEoJHNjaGVtYS4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgfSBlbHNlIHtcbiAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hO1xuICB9XG4gIHZhciAkcnVsZSA9IHRoaXMsXG4gICAgJGRlZmluaXRpb24gPSAnZGVmaW5pdGlvbicgKyAkbHZsLFxuICAgICRyRGVmID0gJHJ1bGUuZGVmaW5pdGlvbixcbiAgICAkY2xvc2luZ0JyYWNlcyA9ICcnO1xuICB2YXIgJGNvbXBpbGUsICRpbmxpbmUsICRtYWNybywgJHJ1bGVWYWxpZGF0ZSwgJHZhbGlkYXRlQ29kZTtcbiAgaWYgKCRpc0RhdGEgJiYgJHJEZWYuJGRhdGEpIHtcbiAgICAkdmFsaWRhdGVDb2RlID0gJ2tleXdvcmRWYWxpZGF0ZScgKyAkbHZsO1xuICAgIHZhciAkdmFsaWRhdGVTY2hlbWEgPSAkckRlZi52YWxpZGF0ZVNjaGVtYTtcbiAgICBvdXQgKz0gJyB2YXIgJyArICgkZGVmaW5pdGlvbikgKyAnID0gUlVMRVMuY3VzdG9tW1xcJycgKyAoJGtleXdvcmQpICsgJ1xcJ10uZGVmaW5pdGlvbjsgdmFyICcgKyAoJHZhbGlkYXRlQ29kZSkgKyAnID0gJyArICgkZGVmaW5pdGlvbikgKyAnLnZhbGlkYXRlOyc7XG4gIH0gZWxzZSB7XG4gICAgJHJ1bGVWYWxpZGF0ZSA9IGl0LnVzZUN1c3RvbVJ1bGUoJHJ1bGUsICRzY2hlbWEsIGl0LnNjaGVtYSwgaXQpO1xuICAgIGlmICghJHJ1bGVWYWxpZGF0ZSkgcmV0dXJuO1xuICAgICRzY2hlbWFWYWx1ZSA9ICd2YWxpZGF0ZS5zY2hlbWEnICsgJHNjaGVtYVBhdGg7XG4gICAgJHZhbGlkYXRlQ29kZSA9ICRydWxlVmFsaWRhdGUuY29kZTtcbiAgICAkY29tcGlsZSA9ICRyRGVmLmNvbXBpbGU7XG4gICAgJGlubGluZSA9ICRyRGVmLmlubGluZTtcbiAgICAkbWFjcm8gPSAkckRlZi5tYWNybztcbiAgfVxuICB2YXIgJHJ1bGVFcnJzID0gJHZhbGlkYXRlQ29kZSArICcuZXJyb3JzJyxcbiAgICAkaSA9ICdpJyArICRsdmwsXG4gICAgJHJ1bGVFcnIgPSAncnVsZUVycicgKyAkbHZsLFxuICAgICRhc3luY0tleXdvcmQgPSAkckRlZi5hc3luYztcbiAgaWYgKCRhc3luY0tleXdvcmQgJiYgIWl0LmFzeW5jKSB0aHJvdyBuZXcgRXJyb3IoJ2FzeW5jIGtleXdvcmQgaW4gc3luYyBzY2hlbWEnKTtcbiAgaWYgKCEoJGlubGluZSB8fCAkbWFjcm8pKSB7XG4gICAgb3V0ICs9ICcnICsgKCRydWxlRXJycykgKyAnID0gbnVsbDsnO1xuICB9XG4gIG91dCArPSAndmFyICcgKyAoJGVycnMpICsgJyA9IGVycm9yczt2YXIgJyArICgkdmFsaWQpICsgJzsnO1xuICBpZiAoJGlzRGF0YSAmJiAkckRlZi4kZGF0YSkge1xuICAgICRjbG9zaW5nQnJhY2VzICs9ICd9JztcbiAgICBvdXQgKz0gJyBpZiAoJyArICgkc2NoZW1hVmFsdWUpICsgJyA9PT0gdW5kZWZpbmVkKSB7ICcgKyAoJHZhbGlkKSArICcgPSB0cnVlOyB9IGVsc2UgeyAnO1xuICAgIGlmICgkdmFsaWRhdGVTY2hlbWEpIHtcbiAgICAgICRjbG9zaW5nQnJhY2VzICs9ICd9JztcbiAgICAgIG91dCArPSAnICcgKyAoJHZhbGlkKSArICcgPSAnICsgKCRkZWZpbml0aW9uKSArICcudmFsaWRhdGVTY2hlbWEoJyArICgkc2NoZW1hVmFsdWUpICsgJyk7IGlmICgnICsgKCR2YWxpZCkgKyAnKSB7ICc7XG4gICAgfVxuICB9XG4gIGlmICgkaW5saW5lKSB7XG4gICAgaWYgKCRyRGVmLnN0YXRlbWVudHMpIHtcbiAgICAgIG91dCArPSAnICcgKyAoJHJ1bGVWYWxpZGF0ZS52YWxpZGF0ZSkgKyAnICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnICcgKyAoJHZhbGlkKSArICcgPSAnICsgKCRydWxlVmFsaWRhdGUudmFsaWRhdGUpICsgJzsgJztcbiAgICB9XG4gIH0gZWxzZSBpZiAoJG1hY3JvKSB7XG4gICAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gICAgdmFyICRjbG9zaW5nQnJhY2VzID0gJyc7XG4gICAgJGl0LmxldmVsKys7XG4gICAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICAgICRpdC5zY2hlbWEgPSAkcnVsZVZhbGlkYXRlLnZhbGlkYXRlO1xuICAgICRpdC5zY2hlbWFQYXRoID0gJyc7XG4gICAgdmFyICR3YXNDb21wb3NpdGUgPSBpdC5jb21wb3NpdGVSdWxlO1xuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9IHRydWU7XG4gICAgdmFyICRjb2RlID0gaXQudmFsaWRhdGUoJGl0KS5yZXBsYWNlKC92YWxpZGF0ZVxcLnNjaGVtYS9nLCAkdmFsaWRhdGVDb2RlKTtcbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSAkd2FzQ29tcG9zaXRlO1xuICAgIG91dCArPSAnICcgKyAoJGNvZGUpO1xuICB9IGVsc2Uge1xuICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICBvdXQgPSAnJztcbiAgICBvdXQgKz0gJyAgJyArICgkdmFsaWRhdGVDb2RlKSArICcuY2FsbCggJztcbiAgICBpZiAoaXQub3B0cy5wYXNzQ29udGV4dCkge1xuICAgICAgb3V0ICs9ICd0aGlzJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICdzZWxmJztcbiAgICB9XG4gICAgaWYgKCRjb21waWxlIHx8ICRyRGVmLnNjaGVtYSA9PT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgJyArICgkZGF0YSkgKyAnICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnICwgJyArICgkc2NoZW1hVmFsdWUpICsgJyAsICcgKyAoJGRhdGEpICsgJyAsIHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnICwgKGRhdGFQYXRoIHx8IFxcJ1xcJyknO1xuICAgIGlmIChpdC5lcnJvclBhdGggIT0gJ1wiXCInKSB7XG4gICAgICBvdXQgKz0gJyArICcgKyAoaXQuZXJyb3JQYXRoKTtcbiAgICB9XG4gICAgdmFyICRwYXJlbnREYXRhID0gJGRhdGFMdmwgPyAnZGF0YScgKyAoKCRkYXRhTHZsIC0gMSkgfHwgJycpIDogJ3BhcmVudERhdGEnLFxuICAgICAgJHBhcmVudERhdGFQcm9wZXJ0eSA9ICRkYXRhTHZsID8gaXQuZGF0YVBhdGhBcnJbJGRhdGFMdmxdIDogJ3BhcmVudERhdGFQcm9wZXJ0eSc7XG4gICAgb3V0ICs9ICcgLCAnICsgKCRwYXJlbnREYXRhKSArICcgLCAnICsgKCRwYXJlbnREYXRhUHJvcGVydHkpICsgJyAsIHJvb3REYXRhICkgICc7XG4gICAgdmFyIGRlZl9jYWxsUnVsZVZhbGlkYXRlID0gb3V0O1xuICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgaWYgKCRyRGVmLmVycm9ycyA9PT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICcgKyAoJHZhbGlkKSArICcgPSAnO1xuICAgICAgaWYgKCRhc3luY0tleXdvcmQpIHtcbiAgICAgICAgb3V0ICs9ICdhd2FpdCAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcnICsgKGRlZl9jYWxsUnVsZVZhbGlkYXRlKSArICc7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICgkYXN5bmNLZXl3b3JkKSB7XG4gICAgICAgICRydWxlRXJycyA9ICdjdXN0b21FcnJvcnMnICsgJGx2bDtcbiAgICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJHJ1bGVFcnJzKSArICcgPSBudWxsOyB0cnkgeyAnICsgKCR2YWxpZCkgKyAnID0gYXdhaXQgJyArIChkZWZfY2FsbFJ1bGVWYWxpZGF0ZSkgKyAnOyB9IGNhdGNoIChlKSB7ICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgaWYgKGUgaW5zdGFuY2VvZiBWYWxpZGF0aW9uRXJyb3IpICcgKyAoJHJ1bGVFcnJzKSArICcgPSBlLmVycm9yczsgZWxzZSB0aHJvdyBlOyB9ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyAnICsgKCRydWxlRXJycykgKyAnID0gbnVsbDsgJyArICgkdmFsaWQpICsgJyA9ICcgKyAoZGVmX2NhbGxSdWxlVmFsaWRhdGUpICsgJzsgJztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKCRyRGVmLm1vZGlmeWluZykge1xuICAgIG91dCArPSAnIGlmICgnICsgKCRwYXJlbnREYXRhKSArICcpICcgKyAoJGRhdGEpICsgJyA9ICcgKyAoJHBhcmVudERhdGEpICsgJ1snICsgKCRwYXJlbnREYXRhUHJvcGVydHkpICsgJ107JztcbiAgfVxuICBvdXQgKz0gJycgKyAoJGNsb3NpbmdCcmFjZXMpO1xuICBpZiAoJHJEZWYudmFsaWQpIHtcbiAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgb3V0ICs9ICcgaWYgKHRydWUpIHsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgaWYgKCAnO1xuICAgIGlmICgkckRlZi52YWxpZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBvdXQgKz0gJyAhJztcbiAgICAgIGlmICgkbWFjcm8pIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKCRuZXh0VmFsaWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKCR2YWxpZCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnICcgKyAoISRyRGVmLnZhbGlkKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcpIHsgJztcbiAgICAkZXJyb3JLZXl3b3JkID0gJHJ1bGUua2V5d29yZDtcbiAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgb3V0ID0gJyc7XG4gICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJGVycm9yS2V5d29yZCB8fCAnY3VzdG9tJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBrZXl3b3JkOiBcXCcnICsgKCRydWxlLmtleXdvcmQpICsgJ1xcJyB9ICc7XG4gICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgcGFzcyBcIicgKyAoJHJ1bGUua2V5d29yZCkgKyAnXCIga2V5d29yZCB2YWxpZGF0aW9uXFwnICc7XG4gICAgICB9XG4gICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgfVxuICAgIHZhciBfX2VyciA9IG91dDtcbiAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICB9XG4gICAgdmFyIGRlZl9jdXN0b21FcnJvciA9IG91dDtcbiAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgIGlmICgkaW5saW5lKSB7XG4gICAgICBpZiAoJHJEZWYuZXJyb3JzKSB7XG4gICAgICAgIGlmICgkckRlZi5lcnJvcnMgIT0gJ2Z1bGwnKSB7XG4gICAgICAgICAgb3V0ICs9ICcgIGZvciAodmFyICcgKyAoJGkpICsgJz0nICsgKCRlcnJzKSArICc7ICcgKyAoJGkpICsgJzxlcnJvcnM7ICcgKyAoJGkpICsgJysrKSB7IHZhciAnICsgKCRydWxlRXJyKSArICcgPSB2RXJyb3JzWycgKyAoJGkpICsgJ107IGlmICgnICsgKCRydWxlRXJyKSArICcuZGF0YVBhdGggPT09IHVuZGVmaW5lZCkgJyArICgkcnVsZUVycikgKyAnLmRhdGFQYXRoID0gKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnOyBpZiAoJyArICgkcnVsZUVycikgKyAnLnNjaGVtYVBhdGggPT09IHVuZGVmaW5lZCkgeyAnICsgKCRydWxlRXJyKSArICcuc2NoZW1hUGF0aCA9IFwiJyArICgkZXJyU2NoZW1hUGF0aCkgKyAnXCI7IH0gJztcbiAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAnICsgKCRydWxlRXJyKSArICcuc2NoZW1hID0gJyArICgkc2NoZW1hVmFsdWUpICsgJzsgJyArICgkcnVsZUVycikgKyAnLmRhdGEgPSAnICsgKCRkYXRhKSArICc7ICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCRyRGVmLmVycm9ycyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyAnICsgKGRlZl9jdXN0b21FcnJvcikgKyAnICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJGVycnMpICsgJyA9PSBlcnJvcnMpIHsgJyArIChkZWZfY3VzdG9tRXJyb3IpICsgJyB9IGVsc2UgeyAgZm9yICh2YXIgJyArICgkaSkgKyAnPScgKyAoJGVycnMpICsgJzsgJyArICgkaSkgKyAnPGVycm9yczsgJyArICgkaSkgKyAnKyspIHsgdmFyICcgKyAoJHJ1bGVFcnIpICsgJyA9IHZFcnJvcnNbJyArICgkaSkgKyAnXTsgaWYgKCcgKyAoJHJ1bGVFcnIpICsgJy5kYXRhUGF0aCA9PT0gdW5kZWZpbmVkKSAnICsgKCRydWxlRXJyKSArICcuZGF0YVBhdGggPSAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICc7IGlmICgnICsgKCRydWxlRXJyKSArICcuc2NoZW1hUGF0aCA9PT0gdW5kZWZpbmVkKSB7ICcgKyAoJHJ1bGVFcnIpICsgJy5zY2hlbWFQYXRoID0gXCInICsgKCRlcnJTY2hlbWFQYXRoKSArICdcIjsgfSAnO1xuICAgICAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnICcgKyAoJHJ1bGVFcnIpICsgJy5zY2hlbWEgPSAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnOyAnICsgKCRydWxlRXJyKSArICcuZGF0YSA9ICcgKyAoJGRhdGEpICsgJzsgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSB9ICc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCRtYWNybykge1xuICAgICAgb3V0ICs9ICcgICB2YXIgZXJyID0gICAnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ2N1c3RvbScpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsga2V5d29yZDogXFwnJyArICgkcnVsZS5rZXl3b3JkKSArICdcXCcgfSAnO1xuICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBwYXNzIFwiJyArICgkcnVsZS5rZXl3b3JkKSArICdcIiBrZXl3b3JkIHZhbGlkYXRpb25cXCcgJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB7fSAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKHZFcnJvcnMpOyAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IHZFcnJvcnM7IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoJHJEZWYuZXJyb3JzID09PSBmYWxzZSkge1xuICAgICAgICBvdXQgKz0gJyAnICsgKGRlZl9jdXN0b21FcnJvcikgKyAnICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyBpZiAoQXJyYXkuaXNBcnJheSgnICsgKCRydWxlRXJycykgKyAnKSkgeyBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9ICcgKyAoJHJ1bGVFcnJzKSArICc7IGVsc2UgdkVycm9ycyA9IHZFcnJvcnMuY29uY2F0KCcgKyAoJHJ1bGVFcnJzKSArICcpOyBlcnJvcnMgPSB2RXJyb3JzLmxlbmd0aDsgIGZvciAodmFyICcgKyAoJGkpICsgJz0nICsgKCRlcnJzKSArICc7ICcgKyAoJGkpICsgJzxlcnJvcnM7ICcgKyAoJGkpICsgJysrKSB7IHZhciAnICsgKCRydWxlRXJyKSArICcgPSB2RXJyb3JzWycgKyAoJGkpICsgJ107IGlmICgnICsgKCRydWxlRXJyKSArICcuZGF0YVBhdGggPT09IHVuZGVmaW5lZCkgJyArICgkcnVsZUVycikgKyAnLmRhdGFQYXRoID0gKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnOyAgJyArICgkcnVsZUVycikgKyAnLnNjaGVtYVBhdGggPSBcIicgKyAoJGVyclNjaGVtYVBhdGgpICsgJ1wiOyAgJztcbiAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgIG91dCArPSAnICcgKyAoJHJ1bGVFcnIpICsgJy5zY2hlbWEgPSAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnOyAnICsgKCRydWxlRXJyKSArICcuZGF0YSA9ICcgKyAoJGRhdGEpICsgJzsgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyB9IH0gZWxzZSB7ICcgKyAoZGVmX2N1c3RvbUVycm9yKSArICcgfSAnO1xuICAgICAgfVxuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2N1c3RvbS5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9kZXBlbmRlbmNpZXMoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICRlcnJzID0gJ2VycnNfXycgKyAkbHZsO1xuICB2YXIgJGl0ID0gaXQudXRpbC5jb3B5KGl0KTtcbiAgdmFyICRjbG9zaW5nQnJhY2VzID0gJyc7XG4gICRpdC5sZXZlbCsrO1xuICB2YXIgJG5leHRWYWxpZCA9ICd2YWxpZCcgKyAkaXQubGV2ZWw7XG4gIHZhciAkc2NoZW1hRGVwcyA9IHt9LFxuICAgICRwcm9wZXJ0eURlcHMgPSB7fSxcbiAgICAkb3duUHJvcGVydGllcyA9IGl0Lm9wdHMub3duUHJvcGVydGllcztcbiAgZm9yICgkcHJvcGVydHkgaW4gJHNjaGVtYSkge1xuICAgIGlmICgkcHJvcGVydHkgPT0gJ19fcHJvdG9fXycpIGNvbnRpbnVlO1xuICAgIHZhciAkc2NoID0gJHNjaGVtYVskcHJvcGVydHldO1xuICAgIHZhciAkZGVwcyA9IEFycmF5LmlzQXJyYXkoJHNjaCkgPyAkcHJvcGVydHlEZXBzIDogJHNjaGVtYURlcHM7XG4gICAgJGRlcHNbJHByb3BlcnR5XSA9ICRzY2g7XG4gIH1cbiAgb3V0ICs9ICd2YXIgJyArICgkZXJycykgKyAnID0gZXJyb3JzOyc7XG4gIHZhciAkY3VycmVudEVycm9yUGF0aCA9IGl0LmVycm9yUGF0aDtcbiAgb3V0ICs9ICd2YXIgbWlzc2luZycgKyAoJGx2bCkgKyAnOyc7XG4gIGZvciAodmFyICRwcm9wZXJ0eSBpbiAkcHJvcGVydHlEZXBzKSB7XG4gICAgJGRlcHMgPSAkcHJvcGVydHlEZXBzWyRwcm9wZXJ0eV07XG4gICAgaWYgKCRkZXBzLmxlbmd0aCkge1xuICAgICAgb3V0ICs9ICcgaWYgKCAnICsgKCRkYXRhKSArIChpdC51dGlsLmdldFByb3BlcnR5KCRwcm9wZXJ0eSkpICsgJyAhPT0gdW5kZWZpbmVkICc7XG4gICAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgICAgb3V0ICs9ICcgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHkpKSArICdcXCcpICc7XG4gICAgICB9XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICBvdXQgKz0gJyAmJiAoICc7XG4gICAgICAgIHZhciBhcnIxID0gJGRlcHM7XG4gICAgICAgIGlmIChhcnIxKSB7XG4gICAgICAgICAgdmFyICRwcm9wZXJ0eUtleSwgJGkgPSAtMSxcbiAgICAgICAgICAgIGwxID0gYXJyMS5sZW5ndGggLSAxO1xuICAgICAgICAgIHdoaWxlICgkaSA8IGwxKSB7XG4gICAgICAgICAgICAkcHJvcGVydHlLZXkgPSBhcnIxWyRpICs9IDFdO1xuICAgICAgICAgICAgaWYgKCRpKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIHx8ICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgJHByb3AgPSBpdC51dGlsLmdldFByb3BlcnR5KCRwcm9wZXJ0eUtleSksXG4gICAgICAgICAgICAgICR1c2VEYXRhID0gJGRhdGEgKyAkcHJvcDtcbiAgICAgICAgICAgIG91dCArPSAnICggKCAnICsgKCR1c2VEYXRhKSArICcgPT09IHVuZGVmaW5lZCAnO1xuICAgICAgICAgICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIHx8ICEgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHlLZXkpKSArICdcXCcpICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJykgJiYgKG1pc3NpbmcnICsgKCRsdmwpICsgJyA9ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZyhpdC5vcHRzLmpzb25Qb2ludGVycyA/ICRwcm9wZXJ0eUtleSA6ICRwcm9wKSkgKyAnKSApICc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnKSkgeyAgJztcbiAgICAgICAgdmFyICRwcm9wZXJ0eVBhdGggPSAnbWlzc2luZycgKyAkbHZsLFxuICAgICAgICAgICRtaXNzaW5nUHJvcGVydHkgPSAnXFwnICsgJyArICRwcm9wZXJ0eVBhdGggKyAnICsgXFwnJztcbiAgICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICAgIGl0LmVycm9yUGF0aCA9IGl0Lm9wdHMuanNvblBvaW50ZXJzID8gaXQudXRpbC5nZXRQYXRoRXhwcigkY3VycmVudEVycm9yUGF0aCwgJHByb3BlcnR5UGF0aCwgdHJ1ZSkgOiAkY3VycmVudEVycm9yUGF0aCArICcgKyAnICsgJHByb3BlcnR5UGF0aDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgICAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ2RlcGVuZGVuY2llcycpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgcHJvcGVydHk6IFxcJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5KSkgKyAnXFwnLCBtaXNzaW5nUHJvcGVydHk6IFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFwnLCBkZXBzQ291bnQ6ICcgKyAoJGRlcHMubGVuZ3RoKSArICcsIGRlcHM6IFxcJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJGRlcHMubGVuZ3RoID09IDEgPyAkZGVwc1swXSA6ICRkZXBzLmpvaW4oXCIsIFwiKSkpICsgJ1xcJyB9ICc7XG4gICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBoYXZlICc7XG4gICAgICAgICAgICBpZiAoJGRlcHMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICdwcm9wZXJ0eSAnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRkZXBzWzBdKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJ3Byb3BlcnRpZXMgJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkZGVwcy5qb2luKFwiLCBcIikpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnIHdoZW4gcHJvcGVydHkgJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHkpKSArICcgaXMgcHJlc2VudFxcJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyApIHsgJztcbiAgICAgICAgdmFyIGFycjIgPSAkZGVwcztcbiAgICAgICAgaWYgKGFycjIpIHtcbiAgICAgICAgICB2YXIgJHByb3BlcnR5S2V5LCBpMiA9IC0xLFxuICAgICAgICAgICAgbDIgPSBhcnIyLmxlbmd0aCAtIDE7XG4gICAgICAgICAgd2hpbGUgKGkyIDwgbDIpIHtcbiAgICAgICAgICAgICRwcm9wZXJ0eUtleSA9IGFycjJbaTIgKz0gMV07XG4gICAgICAgICAgICB2YXIgJHByb3AgPSBpdC51dGlsLmdldFByb3BlcnR5KCRwcm9wZXJ0eUtleSksXG4gICAgICAgICAgICAgICRtaXNzaW5nUHJvcGVydHkgPSBpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHlLZXkpLFxuICAgICAgICAgICAgICAkdXNlRGF0YSA9ICRkYXRhICsgJHByb3A7XG4gICAgICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aCgkY3VycmVudEVycm9yUGF0aCwgJHByb3BlcnR5S2V5LCBpdC5vcHRzLmpzb25Qb2ludGVycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJyBpZiAoICcgKyAoJHVzZURhdGEpICsgJyA9PT0gdW5kZWZpbmVkICc7XG4gICAgICAgICAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgISBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSkpICsgJ1xcJykgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnKSB7ICB2YXIgZXJyID0gICAnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdkZXBlbmRlbmNpZXMnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IHByb3BlcnR5OiBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eSkpICsgJ1xcJywgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJywgZGVwc0NvdW50OiAnICsgKCRkZXBzLmxlbmd0aCkgKyAnLCBkZXBzOiBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRkZXBzLmxlbmd0aCA9PSAxID8gJGRlcHNbMF0gOiAkZGVwcy5qb2luKFwiLCBcIikpKSArICdcXCcgfSAnO1xuICAgICAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBoYXZlICc7XG4gICAgICAgICAgICAgICAgaWYgKCRkZXBzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJ3Byb3BlcnR5ICcgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJGRlcHNbMF0pKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICdwcm9wZXJ0aWVzICcgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJGRlcHMuam9pbihcIiwgXCIpKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dCArPSAnIHdoZW4gcHJvcGVydHkgJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHkpKSArICcgaXMgcHJlc2VudFxcJyAnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyB9ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICAgJztcbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICRjbG9zaW5nQnJhY2VzICs9ICd9JztcbiAgICAgICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGl0LmVycm9yUGF0aCA9ICRjdXJyZW50RXJyb3JQYXRoO1xuICB2YXIgJGN1cnJlbnRCYXNlSWQgPSAkaXQuYmFzZUlkO1xuICBmb3IgKHZhciAkcHJvcGVydHkgaW4gJHNjaGVtYURlcHMpIHtcbiAgICB2YXIgJHNjaCA9ICRzY2hlbWFEZXBzWyRwcm9wZXJ0eV07XG4gICAgaWYgKChpdC5vcHRzLnN0cmljdEtleXdvcmRzID8gKHR5cGVvZiAkc2NoID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRzY2gpLmxlbmd0aCA+IDApIHx8ICRzY2ggPT09IGZhbHNlIDogaXQudXRpbC5zY2hlbWFIYXNSdWxlcygkc2NoLCBpdC5SVUxFUy5hbGwpKSkge1xuICAgICAgb3V0ICs9ICcgJyArICgkbmV4dFZhbGlkKSArICcgPSB0cnVlOyBpZiAoICcgKyAoJGRhdGEpICsgKGl0LnV0aWwuZ2V0UHJvcGVydHkoJHByb3BlcnR5KSkgKyAnICE9PSB1bmRlZmluZWQgJztcbiAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICBvdXQgKz0gJyAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eSkpICsgJ1xcJykgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnKSB7ICc7XG4gICAgICAkaXQuc2NoZW1hID0gJHNjaDtcbiAgICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRwcm9wZXJ0eSk7XG4gICAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoICsgJy8nICsgaXQudXRpbC5lc2NhcGVGcmFnbWVudCgkcHJvcGVydHkpO1xuICAgICAgb3V0ICs9ICcgICcgKyAoaXQudmFsaWRhdGUoJGl0KSkgKyAnICc7XG4gICAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgICBvdXQgKz0gJyB9ICAnO1xuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgICAgICRjbG9zaW5nQnJhY2VzICs9ICd9JztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyAgICcgKyAoJGNsb3NpbmdCcmFjZXMpICsgJyBpZiAoJyArICgkZXJycykgKyAnID09IGVycm9ycykgeyc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9kZXBlbmRlbmNpZXMuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfZW51bShpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmw7XG4gIHZhciAkaXNEYXRhID0gaXQub3B0cy4kZGF0YSAmJiAkc2NoZW1hICYmICRzY2hlbWEuJGRhdGEsXG4gICAgJHNjaGVtYVZhbHVlO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciBzY2hlbWEnICsgKCRsdmwpICsgJyA9ICcgKyAoaXQudXRpbC5nZXREYXRhKCRzY2hlbWEuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFycikpICsgJzsgJztcbiAgICAkc2NoZW1hVmFsdWUgPSAnc2NoZW1hJyArICRsdmw7XG4gIH0gZWxzZSB7XG4gICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYTtcbiAgfVxuICB2YXIgJGkgPSAnaScgKyAkbHZsLFxuICAgICR2U2NoZW1hID0gJ3NjaGVtYScgKyAkbHZsO1xuICBpZiAoISRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgJyArICgkdlNjaGVtYSkgKyAnID0gdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnOyc7XG4gIH1cbiAgb3V0ICs9ICd2YXIgJyArICgkdmFsaWQpICsgJzsnO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnIGlmIChzY2hlbWEnICsgKCRsdmwpICsgJyA9PT0gdW5kZWZpbmVkKSAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZTsgZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkoc2NoZW1hJyArICgkbHZsKSArICcpKSAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7IGVsc2Ugeyc7XG4gIH1cbiAgb3V0ICs9ICcnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7Zm9yICh2YXIgJyArICgkaSkgKyAnPTA7ICcgKyAoJGkpICsgJzwnICsgKCR2U2NoZW1hKSArICcubGVuZ3RoOyAnICsgKCRpKSArICcrKykgaWYgKGVxdWFsKCcgKyAoJGRhdGEpICsgJywgJyArICgkdlNjaGVtYSkgKyAnWycgKyAoJGkpICsgJ10pKSB7ICcgKyAoJHZhbGlkKSArICcgPSB0cnVlOyBicmVhazsgfSc7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgIH0gICc7XG4gIH1cbiAgb3V0ICs9ICcgaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICAgJztcbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdlbnVtJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBhbGxvd2VkVmFsdWVzOiBzY2hlbWEnICsgKCRsdmwpICsgJyB9ICc7XG4gICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBiZSBlcXVhbCB0byBvbmUgb2YgdGhlIGFsbG93ZWQgdmFsdWVzXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB7fSAnO1xuICB9XG4gIHZhciBfX2VyciA9IG91dDtcbiAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gIH1cbiAgb3V0ICs9ICcgfSc7XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9lbnVtLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2Zvcm1hdChpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICBpZiAoaXQub3B0cy5mb3JtYXQgPT09IGZhbHNlKSB7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG4gIH1cbiAgdmFyICRpc0RhdGEgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWEgJiYgJHNjaGVtYS4kZGF0YSxcbiAgICAkc2NoZW1hVmFsdWU7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLmdldERhdGEoJHNjaGVtYS4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgfSBlbHNlIHtcbiAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hO1xuICB9XG4gIHZhciAkdW5rbm93bkZvcm1hdHMgPSBpdC5vcHRzLnVua25vd25Gb3JtYXRzLFxuICAgICRhbGxvd1Vua25vd24gPSBBcnJheS5pc0FycmF5KCR1bmtub3duRm9ybWF0cyk7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgdmFyICRmb3JtYXQgPSAnZm9ybWF0JyArICRsdmwsXG4gICAgICAkaXNPYmplY3QgPSAnaXNPYmplY3QnICsgJGx2bCxcbiAgICAgICRmb3JtYXRUeXBlID0gJ2Zvcm1hdFR5cGUnICsgJGx2bDtcbiAgICBvdXQgKz0gJyB2YXIgJyArICgkZm9ybWF0KSArICcgPSBmb3JtYXRzWycgKyAoJHNjaGVtYVZhbHVlKSArICddOyB2YXIgJyArICgkaXNPYmplY3QpICsgJyA9IHR5cGVvZiAnICsgKCRmb3JtYXQpICsgJyA9PSBcXCdvYmplY3RcXCcgJiYgISgnICsgKCRmb3JtYXQpICsgJyBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgJyArICgkZm9ybWF0KSArICcudmFsaWRhdGU7IHZhciAnICsgKCRmb3JtYXRUeXBlKSArICcgPSAnICsgKCRpc09iamVjdCkgKyAnICYmICcgKyAoJGZvcm1hdCkgKyAnLnR5cGUgfHwgXFwnc3RyaW5nXFwnOyBpZiAoJyArICgkaXNPYmplY3QpICsgJykgeyAnO1xuICAgIGlmIChpdC5hc3luYykge1xuICAgICAgb3V0ICs9ICcgdmFyIGFzeW5jJyArICgkbHZsKSArICcgPSAnICsgKCRmb3JtYXQpICsgJy5hc3luYzsgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgJyArICgkZm9ybWF0KSArICcgPSAnICsgKCRmb3JtYXQpICsgJy52YWxpZGF0ZTsgfSBpZiAoICAnO1xuICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ3N0cmluZ1xcJykgfHwgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgKCc7XG4gICAgaWYgKCR1bmtub3duRm9ybWF0cyAhPSAnaWdub3JlJykge1xuICAgICAgb3V0ICs9ICcgKCcgKyAoJHNjaGVtYVZhbHVlKSArICcgJiYgIScgKyAoJGZvcm1hdCkgKyAnICc7XG4gICAgICBpZiAoJGFsbG93VW5rbm93bikge1xuICAgICAgICBvdXQgKz0gJyAmJiBzZWxmLl9vcHRzLnVua25vd25Gb3JtYXRzLmluZGV4T2YoJyArICgkc2NoZW1hVmFsdWUpICsgJykgPT0gLTEgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnKSB8fCAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyAoJyArICgkZm9ybWF0KSArICcgJiYgJyArICgkZm9ybWF0VHlwZSkgKyAnID09IFxcJycgKyAoJHJ1bGVUeXBlKSArICdcXCcgJiYgISh0eXBlb2YgJyArICgkZm9ybWF0KSArICcgPT0gXFwnZnVuY3Rpb25cXCcgPyAnO1xuICAgIGlmIChpdC5hc3luYykge1xuICAgICAgb3V0ICs9ICcgKGFzeW5jJyArICgkbHZsKSArICcgPyBhd2FpdCAnICsgKCRmb3JtYXQpICsgJygnICsgKCRkYXRhKSArICcpIDogJyArICgkZm9ybWF0KSArICcoJyArICgkZGF0YSkgKyAnKSkgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgJyArICgkZm9ybWF0KSArICcoJyArICgkZGF0YSkgKyAnKSAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyA6ICcgKyAoJGZvcm1hdCkgKyAnLnRlc3QoJyArICgkZGF0YSkgKyAnKSkpKSkgeyc7XG4gIH0gZWxzZSB7XG4gICAgdmFyICRmb3JtYXQgPSBpdC5mb3JtYXRzWyRzY2hlbWFdO1xuICAgIGlmICghJGZvcm1hdCkge1xuICAgICAgaWYgKCR1bmtub3duRm9ybWF0cyA9PSAnaWdub3JlJykge1xuICAgICAgICBpdC5sb2dnZXIud2FybigndW5rbm93biBmb3JtYXQgXCInICsgJHNjaGVtYSArICdcIiBpZ25vcmVkIGluIHNjaGVtYSBhdCBwYXRoIFwiJyArIGl0LmVyclNjaGVtYVBhdGggKyAnXCInKTtcbiAgICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgICBvdXQgKz0gJyBpZiAodHJ1ZSkgeyAnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgICB9IGVsc2UgaWYgKCRhbGxvd1Vua25vd24gJiYgJHVua25vd25Gb3JtYXRzLmluZGV4T2YoJHNjaGVtYSkgPj0gMCkge1xuICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5rbm93biBmb3JtYXQgXCInICsgJHNjaGVtYSArICdcIiBpcyB1c2VkIGluIHNjaGVtYSBhdCBwYXRoIFwiJyArIGl0LmVyclNjaGVtYVBhdGggKyAnXCInKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyICRpc09iamVjdCA9IHR5cGVvZiAkZm9ybWF0ID09ICdvYmplY3QnICYmICEoJGZvcm1hdCBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgJGZvcm1hdC52YWxpZGF0ZTtcbiAgICB2YXIgJGZvcm1hdFR5cGUgPSAkaXNPYmplY3QgJiYgJGZvcm1hdC50eXBlIHx8ICdzdHJpbmcnO1xuICAgIGlmICgkaXNPYmplY3QpIHtcbiAgICAgIHZhciAkYXN5bmMgPSAkZm9ybWF0LmFzeW5jID09PSB0cnVlO1xuICAgICAgJGZvcm1hdCA9ICRmb3JtYXQudmFsaWRhdGU7XG4gICAgfVxuICAgIGlmICgkZm9ybWF0VHlwZSAhPSAkcnVsZVR5cGUpIHtcbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3V0O1xuICAgIH1cbiAgICBpZiAoJGFzeW5jKSB7XG4gICAgICBpZiAoIWl0LmFzeW5jKSB0aHJvdyBuZXcgRXJyb3IoJ2FzeW5jIGZvcm1hdCBpbiBzeW5jIHNjaGVtYScpO1xuICAgICAgdmFyICRmb3JtYXRSZWYgPSAnZm9ybWF0cycgKyBpdC51dGlsLmdldFByb3BlcnR5KCRzY2hlbWEpICsgJy52YWxpZGF0ZSc7XG4gICAgICBvdXQgKz0gJyBpZiAoIShhd2FpdCAnICsgKCRmb3JtYXRSZWYpICsgJygnICsgKCRkYXRhKSArICcpKSkgeyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyBpZiAoISAnO1xuICAgICAgdmFyICRmb3JtYXRSZWYgPSAnZm9ybWF0cycgKyBpdC51dGlsLmdldFByb3BlcnR5KCRzY2hlbWEpO1xuICAgICAgaWYgKCRpc09iamVjdCkgJGZvcm1hdFJlZiArPSAnLnZhbGlkYXRlJztcbiAgICAgIGlmICh0eXBlb2YgJGZvcm1hdCA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG91dCArPSAnICcgKyAoJGZvcm1hdFJlZikgKyAnKCcgKyAoJGRhdGEpICsgJykgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnICcgKyAoJGZvcm1hdFJlZikgKyAnLnRlc3QoJyArICgkZGF0YSkgKyAnKSAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcpIHsgJztcbiAgICB9XG4gIH1cbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdmb3JtYXQnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGZvcm1hdDogICc7XG4gICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgIG91dCArPSAnJyArICgkc2NoZW1hVmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJycgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkc2NoZW1hKSk7XG4gICAgfVxuICAgIG91dCArPSAnICB9ICc7XG4gICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBtYXRjaCBmb3JtYXQgXCInO1xuICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgb3V0ICs9ICdcXCcgKyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICsgXFwnJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArIChpdC51dGlsLmVzY2FwZVF1b3Rlcygkc2NoZW1hKSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJ1wiXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkc2NoZW1hKSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnIH0gJztcbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2Zvcm1hdC5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9pZihpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmw7XG4gIHZhciAkZXJycyA9ICdlcnJzX18nICsgJGx2bDtcbiAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gICRpdC5sZXZlbCsrO1xuICB2YXIgJG5leHRWYWxpZCA9ICd2YWxpZCcgKyAkaXQubGV2ZWw7XG4gIHZhciAkdGhlblNjaCA9IGl0LnNjaGVtYVsndGhlbiddLFxuICAgICRlbHNlU2NoID0gaXQuc2NoZW1hWydlbHNlJ10sXG4gICAgJHRoZW5QcmVzZW50ID0gJHRoZW5TY2ggIT09IHVuZGVmaW5lZCAmJiAoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHRoZW5TY2ggPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHRoZW5TY2gpLmxlbmd0aCA+IDApIHx8ICR0aGVuU2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHRoZW5TY2gsIGl0LlJVTEVTLmFsbCkpLFxuICAgICRlbHNlUHJlc2VudCA9ICRlbHNlU2NoICE9PSB1bmRlZmluZWQgJiYgKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRlbHNlU2NoID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRlbHNlU2NoKS5sZW5ndGggPiAwKSB8fCAkZWxzZVNjaCA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRlbHNlU2NoLCBpdC5SVUxFUy5hbGwpKSxcbiAgICAkY3VycmVudEJhc2VJZCA9ICRpdC5iYXNlSWQ7XG4gIGlmICgkdGhlblByZXNlbnQgfHwgJGVsc2VQcmVzZW50KSB7XG4gICAgdmFyICRpZkNsYXVzZTtcbiAgICAkaXQuY3JlYXRlRXJyb3JzID0gZmFsc2U7XG4gICAgJGl0LnNjaGVtYSA9ICRzY2hlbWE7XG4gICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aDtcbiAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoO1xuICAgIG91dCArPSAnIHZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7IHZhciAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZTsgICc7XG4gICAgdmFyICR3YXNDb21wb3NpdGUgPSBpdC5jb21wb3NpdGVSdWxlO1xuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9IHRydWU7XG4gICAgb3V0ICs9ICcgICcgKyAoaXQudmFsaWRhdGUoJGl0KSkgKyAnICc7XG4gICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgICRpdC5jcmVhdGVFcnJvcnMgPSB0cnVlO1xuICAgIG91dCArPSAnICBlcnJvcnMgPSAnICsgKCRlcnJzKSArICc7IGlmICh2RXJyb3JzICE9PSBudWxsKSB7IGlmICgnICsgKCRlcnJzKSArICcpIHZFcnJvcnMubGVuZ3RoID0gJyArICgkZXJycykgKyAnOyBlbHNlIHZFcnJvcnMgPSBudWxsOyB9ICAnO1xuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9ICR3YXNDb21wb3NpdGU7XG4gICAgaWYgKCR0aGVuUHJlc2VudCkge1xuICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICAnO1xuICAgICAgJGl0LnNjaGVtYSA9IGl0LnNjaGVtYVsndGhlbiddO1xuICAgICAgJGl0LnNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgJy50aGVuJztcbiAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvdGhlbic7XG4gICAgICBvdXQgKz0gJyAgJyArIChpdC52YWxpZGF0ZSgkaXQpKSArICcgJztcbiAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgIG91dCArPSAnICcgKyAoJHZhbGlkKSArICcgPSAnICsgKCRuZXh0VmFsaWQpICsgJzsgJztcbiAgICAgIGlmICgkdGhlblByZXNlbnQgJiYgJGVsc2VQcmVzZW50KSB7XG4gICAgICAgICRpZkNsYXVzZSA9ICdpZkNsYXVzZScgKyAkbHZsO1xuICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkaWZDbGF1c2UpICsgJyA9IFxcJ3RoZW5cXCc7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkaWZDbGF1c2UgPSAnXFwndGhlblxcJyc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICBpZiAoJGVsc2VQcmVzZW50KSB7XG4gICAgICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgfVxuICAgIGlmICgkZWxzZVByZXNlbnQpIHtcbiAgICAgICRpdC5zY2hlbWEgPSBpdC5zY2hlbWFbJ2Vsc2UnXTtcbiAgICAgICRpdC5zY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArICcuZWxzZSc7XG4gICAgICAkaXQuZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnL2Vsc2UnO1xuICAgICAgb3V0ICs9ICcgICcgKyAoaXQudmFsaWRhdGUoJGl0KSkgKyAnICc7XG4gICAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gJyArICgkbmV4dFZhbGlkKSArICc7ICc7XG4gICAgICBpZiAoJHRoZW5QcmVzZW50ICYmICRlbHNlUHJlc2VudCkge1xuICAgICAgICAkaWZDbGF1c2UgPSAnaWZDbGF1c2UnICsgJGx2bDtcbiAgICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJGlmQ2xhdXNlKSArICcgPSBcXCdlbHNlXFwnOyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJGlmQ2xhdXNlID0gJ1xcJ2Vsc2VcXCcnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyBpZiAoIScgKyAoJHZhbGlkKSArICcpIHsgICB2YXIgZXJyID0gICAnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ2lmJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBmYWlsaW5nS2V5d29yZDogJyArICgkaWZDbGF1c2UpICsgJyB9ICc7XG4gICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgbWF0Y2ggXCJcXCcgKyAnICsgKCRpZkNsYXVzZSkgKyAnICsgXFwnXCIgc2NoZW1hXFwnICc7XG4gICAgICB9XG4gICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgfVxuICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IodkVycm9ycyk7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSB2RXJyb3JzOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICB9XG4gICAgfVxuICAgIG91dCArPSAnIH0gICAnO1xuICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvaWYuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxuLy9hbGwgcmVxdWlyZXMgbXVzdCBiZSBleHBsaWNpdCBiZWNhdXNlIGJyb3dzZXJpZnkgd29uJ3Qgd29yayB3aXRoIGR5bmFtaWMgcmVxdWlyZXNcbm1vZHVsZS5leHBvcnRzID0ge1xuICAnJHJlZic6IHJlcXVpcmUoJy4vcmVmJyksXG4gIGFsbE9mOiByZXF1aXJlKCcuL2FsbE9mJyksXG4gIGFueU9mOiByZXF1aXJlKCcuL2FueU9mJyksXG4gICckY29tbWVudCc6IHJlcXVpcmUoJy4vY29tbWVudCcpLFxuICBjb25zdDogcmVxdWlyZSgnLi9jb25zdCcpLFxuICBjb250YWluczogcmVxdWlyZSgnLi9jb250YWlucycpLFxuICBkZXBlbmRlbmNpZXM6IHJlcXVpcmUoJy4vZGVwZW5kZW5jaWVzJyksXG4gICdlbnVtJzogcmVxdWlyZSgnLi9lbnVtJyksXG4gIGZvcm1hdDogcmVxdWlyZSgnLi9mb3JtYXQnKSxcbiAgJ2lmJzogcmVxdWlyZSgnLi9pZicpLFxuICBpdGVtczogcmVxdWlyZSgnLi9pdGVtcycpLFxuICBtYXhpbXVtOiByZXF1aXJlKCcuL19saW1pdCcpLFxuICBtaW5pbXVtOiByZXF1aXJlKCcuL19saW1pdCcpLFxuICBtYXhJdGVtczogcmVxdWlyZSgnLi9fbGltaXRJdGVtcycpLFxuICBtaW5JdGVtczogcmVxdWlyZSgnLi9fbGltaXRJdGVtcycpLFxuICBtYXhMZW5ndGg6IHJlcXVpcmUoJy4vX2xpbWl0TGVuZ3RoJyksXG4gIG1pbkxlbmd0aDogcmVxdWlyZSgnLi9fbGltaXRMZW5ndGgnKSxcbiAgbWF4UHJvcGVydGllczogcmVxdWlyZSgnLi9fbGltaXRQcm9wZXJ0aWVzJyksXG4gIG1pblByb3BlcnRpZXM6IHJlcXVpcmUoJy4vX2xpbWl0UHJvcGVydGllcycpLFxuICBtdWx0aXBsZU9mOiByZXF1aXJlKCcuL211bHRpcGxlT2YnKSxcbiAgbm90OiByZXF1aXJlKCcuL25vdCcpLFxuICBvbmVPZjogcmVxdWlyZSgnLi9vbmVPZicpLFxuICBwYXR0ZXJuOiByZXF1aXJlKCcuL3BhdHRlcm4nKSxcbiAgcHJvcGVydGllczogcmVxdWlyZSgnLi9wcm9wZXJ0aWVzJyksXG4gIHByb3BlcnR5TmFtZXM6IHJlcXVpcmUoJy4vcHJvcGVydHlOYW1lcycpLFxuICByZXF1aXJlZDogcmVxdWlyZSgnLi9yZXF1aXJlZCcpLFxuICB1bmlxdWVJdGVtczogcmVxdWlyZSgnLi91bmlxdWVJdGVtcycpLFxuICB2YWxpZGF0ZTogcmVxdWlyZSgnLi92YWxpZGF0ZScpXG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2luZGV4LmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2l0ZW1zKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkdmFsaWQgPSAndmFsaWQnICsgJGx2bDtcbiAgdmFyICRlcnJzID0gJ2VycnNfXycgKyAkbHZsO1xuICB2YXIgJGl0ID0gaXQudXRpbC5jb3B5KGl0KTtcbiAgdmFyICRjbG9zaW5nQnJhY2VzID0gJyc7XG4gICRpdC5sZXZlbCsrO1xuICB2YXIgJG5leHRWYWxpZCA9ICd2YWxpZCcgKyAkaXQubGV2ZWw7XG4gIHZhciAkaWR4ID0gJ2knICsgJGx2bCxcbiAgICAkZGF0YU54dCA9ICRpdC5kYXRhTGV2ZWwgPSBpdC5kYXRhTGV2ZWwgKyAxLFxuICAgICRuZXh0RGF0YSA9ICdkYXRhJyArICRkYXRhTnh0LFxuICAgICRjdXJyZW50QmFzZUlkID0gaXQuYmFzZUlkO1xuICBvdXQgKz0gJ3ZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7dmFyICcgKyAoJHZhbGlkKSArICc7JztcbiAgaWYgKEFycmF5LmlzQXJyYXkoJHNjaGVtYSkpIHtcbiAgICB2YXIgJGFkZGl0aW9uYWxJdGVtcyA9IGl0LnNjaGVtYS5hZGRpdGlvbmFsSXRlbXM7XG4gICAgaWYgKCRhZGRpdGlvbmFsSXRlbXMgPT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gJyArICgkZGF0YSkgKyAnLmxlbmd0aCA8PSAnICsgKCRzY2hlbWEubGVuZ3RoKSArICc7ICc7XG4gICAgICB2YXIgJGN1cnJFcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGg7XG4gICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnL2FkZGl0aW9uYWxJdGVtcyc7XG4gICAgICBvdXQgKz0gJyAgaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICAgJztcbiAgICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ2FkZGl0aW9uYWxJdGVtcycpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbGltaXQ6ICcgKyAoJHNjaGVtYS5sZW5ndGgpICsgJyB9ICc7XG4gICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIE5PVCBoYXZlIG1vcmUgdGhhbiAnICsgKCRzY2hlbWEubGVuZ3RoKSArICcgaXRlbXNcXCcgJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IGZhbHNlICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICB9XG4gICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gJztcbiAgICAgICRlcnJTY2hlbWFQYXRoID0gJGN1cnJFcnJTY2hlbWFQYXRoO1xuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgICAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGFycjEgPSAkc2NoZW1hO1xuICAgIGlmIChhcnIxKSB7XG4gICAgICB2YXIgJHNjaCwgJGkgPSAtMSxcbiAgICAgICAgbDEgPSBhcnIxLmxlbmd0aCAtIDE7XG4gICAgICB3aGlsZSAoJGkgPCBsMSkge1xuICAgICAgICAkc2NoID0gYXJyMVskaSArPSAxXTtcbiAgICAgICAgaWYgKChpdC5vcHRzLnN0cmljdEtleXdvcmRzID8gKHR5cGVvZiAkc2NoID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRzY2gpLmxlbmd0aCA+IDApIHx8ICRzY2ggPT09IGZhbHNlIDogaXQudXRpbC5zY2hlbWFIYXNSdWxlcygkc2NoLCBpdC5SVUxFUy5hbGwpKSkge1xuICAgICAgICAgIG91dCArPSAnICcgKyAoJG5leHRWYWxpZCkgKyAnID0gdHJ1ZTsgaWYgKCcgKyAoJGRhdGEpICsgJy5sZW5ndGggPiAnICsgKCRpKSArICcpIHsgJztcbiAgICAgICAgICB2YXIgJHBhc3NEYXRhID0gJGRhdGEgKyAnWycgKyAkaSArICddJztcbiAgICAgICAgICAkaXQuc2NoZW1hID0gJHNjaDtcbiAgICAgICAgICAkaXQuc2NoZW1hUGF0aCA9ICRzY2hlbWFQYXRoICsgJ1snICsgJGkgKyAnXSc7XG4gICAgICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aCArICcvJyArICRpO1xuICAgICAgICAgICRpdC5lcnJvclBhdGggPSBpdC51dGlsLmdldFBhdGhFeHByKGl0LmVycm9yUGF0aCwgJGksIGl0Lm9wdHMuanNvblBvaW50ZXJzLCB0cnVlKTtcbiAgICAgICAgICAkaXQuZGF0YVBhdGhBcnJbJGRhdGFOeHRdID0gJGk7XG4gICAgICAgICAgdmFyICRjb2RlID0gaXQudmFsaWRhdGUoJGl0KTtcbiAgICAgICAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgICAgICAgaWYgKGl0LnV0aWwudmFyT2NjdXJlbmNlcygkY29kZSwgJG5leHREYXRhKSA8IDIpIHtcbiAgICAgICAgICAgIG91dCArPSAnICcgKyAoaXQudXRpbC52YXJSZXBsYWNlKCRjb2RlLCAkbmV4dERhdGEsICRwYXNzRGF0YSkpICsgJyAnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkbmV4dERhdGEpICsgJyA9ICcgKyAoJHBhc3NEYXRhKSArICc7ICcgKyAoJGNvZGUpICsgJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyB9ICAnO1xuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBpZiAoJyArICgkbmV4dFZhbGlkKSArICcpIHsgJztcbiAgICAgICAgICAgICRjbG9zaW5nQnJhY2VzICs9ICd9JztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHR5cGVvZiAkYWRkaXRpb25hbEl0ZW1zID09ICdvYmplY3QnICYmIChpdC5vcHRzLnN0cmljdEtleXdvcmRzID8gKHR5cGVvZiAkYWRkaXRpb25hbEl0ZW1zID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRhZGRpdGlvbmFsSXRlbXMpLmxlbmd0aCA+IDApIHx8ICRhZGRpdGlvbmFsSXRlbXMgPT09IGZhbHNlIDogaXQudXRpbC5zY2hlbWFIYXNSdWxlcygkYWRkaXRpb25hbEl0ZW1zLCBpdC5SVUxFUy5hbGwpKSkge1xuICAgICAgJGl0LnNjaGVtYSA9ICRhZGRpdGlvbmFsSXRlbXM7XG4gICAgICAkaXQuc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyAnLmFkZGl0aW9uYWxJdGVtcyc7XG4gICAgICAkaXQuZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnL2FkZGl0aW9uYWxJdGVtcyc7XG4gICAgICBvdXQgKz0gJyAnICsgKCRuZXh0VmFsaWQpICsgJyA9IHRydWU7IGlmICgnICsgKCRkYXRhKSArICcubGVuZ3RoID4gJyArICgkc2NoZW1hLmxlbmd0aCkgKyAnKSB7ICBmb3IgKHZhciAnICsgKCRpZHgpICsgJyA9ICcgKyAoJHNjaGVtYS5sZW5ndGgpICsgJzsgJyArICgkaWR4KSArICcgPCAnICsgKCRkYXRhKSArICcubGVuZ3RoOyAnICsgKCRpZHgpICsgJysrKSB7ICc7XG4gICAgICAkaXQuZXJyb3JQYXRoID0gaXQudXRpbC5nZXRQYXRoRXhwcihpdC5lcnJvclBhdGgsICRpZHgsIGl0Lm9wdHMuanNvblBvaW50ZXJzLCB0cnVlKTtcbiAgICAgIHZhciAkcGFzc0RhdGEgPSAkZGF0YSArICdbJyArICRpZHggKyAnXSc7XG4gICAgICAkaXQuZGF0YVBhdGhBcnJbJGRhdGFOeHRdID0gJGlkeDtcbiAgICAgIHZhciAkY29kZSA9IGl0LnZhbGlkYXRlKCRpdCk7XG4gICAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgICBpZiAoaXQudXRpbC52YXJPY2N1cmVuY2VzKCRjb2RlLCAkbmV4dERhdGEpIDwgMikge1xuICAgICAgICBvdXQgKz0gJyAnICsgKGl0LnV0aWwudmFyUmVwbGFjZSgkY29kZSwgJG5leHREYXRhLCAkcGFzc0RhdGEpKSArICcgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJyArICgkY29kZSkgKyAnICc7XG4gICAgICB9XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICBvdXQgKz0gJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSBicmVhazsgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gfSAgJztcbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJykgeyAnO1xuICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKChpdC5vcHRzLnN0cmljdEtleXdvcmRzID8gKHR5cGVvZiAkc2NoZW1hID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRzY2hlbWEpLmxlbmd0aCA+IDApIHx8ICRzY2hlbWEgPT09IGZhbHNlIDogaXQudXRpbC5zY2hlbWFIYXNSdWxlcygkc2NoZW1hLCBpdC5SVUxFUy5hbGwpKSkge1xuICAgICRpdC5zY2hlbWEgPSAkc2NoZW1hO1xuICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGg7XG4gICAgJGl0LmVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aDtcbiAgICBvdXQgKz0gJyAgZm9yICh2YXIgJyArICgkaWR4KSArICcgPSAnICsgKDApICsgJzsgJyArICgkaWR4KSArICcgPCAnICsgKCRkYXRhKSArICcubGVuZ3RoOyAnICsgKCRpZHgpICsgJysrKSB7ICc7XG4gICAgJGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAkaWR4LCBpdC5vcHRzLmpzb25Qb2ludGVycywgdHJ1ZSk7XG4gICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgJ1snICsgJGlkeCArICddJztcbiAgICAkaXQuZGF0YVBhdGhBcnJbJGRhdGFOeHRdID0gJGlkeDtcbiAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpO1xuICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICBpZiAoaXQudXRpbC52YXJPY2N1cmVuY2VzKCRjb2RlLCAkbmV4dERhdGEpIDwgMikge1xuICAgICAgb3V0ICs9ICcgJyArIChpdC51dGlsLnZhclJlcGxhY2UoJGNvZGUsICRuZXh0RGF0YSwgJHBhc3NEYXRhKSkgKyAnICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJyArICgkY29kZSkgKyAnICc7XG4gICAgfVxuICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICBvdXQgKz0gJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSBicmVhazsgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSc7XG4gIH1cbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyAnICsgKCRjbG9zaW5nQnJhY2VzKSArICcgaWYgKCcgKyAoJGVycnMpICsgJyA9PSBlcnJvcnMpIHsnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvaXRlbXMuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfbXVsdGlwbGVPZihpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgaWYgKCEoJGlzRGF0YSB8fCB0eXBlb2YgJHNjaGVtYSA9PSAnbnVtYmVyJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJGtleXdvcmQgKyAnIG11c3QgYmUgbnVtYmVyJyk7XG4gIH1cbiAgb3V0ICs9ICd2YXIgZGl2aXNpb24nICsgKCRsdmwpICsgJztpZiAoJztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9PSB1bmRlZmluZWQgJiYgKCB0eXBlb2YgJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPSBcXCdudW1iZXJcXCcgfHwgJztcbiAgfVxuICBvdXQgKz0gJyAoZGl2aXNpb24nICsgKCRsdmwpICsgJyA9ICcgKyAoJGRhdGEpICsgJyAvICcgKyAoJHNjaGVtYVZhbHVlKSArICcsICc7XG4gIGlmIChpdC5vcHRzLm11bHRpcGxlT2ZQcmVjaXNpb24pIHtcbiAgICBvdXQgKz0gJyBNYXRoLmFicyhNYXRoLnJvdW5kKGRpdmlzaW9uJyArICgkbHZsKSArICcpIC0gZGl2aXNpb24nICsgKCRsdmwpICsgJykgPiAxZS0nICsgKGl0Lm9wdHMubXVsdGlwbGVPZlByZWNpc2lvbikgKyAnICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgZGl2aXNpb24nICsgKCRsdmwpICsgJyAhPT0gcGFyc2VJbnQoZGl2aXNpb24nICsgKCRsdmwpICsgJykgJztcbiAgfVxuICBvdXQgKz0gJyApICc7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgICkgICc7XG4gIH1cbiAgb3V0ICs9ICcgKSB7ICAgJztcbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdtdWx0aXBsZU9mJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBtdWx0aXBsZU9mOiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGJlIG11bHRpcGxlIG9mICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ1xcJyArICcgKyAoJHNjaGVtYVZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArICgkc2NoZW1hVmFsdWUpICsgJ1xcJyc7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnfSAnO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvbXVsdGlwbGVPZi5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9ub3QoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICRlcnJzID0gJ2VycnNfXycgKyAkbHZsO1xuICB2YXIgJGl0ID0gaXQudXRpbC5jb3B5KGl0KTtcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgaWYgKChpdC5vcHRzLnN0cmljdEtleXdvcmRzID8gKHR5cGVvZiAkc2NoZW1hID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRzY2hlbWEpLmxlbmd0aCA+IDApIHx8ICRzY2hlbWEgPT09IGZhbHNlIDogaXQudXRpbC5zY2hlbWFIYXNSdWxlcygkc2NoZW1hLCBpdC5SVUxFUy5hbGwpKSkge1xuICAgICRpdC5zY2hlbWEgPSAkc2NoZW1hO1xuICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGg7XG4gICAgJGl0LmVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aDtcbiAgICBvdXQgKz0gJyB2YXIgJyArICgkZXJycykgKyAnID0gZXJyb3JzOyAgJztcbiAgICB2YXIgJHdhc0NvbXBvc2l0ZSA9IGl0LmNvbXBvc2l0ZVJ1bGU7XG4gICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gdHJ1ZTtcbiAgICAkaXQuY3JlYXRlRXJyb3JzID0gZmFsc2U7XG4gICAgdmFyICRhbGxFcnJvcnNPcHRpb247XG4gICAgaWYgKCRpdC5vcHRzLmFsbEVycm9ycykge1xuICAgICAgJGFsbEVycm9yc09wdGlvbiA9ICRpdC5vcHRzLmFsbEVycm9ycztcbiAgICAgICRpdC5vcHRzLmFsbEVycm9ycyA9IGZhbHNlO1xuICAgIH1cbiAgICBvdXQgKz0gJyAnICsgKGl0LnZhbGlkYXRlKCRpdCkpICsgJyAnO1xuICAgICRpdC5jcmVhdGVFcnJvcnMgPSB0cnVlO1xuICAgIGlmICgkYWxsRXJyb3JzT3B0aW9uKSAkaXQub3B0cy5hbGxFcnJvcnMgPSAkYWxsRXJyb3JzT3B0aW9uO1xuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9ICR3YXNDb21wb3NpdGU7XG4gICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICAgJztcbiAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnbm90JykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczoge30gJztcbiAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBOT1QgYmUgdmFsaWRcXCcgJztcbiAgICAgIH1cbiAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcge30gJztcbiAgICB9XG4gICAgdmFyIF9fZXJyID0gb3V0O1xuICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9IGVsc2UgeyAgZXJyb3JzID0gJyArICgkZXJycykgKyAnOyBpZiAodkVycm9ycyAhPT0gbnVsbCkgeyBpZiAoJyArICgkZXJycykgKyAnKSB2RXJyb3JzLmxlbmd0aCA9ICcgKyAoJGVycnMpICsgJzsgZWxzZSB2RXJyb3JzID0gbnVsbDsgfSAnO1xuICAgIGlmIChpdC5vcHRzLmFsbEVycm9ycykge1xuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdub3QnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7fSAnO1xuICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIE5PVCBiZSB2YWxpZFxcJyAnO1xuICAgICAgfVxuICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB7fSAnO1xuICAgIH1cbiAgICBvdXQgKz0gJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICBvdXQgKz0gJyBpZiAoZmFsc2UpIHsgJztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9ub3QuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfb25lT2YoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICB2YXIgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgdmFyICRjdXJyZW50QmFzZUlkID0gJGl0LmJhc2VJZCxcbiAgICAkcHJldlZhbGlkID0gJ3ByZXZWYWxpZCcgKyAkbHZsLFxuICAgICRwYXNzaW5nU2NoZW1hcyA9ICdwYXNzaW5nU2NoZW1hcycgKyAkbHZsO1xuICBvdXQgKz0gJ3ZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnMgLCAnICsgKCRwcmV2VmFsaWQpICsgJyA9IGZhbHNlICwgJyArICgkdmFsaWQpICsgJyA9IGZhbHNlICwgJyArICgkcGFzc2luZ1NjaGVtYXMpICsgJyA9IG51bGw7ICc7XG4gIHZhciAkd2FzQ29tcG9zaXRlID0gaXQuY29tcG9zaXRlUnVsZTtcbiAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gdHJ1ZTtcbiAgdmFyIGFycjEgPSAkc2NoZW1hO1xuICBpZiAoYXJyMSkge1xuICAgIHZhciAkc2NoLCAkaSA9IC0xLFxuICAgICAgbDEgPSBhcnIxLmxlbmd0aCAtIDE7XG4gICAgd2hpbGUgKCRpIDwgbDEpIHtcbiAgICAgICRzY2ggPSBhcnIxWyRpICs9IDFdO1xuICAgICAgaWYgKChpdC5vcHRzLnN0cmljdEtleXdvcmRzID8gKHR5cGVvZiAkc2NoID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRzY2gpLmxlbmd0aCA+IDApIHx8ICRzY2ggPT09IGZhbHNlIDogaXQudXRpbC5zY2hlbWFIYXNSdWxlcygkc2NoLCBpdC5SVUxFUy5hbGwpKSkge1xuICAgICAgICAkaXQuc2NoZW1hID0gJHNjaDtcbiAgICAgICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aCArICdbJyArICRpICsgJ10nO1xuICAgICAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoICsgJy8nICsgJGk7XG4gICAgICAgIG91dCArPSAnICAnICsgKGl0LnZhbGlkYXRlKCRpdCkpICsgJyAnO1xuICAgICAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkbmV4dFZhbGlkKSArICcgPSB0cnVlOyAnO1xuICAgICAgfVxuICAgICAgaWYgKCRpKSB7XG4gICAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJyAmJiAnICsgKCRwcmV2VmFsaWQpICsgJykgeyAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7ICcgKyAoJHBhc3NpbmdTY2hlbWFzKSArICcgPSBbJyArICgkcGFzc2luZ1NjaGVtYXMpICsgJywgJyArICgkaSkgKyAnXTsgfSBlbHNlIHsgJztcbiAgICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICcgKyAoJHZhbGlkKSArICcgPSAnICsgKCRwcmV2VmFsaWQpICsgJyA9IHRydWU7ICcgKyAoJHBhc3NpbmdTY2hlbWFzKSArICcgPSAnICsgKCRpKSArICc7IH0nO1xuICAgIH1cbiAgfVxuICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSAkd2FzQ29tcG9zaXRlO1xuICBvdXQgKz0gJycgKyAoJGNsb3NpbmdCcmFjZXMpICsgJ2lmICghJyArICgkdmFsaWQpICsgJykgeyAgIHZhciBlcnIgPSAgICc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdvbmVPZicpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgcGFzc2luZ1NjaGVtYXM6ICcgKyAoJHBhc3NpbmdTY2hlbWFzKSArICcgfSAnO1xuICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgbWF0Y2ggZXhhY3RseSBvbmUgc2NoZW1hIGluIG9uZU9mXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB7fSAnO1xuICB9XG4gIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKHZFcnJvcnMpOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSB2RXJyb3JzOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgfVxuICB9XG4gIG91dCArPSAnfSBlbHNlIHsgIGVycm9ycyA9ICcgKyAoJGVycnMpICsgJzsgaWYgKHZFcnJvcnMgIT09IG51bGwpIHsgaWYgKCcgKyAoJGVycnMpICsgJykgdkVycm9ycy5sZW5ndGggPSAnICsgKCRlcnJzKSArICc7IGVsc2UgdkVycm9ycyA9IG51bGw7IH0nO1xuICBpZiAoaXQub3B0cy5hbGxFcnJvcnMpIHtcbiAgICBvdXQgKz0gJyB9ICc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9vbmVPZi5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9wYXR0ZXJuKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkaXNEYXRhID0gaXQub3B0cy4kZGF0YSAmJiAkc2NoZW1hICYmICRzY2hlbWEuJGRhdGEsXG4gICAgJHNjaGVtYVZhbHVlO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciBzY2hlbWEnICsgKCRsdmwpICsgJyA9ICcgKyAoaXQudXRpbC5nZXREYXRhKCRzY2hlbWEuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFycikpICsgJzsgJztcbiAgICAkc2NoZW1hVmFsdWUgPSAnc2NoZW1hJyArICRsdmw7XG4gIH0gZWxzZSB7XG4gICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYTtcbiAgfVxuICB2YXIgJHJlZ2V4cCA9ICRpc0RhdGEgPyAnKG5ldyBSZWdFeHAoJyArICRzY2hlbWFWYWx1ZSArICcpKScgOiBpdC51c2VQYXR0ZXJuKCRzY2hlbWEpO1xuICBvdXQgKz0gJ2lmICggJztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ3N0cmluZ1xcJykgfHwgJztcbiAgfVxuICBvdXQgKz0gJyAhJyArICgkcmVnZXhwKSArICcudGVzdCgnICsgKCRkYXRhKSArICcpICkgeyAgICc7XG4gIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgncGF0dGVybicpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgcGF0dGVybjogICc7XG4gICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgIG91dCArPSAnJyArICgkc2NoZW1hVmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJycgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkc2NoZW1hKSk7XG4gICAgfVxuICAgIG91dCArPSAnICB9ICc7XG4gICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBtYXRjaCBwYXR0ZXJuIFwiJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAnXFwnICsgJyArICgkc2NoZW1hVmFsdWUpICsgJyArIFxcJyc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHNjaGVtYSkpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICdcIlxcJyAnO1xuICAgIH1cbiAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICBvdXQgKz0gJyAsIHNjaGVtYTogICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ3ZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJHNjaGVtYSkpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgICAgICAgICAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHt9ICc7XG4gIH1cbiAgdmFyIF9fZXJyID0gb3V0O1xuICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgIGlmIChpdC5hc3luYykge1xuICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgfVxuICBvdXQgKz0gJ30gJztcbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL3BhdHRlcm4uanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfcHJvcGVydGllcyhpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICB2YXIgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgdmFyICRrZXkgPSAna2V5JyArICRsdmwsXG4gICAgJGlkeCA9ICdpZHgnICsgJGx2bCxcbiAgICAkZGF0YU54dCA9ICRpdC5kYXRhTGV2ZWwgPSBpdC5kYXRhTGV2ZWwgKyAxLFxuICAgICRuZXh0RGF0YSA9ICdkYXRhJyArICRkYXRhTnh0LFxuICAgICRkYXRhUHJvcGVydGllcyA9ICdkYXRhUHJvcGVydGllcycgKyAkbHZsO1xuICB2YXIgJHNjaGVtYUtleXMgPSBPYmplY3Qua2V5cygkc2NoZW1hIHx8IHt9KS5maWx0ZXIobm90UHJvdG8pLFxuICAgICRwUHJvcGVydGllcyA9IGl0LnNjaGVtYS5wYXR0ZXJuUHJvcGVydGllcyB8fCB7fSxcbiAgICAkcFByb3BlcnR5S2V5cyA9IE9iamVjdC5rZXlzKCRwUHJvcGVydGllcykuZmlsdGVyKG5vdFByb3RvKSxcbiAgICAkYVByb3BlcnRpZXMgPSBpdC5zY2hlbWEuYWRkaXRpb25hbFByb3BlcnRpZXMsXG4gICAgJHNvbWVQcm9wZXJ0aWVzID0gJHNjaGVtYUtleXMubGVuZ3RoIHx8ICRwUHJvcGVydHlLZXlzLmxlbmd0aCxcbiAgICAkbm9BZGRpdGlvbmFsID0gJGFQcm9wZXJ0aWVzID09PSBmYWxzZSxcbiAgICAkYWRkaXRpb25hbElzU2NoZW1hID0gdHlwZW9mICRhUHJvcGVydGllcyA9PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cygkYVByb3BlcnRpZXMpLmxlbmd0aCxcbiAgICAkcmVtb3ZlQWRkaXRpb25hbCA9IGl0Lm9wdHMucmVtb3ZlQWRkaXRpb25hbCxcbiAgICAkY2hlY2tBZGRpdGlvbmFsID0gJG5vQWRkaXRpb25hbCB8fCAkYWRkaXRpb25hbElzU2NoZW1hIHx8ICRyZW1vdmVBZGRpdGlvbmFsLFxuICAgICRvd25Qcm9wZXJ0aWVzID0gaXQub3B0cy5vd25Qcm9wZXJ0aWVzLFxuICAgICRjdXJyZW50QmFzZUlkID0gaXQuYmFzZUlkO1xuICB2YXIgJHJlcXVpcmVkID0gaXQuc2NoZW1hLnJlcXVpcmVkO1xuICBpZiAoJHJlcXVpcmVkICYmICEoaXQub3B0cy4kZGF0YSAmJiAkcmVxdWlyZWQuJGRhdGEpICYmICRyZXF1aXJlZC5sZW5ndGggPCBpdC5vcHRzLmxvb3BSZXF1aXJlZCkge1xuICAgIHZhciAkcmVxdWlyZWRIYXNoID0gaXQudXRpbC50b0hhc2goJHJlcXVpcmVkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vdFByb3RvKHApIHtcbiAgICByZXR1cm4gcCAhPT0gJ19fcHJvdG9fXyc7XG4gIH1cbiAgb3V0ICs9ICd2YXIgJyArICgkZXJycykgKyAnID0gZXJyb3JzO3ZhciAnICsgKCRuZXh0VmFsaWQpICsgJyA9IHRydWU7JztcbiAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgb3V0ICs9ICcgdmFyICcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICcgPSB1bmRlZmluZWQ7JztcbiAgfVxuICBpZiAoJGNoZWNrQWRkaXRpb25hbCkge1xuICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgb3V0ICs9ICcgJyArICgkZGF0YVByb3BlcnRpZXMpICsgJyA9ICcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICcgfHwgT2JqZWN0LmtleXMoJyArICgkZGF0YSkgKyAnKTsgZm9yICh2YXIgJyArICgkaWR4KSArICc9MDsgJyArICgkaWR4KSArICc8JyArICgkZGF0YVByb3BlcnRpZXMpICsgJy5sZW5ndGg7ICcgKyAoJGlkeCkgKyAnKyspIHsgdmFyICcgKyAoJGtleSkgKyAnID0gJyArICgkZGF0YVByb3BlcnRpZXMpICsgJ1snICsgKCRpZHgpICsgJ107ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIGZvciAodmFyICcgKyAoJGtleSkgKyAnIGluICcgKyAoJGRhdGEpICsgJykgeyAnO1xuICAgIH1cbiAgICBpZiAoJHNvbWVQcm9wZXJ0aWVzKSB7XG4gICAgICBvdXQgKz0gJyB2YXIgaXNBZGRpdGlvbmFsJyArICgkbHZsKSArICcgPSAhKGZhbHNlICc7XG4gICAgICBpZiAoJHNjaGVtYUtleXMubGVuZ3RoKSB7XG4gICAgICAgIGlmICgkc2NoZW1hS2V5cy5sZW5ndGggPiA4KSB7XG4gICAgICAgICAgb3V0ICs9ICcgfHwgdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnLmhhc093blByb3BlcnR5KCcgKyAoJGtleSkgKyAnKSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBhcnIxID0gJHNjaGVtYUtleXM7XG4gICAgICAgICAgaWYgKGFycjEpIHtcbiAgICAgICAgICAgIHZhciAkcHJvcGVydHlLZXksIGkxID0gLTEsXG4gICAgICAgICAgICAgIGwxID0gYXJyMS5sZW5ndGggLSAxO1xuICAgICAgICAgICAgd2hpbGUgKGkxIDwgbDEpIHtcbiAgICAgICAgICAgICAgJHByb3BlcnR5S2V5ID0gYXJyMVtpMSArPSAxXTtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgJyArICgka2V5KSArICcgPT0gJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRwcm9wZXJ0eUtleSkpICsgJyAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCRwUHJvcGVydHlLZXlzLmxlbmd0aCkge1xuICAgICAgICB2YXIgYXJyMiA9ICRwUHJvcGVydHlLZXlzO1xuICAgICAgICBpZiAoYXJyMikge1xuICAgICAgICAgIHZhciAkcFByb3BlcnR5LCAkaSA9IC0xLFxuICAgICAgICAgICAgbDIgPSBhcnIyLmxlbmd0aCAtIDE7XG4gICAgICAgICAgd2hpbGUgKCRpIDwgbDIpIHtcbiAgICAgICAgICAgICRwUHJvcGVydHkgPSBhcnIyWyRpICs9IDFdO1xuICAgICAgICAgICAgb3V0ICs9ICcgfHwgJyArIChpdC51c2VQYXR0ZXJuKCRwUHJvcGVydHkpKSArICcudGVzdCgnICsgKCRrZXkpICsgJykgJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG91dCArPSAnICk7IGlmIChpc0FkZGl0aW9uYWwnICsgKCRsdmwpICsgJykgeyAnO1xuICAgIH1cbiAgICBpZiAoJHJlbW92ZUFkZGl0aW9uYWwgPT0gJ2FsbCcpIHtcbiAgICAgIG91dCArPSAnIGRlbGV0ZSAnICsgKCRkYXRhKSArICdbJyArICgka2V5KSArICddOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgJGN1cnJlbnRFcnJvclBhdGggPSBpdC5lcnJvclBhdGg7XG4gICAgICB2YXIgJGFkZGl0aW9uYWxQcm9wZXJ0eSA9ICdcXCcgKyAnICsgJGtleSArICcgKyBcXCcnO1xuICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICBpdC5lcnJvclBhdGggPSBpdC51dGlsLmdldFBhdGhFeHByKGl0LmVycm9yUGF0aCwgJGtleSwgaXQub3B0cy5qc29uUG9pbnRlcnMpO1xuICAgICAgfVxuICAgICAgaWYgKCRub0FkZGl0aW9uYWwpIHtcbiAgICAgICAgaWYgKCRyZW1vdmVBZGRpdGlvbmFsKSB7XG4gICAgICAgICAgb3V0ICs9ICcgZGVsZXRlICcgKyAoJGRhdGEpICsgJ1snICsgKCRrZXkpICsgJ107ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgJyArICgkbmV4dFZhbGlkKSArICcgPSBmYWxzZTsgJztcbiAgICAgICAgICB2YXIgJGN1cnJFcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGg7XG4gICAgICAgICAgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy9hZGRpdGlvbmFsUHJvcGVydGllcyc7XG4gICAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgICAgICAgIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ2FkZGl0aW9uYWxQcm9wZXJ0aWVzJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBhZGRpdGlvbmFsUHJvcGVydHk6IFxcJycgKyAoJGFkZGl0aW9uYWxQcm9wZXJ0eSkgKyAnXFwnIH0gJztcbiAgICAgICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJyc7XG4gICAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJ2lzIGFuIGludmFsaWQgYWRkaXRpb25hbCBwcm9wZXJ0eSc7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICdzaG91bGQgTk9UIGhhdmUgYWRkaXRpb25hbCBwcm9wZXJ0aWVzJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBvdXQgKz0gJ1xcJyAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogZmFsc2UgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBfX2VyciA9IG91dDtcbiAgICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgJGVyclNjaGVtYVBhdGggPSAkY3VyckVyclNjaGVtYVBhdGg7XG4gICAgICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgICAgIG91dCArPSAnIGJyZWFrOyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICgkYWRkaXRpb25hbElzU2NoZW1hKSB7XG4gICAgICAgIGlmICgkcmVtb3ZlQWRkaXRpb25hbCA9PSAnZmFpbGluZycpIHtcbiAgICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkZXJycykgKyAnID0gZXJyb3JzOyAgJztcbiAgICAgICAgICB2YXIgJHdhc0NvbXBvc2l0ZSA9IGl0LmNvbXBvc2l0ZVJ1bGU7XG4gICAgICAgICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gdHJ1ZTtcbiAgICAgICAgICAkaXQuc2NoZW1hID0gJGFQcm9wZXJ0aWVzO1xuICAgICAgICAgICRpdC5zY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArICcuYWRkaXRpb25hbFByb3BlcnRpZXMnO1xuICAgICAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvYWRkaXRpb25hbFByb3BlcnRpZXMnO1xuICAgICAgICAgICRpdC5lcnJvclBhdGggPSBpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkgPyBpdC5lcnJvclBhdGggOiBpdC51dGlsLmdldFBhdGhFeHByKGl0LmVycm9yUGF0aCwgJGtleSwgaXQub3B0cy5qc29uUG9pbnRlcnMpO1xuICAgICAgICAgIHZhciAkcGFzc0RhdGEgPSAkZGF0YSArICdbJyArICRrZXkgKyAnXSc7XG4gICAgICAgICAgJGl0LmRhdGFQYXRoQXJyWyRkYXRhTnh0XSA9ICRrZXk7XG4gICAgICAgICAgdmFyICRjb2RlID0gaXQudmFsaWRhdGUoJGl0KTtcbiAgICAgICAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgICAgICAgaWYgKGl0LnV0aWwudmFyT2NjdXJlbmNlcygkY29kZSwgJG5leHREYXRhKSA8IDIpIHtcbiAgICAgICAgICAgIG91dCArPSAnICcgKyAoaXQudXRpbC52YXJSZXBsYWNlKCRjb2RlLCAkbmV4dERhdGEsICRwYXNzRGF0YSkpICsgJyAnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkbmV4dERhdGEpICsgJyA9ICcgKyAoJHBhc3NEYXRhKSArICc7ICcgKyAoJGNvZGUpICsgJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSB7IGVycm9ycyA9ICcgKyAoJGVycnMpICsgJzsgaWYgKHZhbGlkYXRlLmVycm9ycyAhPT0gbnVsbCkgeyBpZiAoZXJyb3JzKSB2YWxpZGF0ZS5lcnJvcnMubGVuZ3RoID0gZXJyb3JzOyBlbHNlIHZhbGlkYXRlLmVycm9ycyA9IG51bGw7IH0gZGVsZXRlICcgKyAoJGRhdGEpICsgJ1snICsgKCRrZXkpICsgJ107IH0gICc7XG4gICAgICAgICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gJHdhc0NvbXBvc2l0ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkaXQuc2NoZW1hID0gJGFQcm9wZXJ0aWVzO1xuICAgICAgICAgICRpdC5zY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArICcuYWRkaXRpb25hbFByb3BlcnRpZXMnO1xuICAgICAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvYWRkaXRpb25hbFByb3BlcnRpZXMnO1xuICAgICAgICAgICRpdC5lcnJvclBhdGggPSBpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkgPyBpdC5lcnJvclBhdGggOiBpdC51dGlsLmdldFBhdGhFeHByKGl0LmVycm9yUGF0aCwgJGtleSwgaXQub3B0cy5qc29uUG9pbnRlcnMpO1xuICAgICAgICAgIHZhciAkcGFzc0RhdGEgPSAkZGF0YSArICdbJyArICRrZXkgKyAnXSc7XG4gICAgICAgICAgJGl0LmRhdGFQYXRoQXJyWyRkYXRhTnh0XSA9ICRrZXk7XG4gICAgICAgICAgdmFyICRjb2RlID0gaXQudmFsaWRhdGUoJGl0KTtcbiAgICAgICAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgICAgICAgaWYgKGl0LnV0aWwudmFyT2NjdXJlbmNlcygkY29kZSwgJG5leHREYXRhKSA8IDIpIHtcbiAgICAgICAgICAgIG91dCArPSAnICcgKyAoaXQudXRpbC52YXJSZXBsYWNlKCRjb2RlLCAkbmV4dERhdGEsICRwYXNzRGF0YSkpICsgJyAnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkbmV4dERhdGEpICsgJyA9ICcgKyAoJHBhc3NEYXRhKSArICc7ICcgKyAoJGNvZGUpICsgJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgb3V0ICs9ICcgaWYgKCEnICsgKCRuZXh0VmFsaWQpICsgJykgYnJlYWs7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpdC5lcnJvclBhdGggPSAkY3VycmVudEVycm9yUGF0aDtcbiAgICB9XG4gICAgaWYgKCRzb21lUHJvcGVydGllcykge1xuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICAnO1xuICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICBvdXQgKz0gJyBpZiAoJyArICgkbmV4dFZhbGlkKSArICcpIHsgJztcbiAgICAgICRjbG9zaW5nQnJhY2VzICs9ICd9JztcbiAgICB9XG4gIH1cbiAgdmFyICR1c2VEZWZhdWx0cyA9IGl0Lm9wdHMudXNlRGVmYXVsdHMgJiYgIWl0LmNvbXBvc2l0ZVJ1bGU7XG4gIGlmICgkc2NoZW1hS2V5cy5sZW5ndGgpIHtcbiAgICB2YXIgYXJyMyA9ICRzY2hlbWFLZXlzO1xuICAgIGlmIChhcnIzKSB7XG4gICAgICB2YXIgJHByb3BlcnR5S2V5LCBpMyA9IC0xLFxuICAgICAgICBsMyA9IGFycjMubGVuZ3RoIC0gMTtcbiAgICAgIHdoaWxlIChpMyA8IGwzKSB7XG4gICAgICAgICRwcm9wZXJ0eUtleSA9IGFycjNbaTMgKz0gMV07XG4gICAgICAgIHZhciAkc2NoID0gJHNjaGVtYVskcHJvcGVydHlLZXldO1xuICAgICAgICBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2ggPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaCkubGVuZ3RoID4gMCkgfHwgJHNjaCA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2gsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgICAgICAgdmFyICRwcm9wID0gaXQudXRpbC5nZXRQcm9wZXJ0eSgkcHJvcGVydHlLZXkpLFxuICAgICAgICAgICAgJHBhc3NEYXRhID0gJGRhdGEgKyAkcHJvcCxcbiAgICAgICAgICAgICRoYXNEZWZhdWx0ID0gJHVzZURlZmF1bHRzICYmICRzY2guZGVmYXVsdCAhPT0gdW5kZWZpbmVkO1xuICAgICAgICAgICRpdC5zY2hlbWEgPSAkc2NoO1xuICAgICAgICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGggKyAkcHJvcDtcbiAgICAgICAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoICsgJy8nICsgaXQudXRpbC5lc2NhcGVGcmFnbWVudCgkcHJvcGVydHlLZXkpO1xuICAgICAgICAgICRpdC5lcnJvclBhdGggPSBpdC51dGlsLmdldFBhdGgoaXQuZXJyb3JQYXRoLCAkcHJvcGVydHlLZXksIGl0Lm9wdHMuanNvblBvaW50ZXJzKTtcbiAgICAgICAgICAkaXQuZGF0YVBhdGhBcnJbJGRhdGFOeHRdID0gaXQudXRpbC50b1F1b3RlZFN0cmluZygkcHJvcGVydHlLZXkpO1xuICAgICAgICAgIHZhciAkY29kZSA9IGl0LnZhbGlkYXRlKCRpdCk7XG4gICAgICAgICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgICAgICAgIGlmIChpdC51dGlsLnZhck9jY3VyZW5jZXMoJGNvZGUsICRuZXh0RGF0YSkgPCAyKSB7XG4gICAgICAgICAgICAkY29kZSA9IGl0LnV0aWwudmFyUmVwbGFjZSgkY29kZSwgJG5leHREYXRhLCAkcGFzc0RhdGEpO1xuICAgICAgICAgICAgdmFyICR1c2VEYXRhID0gJHBhc3NEYXRhO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgJHVzZURhdGEgPSAkbmV4dERhdGE7XG4gICAgICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkbmV4dERhdGEpICsgJyA9ICcgKyAoJHBhc3NEYXRhKSArICc7ICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkaGFzRGVmYXVsdCkge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArICgkY29kZSkgKyAnICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICgkcmVxdWlyZWRIYXNoICYmICRyZXF1aXJlZEhhc2hbJHByb3BlcnR5S2V5XSkge1xuICAgICAgICAgICAgICBvdXQgKz0gJyBpZiAoICcgKyAoJHVzZURhdGEpICsgJyA9PT0gdW5kZWZpbmVkICc7XG4gICAgICAgICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIHx8ICEgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHlLZXkpKSArICdcXCcpICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgb3V0ICs9ICcpIHsgJyArICgkbmV4dFZhbGlkKSArICcgPSBmYWxzZTsgJztcbiAgICAgICAgICAgICAgdmFyICRjdXJyZW50RXJyb3JQYXRoID0gaXQuZXJyb3JQYXRoLFxuICAgICAgICAgICAgICAgICRjdXJyRXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoLFxuICAgICAgICAgICAgICAgICRtaXNzaW5nUHJvcGVydHkgPSBpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHlLZXkpO1xuICAgICAgICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgaXQuZXJyb3JQYXRoID0gaXQudXRpbC5nZXRQYXRoKCRjdXJyZW50RXJyb3JQYXRoLCAkcHJvcGVydHlLZXksIGl0Lm9wdHMuanNvblBvaW50ZXJzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnL3JlcXVpcmVkJztcbiAgICAgICAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAgICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgICAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdyZXF1aXJlZCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJyB9ICc7XG4gICAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJyc7XG4gICAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSAnaXMgYSByZXF1aXJlZCBwcm9wZXJ0eSc7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBoYXZlIHJlcXVpcmVkIHByb3BlcnR5IFxcXFxcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcXFxcXCcnO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAkZXJyU2NoZW1hUGF0aCA9ICRjdXJyRXJyU2NoZW1hUGF0aDtcbiAgICAgICAgICAgICAgaXQuZXJyb3JQYXRoID0gJGN1cnJlbnRFcnJvclBhdGg7XG4gICAgICAgICAgICAgIG91dCArPSAnIH0gZWxzZSB7ICc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIGlmICggJyArICgkdXNlRGF0YSkgKyAnID09PSB1bmRlZmluZWQgJztcbiAgICAgICAgICAgICAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnIHx8ICEgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHlLZXkpKSArICdcXCcpICc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dCArPSAnKSB7ICcgKyAoJG5leHRWYWxpZCkgKyAnID0gdHJ1ZTsgfSBlbHNlIHsgJztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJyBpZiAoJyArICgkdXNlRGF0YSkgKyAnICE9PSB1bmRlZmluZWQgJztcbiAgICAgICAgICAgICAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnICYmICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHlLZXkpKSArICdcXCcpICc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dCArPSAnICkgeyAnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJyAnICsgKCRjb2RlKSArICcgfSAnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJykgeyAnO1xuICAgICAgICAgICRjbG9zaW5nQnJhY2VzICs9ICd9JztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAoJHBQcm9wZXJ0eUtleXMubGVuZ3RoKSB7XG4gICAgdmFyIGFycjQgPSAkcFByb3BlcnR5S2V5cztcbiAgICBpZiAoYXJyNCkge1xuICAgICAgdmFyICRwUHJvcGVydHksIGk0ID0gLTEsXG4gICAgICAgIGw0ID0gYXJyNC5sZW5ndGggLSAxO1xuICAgICAgd2hpbGUgKGk0IDwgbDQpIHtcbiAgICAgICAgJHBQcm9wZXJ0eSA9IGFycjRbaTQgKz0gMV07XG4gICAgICAgIHZhciAkc2NoID0gJHBQcm9wZXJ0aWVzWyRwUHJvcGVydHldO1xuICAgICAgICBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2ggPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaCkubGVuZ3RoID4gMCkgfHwgJHNjaCA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2gsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgICAgICAgJGl0LnNjaGVtYSA9ICRzY2g7XG4gICAgICAgICAgJGl0LnNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgJy5wYXR0ZXJuUHJvcGVydGllcycgKyBpdC51dGlsLmdldFByb3BlcnR5KCRwUHJvcGVydHkpO1xuICAgICAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvcGF0dGVyblByb3BlcnRpZXMvJyArIGl0LnV0aWwuZXNjYXBlRnJhZ21lbnQoJHBQcm9wZXJ0eSk7XG4gICAgICAgICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnID0gJyArICgkZGF0YVByb3BlcnRpZXMpICsgJyB8fCBPYmplY3Qua2V5cygnICsgKCRkYXRhKSArICcpOyBmb3IgKHZhciAnICsgKCRpZHgpICsgJz0wOyAnICsgKCRpZHgpICsgJzwnICsgKCRkYXRhUHJvcGVydGllcykgKyAnLmxlbmd0aDsgJyArICgkaWR4KSArICcrKykgeyB2YXIgJyArICgka2V5KSArICcgPSAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnWycgKyAoJGlkeCkgKyAnXTsgJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcgZm9yICh2YXIgJyArICgka2V5KSArICcgaW4gJyArICgkZGF0YSkgKyAnKSB7ICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKGl0LnVzZVBhdHRlcm4oJHBQcm9wZXJ0eSkpICsgJy50ZXN0KCcgKyAoJGtleSkgKyAnKSkgeyAnO1xuICAgICAgICAgICRpdC5lcnJvclBhdGggPSBpdC51dGlsLmdldFBhdGhFeHByKGl0LmVycm9yUGF0aCwgJGtleSwgaXQub3B0cy5qc29uUG9pbnRlcnMpO1xuICAgICAgICAgIHZhciAkcGFzc0RhdGEgPSAkZGF0YSArICdbJyArICRrZXkgKyAnXSc7XG4gICAgICAgICAgJGl0LmRhdGFQYXRoQXJyWyRkYXRhTnh0XSA9ICRrZXk7XG4gICAgICAgICAgdmFyICRjb2RlID0gaXQudmFsaWRhdGUoJGl0KTtcbiAgICAgICAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgICAgICAgaWYgKGl0LnV0aWwudmFyT2NjdXJlbmNlcygkY29kZSwgJG5leHREYXRhKSA8IDIpIHtcbiAgICAgICAgICAgIG91dCArPSAnICcgKyAoaXQudXRpbC52YXJSZXBsYWNlKCRjb2RlLCAkbmV4dERhdGEsICRwYXNzRGF0YSkpICsgJyAnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkbmV4dERhdGEpICsgJyA9ICcgKyAoJHBhc3NEYXRhKSArICc7ICcgKyAoJGNvZGUpICsgJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgb3V0ICs9ICcgaWYgKCEnICsgKCRuZXh0VmFsaWQpICsgJykgYnJlYWs7ICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgb3V0ICs9ICcgZWxzZSAnICsgKCRuZXh0VmFsaWQpICsgJyA9IHRydWU7ICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnIH0gICc7XG4gICAgICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJykgeyAnO1xuICAgICAgICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnICcgKyAoJGNsb3NpbmdCcmFjZXMpICsgJyBpZiAoJyArICgkZXJycykgKyAnID09IGVycm9ycykgeyc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9wcm9wZXJ0aWVzLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX3Byb3BlcnR5TmFtZXMoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICRlcnJzID0gJ2VycnNfXycgKyAkbHZsO1xuICB2YXIgJGl0ID0gaXQudXRpbC5jb3B5KGl0KTtcbiAgdmFyICRjbG9zaW5nQnJhY2VzID0gJyc7XG4gICRpdC5sZXZlbCsrO1xuICB2YXIgJG5leHRWYWxpZCA9ICd2YWxpZCcgKyAkaXQubGV2ZWw7XG4gIG91dCArPSAndmFyICcgKyAoJGVycnMpICsgJyA9IGVycm9yczsnO1xuICBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2hlbWEgPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaGVtYSkubGVuZ3RoID4gMCkgfHwgJHNjaGVtYSA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2hlbWEsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgJGl0LnNjaGVtYSA9ICRzY2hlbWE7XG4gICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aDtcbiAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoO1xuICAgIHZhciAka2V5ID0gJ2tleScgKyAkbHZsLFxuICAgICAgJGlkeCA9ICdpZHgnICsgJGx2bCxcbiAgICAgICRpID0gJ2knICsgJGx2bCxcbiAgICAgICRpbnZhbGlkTmFtZSA9ICdcXCcgKyAnICsgJGtleSArICcgKyBcXCcnLFxuICAgICAgJGRhdGFOeHQgPSAkaXQuZGF0YUxldmVsID0gaXQuZGF0YUxldmVsICsgMSxcbiAgICAgICRuZXh0RGF0YSA9ICdkYXRhJyArICRkYXRhTnh0LFxuICAgICAgJGRhdGFQcm9wZXJ0aWVzID0gJ2RhdGFQcm9wZXJ0aWVzJyArICRsdmwsXG4gICAgICAkb3duUHJvcGVydGllcyA9IGl0Lm9wdHMub3duUHJvcGVydGllcyxcbiAgICAgICRjdXJyZW50QmFzZUlkID0gaXQuYmFzZUlkO1xuICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICcgPSB1bmRlZmluZWQ7ICc7XG4gICAgfVxuICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgb3V0ICs9ICcgJyArICgkZGF0YVByb3BlcnRpZXMpICsgJyA9ICcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICcgfHwgT2JqZWN0LmtleXMoJyArICgkZGF0YSkgKyAnKTsgZm9yICh2YXIgJyArICgkaWR4KSArICc9MDsgJyArICgkaWR4KSArICc8JyArICgkZGF0YVByb3BlcnRpZXMpICsgJy5sZW5ndGg7ICcgKyAoJGlkeCkgKyAnKyspIHsgdmFyICcgKyAoJGtleSkgKyAnID0gJyArICgkZGF0YVByb3BlcnRpZXMpICsgJ1snICsgKCRpZHgpICsgJ107ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIGZvciAodmFyICcgKyAoJGtleSkgKyAnIGluICcgKyAoJGRhdGEpICsgJykgeyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB2YXIgc3RhcnRFcnJzJyArICgkbHZsKSArICcgPSBlcnJvcnM7ICc7XG4gICAgdmFyICRwYXNzRGF0YSA9ICRrZXk7XG4gICAgdmFyICR3YXNDb21wb3NpdGUgPSBpdC5jb21wb3NpdGVSdWxlO1xuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9IHRydWU7XG4gICAgdmFyICRjb2RlID0gaXQudmFsaWRhdGUoJGl0KTtcbiAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgaWYgKGl0LnV0aWwudmFyT2NjdXJlbmNlcygkY29kZSwgJG5leHREYXRhKSA8IDIpIHtcbiAgICAgIG91dCArPSAnICcgKyAoaXQudXRpbC52YXJSZXBsYWNlKCRjb2RlLCAkbmV4dERhdGEsICRwYXNzRGF0YSkpICsgJyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YXIgJyArICgkbmV4dERhdGEpICsgJyA9ICcgKyAoJHBhc3NEYXRhKSArICc7ICcgKyAoJGNvZGUpICsgJyAnO1xuICAgIH1cbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSAkd2FzQ29tcG9zaXRlO1xuICAgIG91dCArPSAnIGlmICghJyArICgkbmV4dFZhbGlkKSArICcpIHsgZm9yICh2YXIgJyArICgkaSkgKyAnPXN0YXJ0RXJycycgKyAoJGx2bCkgKyAnOyAnICsgKCRpKSArICc8ZXJyb3JzOyAnICsgKCRpKSArICcrKykgeyB2RXJyb3JzWycgKyAoJGkpICsgJ10ucHJvcGVydHlOYW1lID0gJyArICgka2V5KSArICc7IH0gICB2YXIgZXJyID0gICAnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ3Byb3BlcnR5TmFtZXMnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IHByb3BlcnR5TmFtZTogXFwnJyArICgkaW52YWxpZE5hbWUpICsgJ1xcJyB9ICc7XG4gICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdwcm9wZXJ0eSBuYW1lIFxcXFxcXCcnICsgKCRpbnZhbGlkTmFtZSkgKyAnXFxcXFxcJyBpcyBpbnZhbGlkXFwnICc7XG4gICAgICB9XG4gICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgfVxuICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IodkVycm9ycyk7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSB2RXJyb3JzOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICBvdXQgKz0gJyBicmVhazsgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSB9JztcbiAgfVxuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnICcgKyAoJGNsb3NpbmdCcmFjZXMpICsgJyBpZiAoJyArICgkZXJycykgKyAnID09IGVycm9ycykgeyc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9wcm9wZXJ0eU5hbWVzLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX3JlZihpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGFzeW5jLCAkcmVmQ29kZTtcbiAgaWYgKCRzY2hlbWEgPT0gJyMnIHx8ICRzY2hlbWEgPT0gJyMvJykge1xuICAgIGlmIChpdC5pc1Jvb3QpIHtcbiAgICAgICRhc3luYyA9IGl0LmFzeW5jO1xuICAgICAgJHJlZkNvZGUgPSAndmFsaWRhdGUnO1xuICAgIH0gZWxzZSB7XG4gICAgICAkYXN5bmMgPSBpdC5yb290LnNjaGVtYS4kYXN5bmMgPT09IHRydWU7XG4gICAgICAkcmVmQ29kZSA9ICdyb290LnJlZlZhbFswXSc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciAkcmVmVmFsID0gaXQucmVzb2x2ZVJlZihpdC5iYXNlSWQsICRzY2hlbWEsIGl0LmlzUm9vdCk7XG4gICAgaWYgKCRyZWZWYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdmFyICRtZXNzYWdlID0gaXQuTWlzc2luZ1JlZkVycm9yLm1lc3NhZ2UoaXQuYmFzZUlkLCAkc2NoZW1hKTtcbiAgICAgIGlmIChpdC5vcHRzLm1pc3NpbmdSZWZzID09ICdmYWlsJykge1xuICAgICAgICBpdC5sb2dnZXIuZXJyb3IoJG1lc3NhZ2UpO1xuICAgICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgICAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJyRyZWYnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IHJlZjogXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3Rlcygkc2NoZW1hKSkgKyAnXFwnIH0gJztcbiAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnY2FuXFxcXFxcJ3QgcmVzb2x2ZSByZWZlcmVuY2UgJyArIChpdC51dGlsLmVzY2FwZVF1b3Rlcygkc2NoZW1hKSkgKyAnXFwnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJHNjaGVtYSkpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIG91dCArPSAnIGlmIChmYWxzZSkgeyAnO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGl0Lm9wdHMubWlzc2luZ1JlZnMgPT0gJ2lnbm9yZScpIHtcbiAgICAgICAgaXQubG9nZ2VyLndhcm4oJG1lc3NhZ2UpO1xuICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBpdC5NaXNzaW5nUmVmRXJyb3IoaXQuYmFzZUlkLCAkc2NoZW1hLCAkbWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICgkcmVmVmFsLmlubGluZSkge1xuICAgICAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gICAgICAkaXQubGV2ZWwrKztcbiAgICAgIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgICAgICRpdC5zY2hlbWEgPSAkcmVmVmFsLnNjaGVtYTtcbiAgICAgICRpdC5zY2hlbWFQYXRoID0gJyc7XG4gICAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRzY2hlbWE7XG4gICAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpLnJlcGxhY2UoL3ZhbGlkYXRlXFwuc2NoZW1hL2csICRyZWZWYWwuY29kZSk7XG4gICAgICBvdXQgKz0gJyAnICsgKCRjb2RlKSArICcgJztcbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJykgeyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAkYXN5bmMgPSAkcmVmVmFsLiRhc3luYyA9PT0gdHJ1ZSB8fCAoaXQuYXN5bmMgJiYgJHJlZlZhbC4kYXN5bmMgIT09IGZhbHNlKTtcbiAgICAgICRyZWZDb2RlID0gJHJlZlZhbC5jb2RlO1xuICAgIH1cbiAgfVxuICBpZiAoJHJlZkNvZGUpIHtcbiAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgb3V0ID0gJyc7XG4gICAgaWYgKGl0Lm9wdHMucGFzc0NvbnRleHQpIHtcbiAgICAgIG91dCArPSAnICcgKyAoJHJlZkNvZGUpICsgJy5jYWxsKHRoaXMsICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnICcgKyAoJHJlZkNvZGUpICsgJyggJztcbiAgICB9XG4gICAgb3V0ICs9ICcgJyArICgkZGF0YSkgKyAnLCAoZGF0YVBhdGggfHwgXFwnXFwnKSc7XG4gICAgaWYgKGl0LmVycm9yUGF0aCAhPSAnXCJcIicpIHtcbiAgICAgIG91dCArPSAnICsgJyArIChpdC5lcnJvclBhdGgpO1xuICAgIH1cbiAgICB2YXIgJHBhcmVudERhdGEgPSAkZGF0YUx2bCA/ICdkYXRhJyArICgoJGRhdGFMdmwgLSAxKSB8fCAnJykgOiAncGFyZW50RGF0YScsXG4gICAgICAkcGFyZW50RGF0YVByb3BlcnR5ID0gJGRhdGFMdmwgPyBpdC5kYXRhUGF0aEFyclskZGF0YUx2bF0gOiAncGFyZW50RGF0YVByb3BlcnR5JztcbiAgICBvdXQgKz0gJyAsICcgKyAoJHBhcmVudERhdGEpICsgJyAsICcgKyAoJHBhcmVudERhdGFQcm9wZXJ0eSkgKyAnLCByb290RGF0YSkgICc7XG4gICAgdmFyIF9fY2FsbFZhbGlkYXRlID0gb3V0O1xuICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgaWYgKCRhc3luYykge1xuICAgICAgaWYgKCFpdC5hc3luYykgdGhyb3cgbmV3IEVycm9yKCdhc3luYyBzY2hlbWEgcmVmZXJlbmNlZCBieSBzeW5jIHNjaGVtYScpO1xuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJHZhbGlkKSArICc7ICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB0cnkgeyBhd2FpdCAnICsgKF9fY2FsbFZhbGlkYXRlKSArICc7ICc7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZTsgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gY2F0Y2ggKGUpIHsgaWYgKCEoZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHRocm93IGU7IGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gZS5lcnJvcnM7IGVsc2UgdkVycm9ycyA9IHZFcnJvcnMuY29uY2F0KGUuZXJyb3JzKTsgZXJyb3JzID0gdkVycm9ycy5sZW5ndGg7ICc7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7ICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICBvdXQgKz0gJyBpZiAoJyArICgkdmFsaWQpICsgJykgeyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyBpZiAoIScgKyAoX19jYWxsVmFsaWRhdGUpICsgJykgeyBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9ICcgKyAoJHJlZkNvZGUpICsgJy5lcnJvcnM7IGVsc2UgdkVycm9ycyA9IHZFcnJvcnMuY29uY2F0KCcgKyAoJHJlZkNvZGUpICsgJy5lcnJvcnMpOyBlcnJvcnMgPSB2RXJyb3JzLmxlbmd0aDsgfSAnO1xuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvcmVmLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX3JlcXVpcmVkKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkdmFsaWQgPSAndmFsaWQnICsgJGx2bDtcbiAgdmFyICRpc0RhdGEgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWEgJiYgJHNjaGVtYS4kZGF0YSxcbiAgICAkc2NoZW1hVmFsdWU7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLmdldERhdGEoJHNjaGVtYS4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgfSBlbHNlIHtcbiAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hO1xuICB9XG4gIHZhciAkdlNjaGVtYSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgaWYgKCEkaXNEYXRhKSB7XG4gICAgaWYgKCRzY2hlbWEubGVuZ3RoIDwgaXQub3B0cy5sb29wUmVxdWlyZWQgJiYgaXQuc2NoZW1hLnByb3BlcnRpZXMgJiYgT2JqZWN0LmtleXMoaXQuc2NoZW1hLnByb3BlcnRpZXMpLmxlbmd0aCkge1xuICAgICAgdmFyICRyZXF1aXJlZCA9IFtdO1xuICAgICAgdmFyIGFycjEgPSAkc2NoZW1hO1xuICAgICAgaWYgKGFycjEpIHtcbiAgICAgICAgdmFyICRwcm9wZXJ0eSwgaTEgPSAtMSxcbiAgICAgICAgICBsMSA9IGFycjEubGVuZ3RoIC0gMTtcbiAgICAgICAgd2hpbGUgKGkxIDwgbDEpIHtcbiAgICAgICAgICAkcHJvcGVydHkgPSBhcnIxW2kxICs9IDFdO1xuICAgICAgICAgIHZhciAkcHJvcGVydHlTY2ggPSBpdC5zY2hlbWEucHJvcGVydGllc1skcHJvcGVydHldO1xuICAgICAgICAgIGlmICghKCRwcm9wZXJ0eVNjaCAmJiAoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHByb3BlcnR5U2NoID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRwcm9wZXJ0eVNjaCkubGVuZ3RoID4gMCkgfHwgJHByb3BlcnR5U2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHByb3BlcnR5U2NoLCBpdC5SVUxFUy5hbGwpKSkpIHtcbiAgICAgICAgICAgICRyZXF1aXJlZFskcmVxdWlyZWQubGVuZ3RoXSA9ICRwcm9wZXJ0eTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyICRyZXF1aXJlZCA9ICRzY2hlbWE7XG4gICAgfVxuICB9XG4gIGlmICgkaXNEYXRhIHx8ICRyZXF1aXJlZC5sZW5ndGgpIHtcbiAgICB2YXIgJGN1cnJlbnRFcnJvclBhdGggPSBpdC5lcnJvclBhdGgsXG4gICAgICAkbG9vcFJlcXVpcmVkID0gJGlzRGF0YSB8fCAkcmVxdWlyZWQubGVuZ3RoID49IGl0Lm9wdHMubG9vcFJlcXVpcmVkLFxuICAgICAgJG93blByb3BlcnRpZXMgPSBpdC5vcHRzLm93blByb3BlcnRpZXM7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIHZhciBtaXNzaW5nJyArICgkbHZsKSArICc7ICc7XG4gICAgICBpZiAoJGxvb3BSZXF1aXJlZCkge1xuICAgICAgICBpZiAoISRpc0RhdGEpIHtcbiAgICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkdlNjaGVtYSkgKyAnID0gdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnOyAnO1xuICAgICAgICB9XG4gICAgICAgIHZhciAkaSA9ICdpJyArICRsdmwsXG4gICAgICAgICAgJHByb3BlcnR5UGF0aCA9ICdzY2hlbWEnICsgJGx2bCArICdbJyArICRpICsgJ10nLFxuICAgICAgICAgICRtaXNzaW5nUHJvcGVydHkgPSAnXFwnICsgJyArICRwcm9wZXJ0eVBhdGggKyAnICsgXFwnJztcbiAgICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICAgIGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eVBhdGgsIGl0Lm9wdHMuanNvblBvaW50ZXJzKTtcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkdmFsaWQpICsgJyA9IHRydWU7ICc7XG4gICAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKHNjaGVtYScgKyAoJGx2bCkgKyAnID09PSB1bmRlZmluZWQpICcgKyAoJHZhbGlkKSArICcgPSB0cnVlOyBlbHNlIGlmICghQXJyYXkuaXNBcnJheShzY2hlbWEnICsgKCRsdmwpICsgJykpICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgZWxzZSB7JztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyBmb3IgKHZhciAnICsgKCRpKSArICcgPSAwOyAnICsgKCRpKSArICcgPCAnICsgKCR2U2NoZW1hKSArICcubGVuZ3RoOyAnICsgKCRpKSArICcrKykgeyAnICsgKCR2YWxpZCkgKyAnID0gJyArICgkZGF0YSkgKyAnWycgKyAoJHZTY2hlbWEpICsgJ1snICsgKCRpKSArICddXSAhPT0gdW5kZWZpbmVkICc7XG4gICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgIG91dCArPSAnICYmICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgJyArICgkdlNjaGVtYSkgKyAnWycgKyAoJGkpICsgJ10pICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICc7IGlmICghJyArICgkdmFsaWQpICsgJykgYnJlYWs7IH0gJztcbiAgICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgICBvdXQgKz0gJyAgfSAgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyAgaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICAgJztcbiAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdyZXF1aXJlZCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJyB9ICc7XG4gICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJyc7XG4gICAgICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIG91dCArPSAnaXMgYSByZXF1aXJlZCBwcm9wZXJ0eSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBoYXZlIHJlcXVpcmVkIHByb3BlcnR5IFxcXFxcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcXFxcXCcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyB9IGVsc2UgeyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKCAnO1xuICAgICAgICB2YXIgYXJyMiA9ICRyZXF1aXJlZDtcbiAgICAgICAgaWYgKGFycjIpIHtcbiAgICAgICAgICB2YXIgJHByb3BlcnR5S2V5LCAkaSA9IC0xLFxuICAgICAgICAgICAgbDIgPSBhcnIyLmxlbmd0aCAtIDE7XG4gICAgICAgICAgd2hpbGUgKCRpIDwgbDIpIHtcbiAgICAgICAgICAgICRwcm9wZXJ0eUtleSA9IGFycjJbJGkgKz0gMV07XG4gICAgICAgICAgICBpZiAoJGkpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciAkcHJvcCA9IGl0LnV0aWwuZ2V0UHJvcGVydHkoJHByb3BlcnR5S2V5KSxcbiAgICAgICAgICAgICAgJHVzZURhdGEgPSAkZGF0YSArICRwcm9wO1xuICAgICAgICAgICAgb3V0ICs9ICcgKCAoICcgKyAoJHVzZURhdGEpICsgJyA9PT0gdW5kZWZpbmVkICc7XG4gICAgICAgICAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgISBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSkpICsgJ1xcJykgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnKSAmJiAobWlzc2luZycgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKGl0Lm9wdHMuanNvblBvaW50ZXJzID8gJHByb3BlcnR5S2V5IDogJHByb3ApKSArICcpICkgJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcpIHsgICc7XG4gICAgICAgIHZhciAkcHJvcGVydHlQYXRoID0gJ21pc3NpbmcnICsgJGx2bCxcbiAgICAgICAgICAkbWlzc2luZ1Byb3BlcnR5ID0gJ1xcJyArICcgKyAkcHJvcGVydHlQYXRoICsgJyArIFxcJyc7XG4gICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICBpdC5lcnJvclBhdGggPSBpdC5vcHRzLmpzb25Qb2ludGVycyA/IGl0LnV0aWwuZ2V0UGF0aEV4cHIoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eVBhdGgsIHRydWUpIDogJGN1cnJlbnRFcnJvclBhdGggKyAnICsgJyArICRwcm9wZXJ0eVBhdGg7XG4gICAgICAgIH1cbiAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdyZXF1aXJlZCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJyB9ICc7XG4gICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJyc7XG4gICAgICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIG91dCArPSAnaXMgYSByZXF1aXJlZCBwcm9wZXJ0eSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBoYXZlIHJlcXVpcmVkIHByb3BlcnR5IFxcXFxcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcXFxcXCcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyB9IGVsc2UgeyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoJGxvb3BSZXF1aXJlZCkge1xuICAgICAgICBpZiAoISRpc0RhdGEpIHtcbiAgICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkdlNjaGVtYSkgKyAnID0gdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnOyAnO1xuICAgICAgICB9XG4gICAgICAgIHZhciAkaSA9ICdpJyArICRsdmwsXG4gICAgICAgICAgJHByb3BlcnR5UGF0aCA9ICdzY2hlbWEnICsgJGx2bCArICdbJyArICRpICsgJ10nLFxuICAgICAgICAgICRtaXNzaW5nUHJvcGVydHkgPSAnXFwnICsgJyArICRwcm9wZXJ0eVBhdGggKyAnICsgXFwnJztcbiAgICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICAgIGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eVBhdGgsIGl0Lm9wdHMuanNvblBvaW50ZXJzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCR2U2NoZW1hKSArICcgJiYgIUFycmF5LmlzQXJyYXkoJyArICgkdlNjaGVtYSkgKyAnKSkgeyAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdyZXF1aXJlZCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJyB9ICc7XG4gICAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCcnO1xuICAgICAgICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICdpcyBhIHJlcXVpcmVkIHByb3BlcnR5JztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBoYXZlIHJlcXVpcmVkIHByb3BlcnR5IFxcXFxcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcXFxcXCcnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG91dCArPSAnXFwnICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7IH0gZWxzZSBpZiAoJyArICgkdlNjaGVtYSkgKyAnICE9PSB1bmRlZmluZWQpIHsgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyBmb3IgKHZhciAnICsgKCRpKSArICcgPSAwOyAnICsgKCRpKSArICcgPCAnICsgKCR2U2NoZW1hKSArICcubGVuZ3RoOyAnICsgKCRpKSArICcrKykgeyBpZiAoJyArICgkZGF0YSkgKyAnWycgKyAoJHZTY2hlbWEpICsgJ1snICsgKCRpKSArICddXSA9PT0gdW5kZWZpbmVkICc7XG4gICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgIG91dCArPSAnIHx8ICEgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgJyArICgkdlNjaGVtYSkgKyAnWycgKyAoJGkpICsgJ10pICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcpIHsgIHZhciBlcnIgPSAgICc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdyZXF1aXJlZCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJyB9ICc7XG4gICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJyc7XG4gICAgICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIG91dCArPSAnaXMgYSByZXF1aXJlZCBwcm9wZXJ0eSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBoYXZlIHJlcXVpcmVkIHByb3BlcnR5IFxcXFxcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcXFxcXCcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgfSB9ICc7XG4gICAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgICAgb3V0ICs9ICcgIH0gICc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcnIzID0gJHJlcXVpcmVkO1xuICAgICAgICBpZiAoYXJyMykge1xuICAgICAgICAgIHZhciAkcHJvcGVydHlLZXksIGkzID0gLTEsXG4gICAgICAgICAgICBsMyA9IGFycjMubGVuZ3RoIC0gMTtcbiAgICAgICAgICB3aGlsZSAoaTMgPCBsMykge1xuICAgICAgICAgICAgJHByb3BlcnR5S2V5ID0gYXJyM1tpMyArPSAxXTtcbiAgICAgICAgICAgIHZhciAkcHJvcCA9IGl0LnV0aWwuZ2V0UHJvcGVydHkoJHByb3BlcnR5S2V5KSxcbiAgICAgICAgICAgICAgJG1pc3NpbmdQcm9wZXJ0eSA9IGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSksXG4gICAgICAgICAgICAgICR1c2VEYXRhID0gJGRhdGEgKyAkcHJvcDtcbiAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgaXQuZXJyb3JQYXRoID0gaXQudXRpbC5nZXRQYXRoKCRjdXJyZW50RXJyb3JQYXRoLCAkcHJvcGVydHlLZXksIGl0Lm9wdHMuanNvblBvaW50ZXJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnIGlmICggJyArICgkdXNlRGF0YSkgKyAnID09PSB1bmRlZmluZWQgJztcbiAgICAgICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB8fCAhIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCgnICsgKCRkYXRhKSArICcsIFxcJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5S2V5KSkgKyAnXFwnKSAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICcpIHsgIHZhciBlcnIgPSAgICc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ3JlcXVpcmVkJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBtaXNzaW5nUHJvcGVydHk6IFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFwnIH0gJztcbiAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCcnO1xuICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnaXMgYSByZXF1aXJlZCBwcm9wZXJ0eSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnc2hvdWxkIGhhdmUgcmVxdWlyZWQgcHJvcGVydHkgXFxcXFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFxcXFxcJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dCArPSAnXFwnICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7IH0gJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaXQuZXJyb3JQYXRoID0gJGN1cnJlbnRFcnJvclBhdGg7XG4gIH0gZWxzZSBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGlmICh0cnVlKSB7JztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL3JlcXVpcmVkLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX3VuaXF1ZUl0ZW1zKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkdmFsaWQgPSAndmFsaWQnICsgJGx2bDtcbiAgdmFyICRpc0RhdGEgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWEgJiYgJHNjaGVtYS4kZGF0YSxcbiAgICAkc2NoZW1hVmFsdWU7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLmdldERhdGEoJHNjaGVtYS4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgfSBlbHNlIHtcbiAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hO1xuICB9XG4gIGlmICgoJHNjaGVtYSB8fCAkaXNEYXRhKSAmJiBpdC5vcHRzLnVuaXF1ZUl0ZW1zICE9PSBmYWxzZSkge1xuICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICBvdXQgKz0gJyB2YXIgJyArICgkdmFsaWQpICsgJzsgaWYgKCcgKyAoJHNjaGVtYVZhbHVlKSArICcgPT09IGZhbHNlIHx8ICcgKyAoJHNjaGVtYVZhbHVlKSArICcgPT09IHVuZGVmaW5lZCkgJyArICgkdmFsaWQpICsgJyA9IHRydWU7IGVsc2UgaWYgKHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ2Jvb2xlYW5cXCcpICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgZWxzZSB7ICc7XG4gICAgfVxuICAgIG91dCArPSAnIHZhciBpID0gJyArICgkZGF0YSkgKyAnLmxlbmd0aCAsICcgKyAoJHZhbGlkKSArICcgPSB0cnVlICwgajsgaWYgKGkgPiAxKSB7ICc7XG4gICAgdmFyICRpdGVtVHlwZSA9IGl0LnNjaGVtYS5pdGVtcyAmJiBpdC5zY2hlbWEuaXRlbXMudHlwZSxcbiAgICAgICR0eXBlSXNBcnJheSA9IEFycmF5LmlzQXJyYXkoJGl0ZW1UeXBlKTtcbiAgICBpZiAoISRpdGVtVHlwZSB8fCAkaXRlbVR5cGUgPT0gJ29iamVjdCcgfHwgJGl0ZW1UeXBlID09ICdhcnJheScgfHwgKCR0eXBlSXNBcnJheSAmJiAoJGl0ZW1UeXBlLmluZGV4T2YoJ29iamVjdCcpID49IDAgfHwgJGl0ZW1UeXBlLmluZGV4T2YoJ2FycmF5JykgPj0gMCkpKSB7XG4gICAgICBvdXQgKz0gJyBvdXRlcjogZm9yICg7aS0tOykgeyBmb3IgKGogPSBpOyBqLS07KSB7IGlmIChlcXVhbCgnICsgKCRkYXRhKSArICdbaV0sICcgKyAoJGRhdGEpICsgJ1tqXSkpIHsgJyArICgkdmFsaWQpICsgJyA9IGZhbHNlOyBicmVhayBvdXRlcjsgfSB9IH0gJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFyIGl0ZW1JbmRpY2VzID0ge30sIGl0ZW07IGZvciAoO2ktLTspIHsgdmFyIGl0ZW0gPSAnICsgKCRkYXRhKSArICdbaV07ICc7XG4gICAgICB2YXIgJG1ldGhvZCA9ICdjaGVja0RhdGFUeXBlJyArICgkdHlwZUlzQXJyYXkgPyAncycgOiAnJyk7XG4gICAgICBvdXQgKz0gJyBpZiAoJyArIChpdC51dGlsWyRtZXRob2RdKCRpdGVtVHlwZSwgJ2l0ZW0nLCBpdC5vcHRzLnN0cmljdE51bWJlcnMsIHRydWUpKSArICcpIGNvbnRpbnVlOyAnO1xuICAgICAgaWYgKCR0eXBlSXNBcnJheSkge1xuICAgICAgICBvdXQgKz0gJyBpZiAodHlwZW9mIGl0ZW0gPT0gXFwnc3RyaW5nXFwnKSBpdGVtID0gXFwnXCJcXCcgKyBpdGVtOyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgaWYgKHR5cGVvZiBpdGVtSW5kaWNlc1tpdGVtXSA9PSBcXCdudW1iZXJcXCcpIHsgJyArICgkdmFsaWQpICsgJyA9IGZhbHNlOyBqID0gaXRlbUluZGljZXNbaXRlbV07IGJyZWFrOyB9IGl0ZW1JbmRpY2VzW2l0ZW1dID0gaTsgfSAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgIG91dCArPSAnICB9ICAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyBpZiAoIScgKyAoJHZhbGlkKSArICcpIHsgICAnO1xuICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCd1bmlxdWVJdGVtcycpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgaTogaSwgajogaiB9ICc7XG4gICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgTk9UIGhhdmUgZHVwbGljYXRlIGl0ZW1zIChpdGVtcyAjIyBcXCcgKyBqICsgXFwnIGFuZCBcXCcgKyBpICsgXFwnIGFyZSBpZGVudGljYWwpXFwnICc7XG4gICAgICB9XG4gICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgICBvdXQgKz0gJ3ZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnJyArICgkc2NoZW1hKTtcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB7fSAnO1xuICAgIH1cbiAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICBvdXQgKz0gJyBpZiAodHJ1ZSkgeyAnO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL3VuaXF1ZUl0ZW1zLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX3ZhbGlkYXRlKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnJztcbiAgdmFyICRhc3luYyA9IGl0LnNjaGVtYS4kYXN5bmMgPT09IHRydWUsXG4gICAgJHJlZktleXdvcmRzID0gaXQudXRpbC5zY2hlbWFIYXNSdWxlc0V4Y2VwdChpdC5zY2hlbWEsIGl0LlJVTEVTLmFsbCwgJyRyZWYnKSxcbiAgICAkaWQgPSBpdC5zZWxmLl9nZXRJZChpdC5zY2hlbWEpO1xuICBpZiAoaXQub3B0cy5zdHJpY3RLZXl3b3Jkcykge1xuICAgIHZhciAkdW5rbm93bkt3ZCA9IGl0LnV0aWwuc2NoZW1hVW5rbm93blJ1bGVzKGl0LnNjaGVtYSwgaXQuUlVMRVMua2V5d29yZHMpO1xuICAgIGlmICgkdW5rbm93bkt3ZCkge1xuICAgICAgdmFyICRrZXl3b3Jkc01zZyA9ICd1bmtub3duIGtleXdvcmQ6ICcgKyAkdW5rbm93bkt3ZDtcbiAgICAgIGlmIChpdC5vcHRzLnN0cmljdEtleXdvcmRzID09PSAnbG9nJykgaXQubG9nZ2VyLndhcm4oJGtleXdvcmRzTXNnKTtcbiAgICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKCRrZXl3b3Jkc01zZyk7XG4gICAgfVxuICB9XG4gIGlmIChpdC5pc1RvcCkge1xuICAgIG91dCArPSAnIHZhciB2YWxpZGF0ZSA9ICc7XG4gICAgaWYgKCRhc3luYykge1xuICAgICAgaXQuYXN5bmMgPSB0cnVlO1xuICAgICAgb3V0ICs9ICdhc3luYyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJ2Z1bmN0aW9uKGRhdGEsIGRhdGFQYXRoLCBwYXJlbnREYXRhLCBwYXJlbnREYXRhUHJvcGVydHksIHJvb3REYXRhKSB7IFxcJ3VzZSBzdHJpY3RcXCc7ICc7XG4gICAgaWYgKCRpZCAmJiAoaXQub3B0cy5zb3VyY2VDb2RlIHx8IGl0Lm9wdHMucHJvY2Vzc0NvZGUpKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCcvXFwqIyBzb3VyY2VVUkw9JyArICRpZCArICcgKi8nKSArICcgJztcbiAgICB9XG4gIH1cbiAgaWYgKHR5cGVvZiBpdC5zY2hlbWEgPT0gJ2Jvb2xlYW4nIHx8ICEoJHJlZktleXdvcmRzIHx8IGl0LnNjaGVtYS4kcmVmKSkge1xuICAgIHZhciAka2V5d29yZCA9ICdmYWxzZSBzY2hlbWEnO1xuICAgIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gICAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICAgIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gICAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICAgIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICAgIHZhciAkZXJyb3JLZXl3b3JkO1xuICAgIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gICAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICAgIGlmIChpdC5zY2hlbWEgPT09IGZhbHNlKSB7XG4gICAgICBpZiAoaXQuaXNUb3ApIHtcbiAgICAgICAgJGJyZWFrT25FcnJvciA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkdmFsaWQpICsgJyA9IGZhbHNlOyAnO1xuICAgICAgfVxuICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgkZXJyb3JLZXl3b3JkIHx8ICdmYWxzZSBzY2hlbWEnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7fSAnO1xuICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ2Jvb2xlYW4gc2NoZW1hIGlzIGZhbHNlXFwnICc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiBmYWxzZSAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB7fSAnO1xuICAgICAgfVxuICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpdC5pc1RvcCkge1xuICAgICAgICBpZiAoJGFzeW5jKSB7XG4gICAgICAgICAgb3V0ICs9ICcgcmV0dXJuIGRhdGE7ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gbnVsbDsgcmV0dXJuIHRydWU7ICc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhciAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZTsgJztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGl0LmlzVG9wKSB7XG4gICAgICBvdXQgKz0gJyB9OyByZXR1cm4gdmFsaWRhdGU7ICc7XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG4gIH1cbiAgaWYgKGl0LmlzVG9wKSB7XG4gICAgdmFyICR0b3AgPSBpdC5pc1RvcCxcbiAgICAgICRsdmwgPSBpdC5sZXZlbCA9IDAsXG4gICAgICAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbCA9IDAsXG4gICAgICAkZGF0YSA9ICdkYXRhJztcbiAgICBpdC5yb290SWQgPSBpdC5yZXNvbHZlLmZ1bGxQYXRoKGl0LnNlbGYuX2dldElkKGl0LnJvb3Quc2NoZW1hKSk7XG4gICAgaXQuYmFzZUlkID0gaXQuYmFzZUlkIHx8IGl0LnJvb3RJZDtcbiAgICBkZWxldGUgaXQuaXNUb3A7XG4gICAgaXQuZGF0YVBhdGhBcnIgPSBbXCJcIl07XG4gICAgaWYgKGl0LnNjaGVtYS5kZWZhdWx0ICE9PSB1bmRlZmluZWQgJiYgaXQub3B0cy51c2VEZWZhdWx0cyAmJiBpdC5vcHRzLnN0cmljdERlZmF1bHRzKSB7XG4gICAgICB2YXIgJGRlZmF1bHRNc2cgPSAnZGVmYXVsdCBpcyBpZ25vcmVkIGluIHRoZSBzY2hlbWEgcm9vdCc7XG4gICAgICBpZiAoaXQub3B0cy5zdHJpY3REZWZhdWx0cyA9PT0gJ2xvZycpIGl0LmxvZ2dlci53YXJuKCRkZWZhdWx0TXNnKTtcbiAgICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKCRkZWZhdWx0TXNnKTtcbiAgICB9XG4gICAgb3V0ICs9ICcgdmFyIHZFcnJvcnMgPSBudWxsOyAnO1xuICAgIG91dCArPSAnIHZhciBlcnJvcnMgPSAwOyAgICAgJztcbiAgICBvdXQgKz0gJyBpZiAocm9vdERhdGEgPT09IHVuZGVmaW5lZCkgcm9vdERhdGEgPSBkYXRhOyAnO1xuICB9IGVsc2Uge1xuICAgIHZhciAkbHZsID0gaXQubGV2ZWwsXG4gICAgICAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbCxcbiAgICAgICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgICBpZiAoJGlkKSBpdC5iYXNlSWQgPSBpdC5yZXNvbHZlLnVybChpdC5iYXNlSWQsICRpZCk7XG4gICAgaWYgKCRhc3luYyAmJiAhaXQuYXN5bmMpIHRocm93IG5ldyBFcnJvcignYXN5bmMgc2NoZW1hIGluIHN5bmMgc2NoZW1hJyk7XG4gICAgb3V0ICs9ICcgdmFyIGVycnNfJyArICgkbHZsKSArICcgPSBlcnJvcnM7JztcbiAgfVxuICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmwsXG4gICAgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycyxcbiAgICAkY2xvc2luZ0JyYWNlczEgPSAnJyxcbiAgICAkY2xvc2luZ0JyYWNlczIgPSAnJztcbiAgdmFyICRlcnJvcktleXdvcmQ7XG4gIHZhciAkdHlwZVNjaGVtYSA9IGl0LnNjaGVtYS50eXBlLFxuICAgICR0eXBlSXNBcnJheSA9IEFycmF5LmlzQXJyYXkoJHR5cGVTY2hlbWEpO1xuICBpZiAoJHR5cGVTY2hlbWEgJiYgaXQub3B0cy5udWxsYWJsZSAmJiBpdC5zY2hlbWEubnVsbGFibGUgPT09IHRydWUpIHtcbiAgICBpZiAoJHR5cGVJc0FycmF5KSB7XG4gICAgICBpZiAoJHR5cGVTY2hlbWEuaW5kZXhPZignbnVsbCcpID09IC0xKSAkdHlwZVNjaGVtYSA9ICR0eXBlU2NoZW1hLmNvbmNhdCgnbnVsbCcpO1xuICAgIH0gZWxzZSBpZiAoJHR5cGVTY2hlbWEgIT0gJ251bGwnKSB7XG4gICAgICAkdHlwZVNjaGVtYSA9IFskdHlwZVNjaGVtYSwgJ251bGwnXTtcbiAgICAgICR0eXBlSXNBcnJheSA9IHRydWU7XG4gICAgfVxuICB9XG4gIGlmICgkdHlwZUlzQXJyYXkgJiYgJHR5cGVTY2hlbWEubGVuZ3RoID09IDEpIHtcbiAgICAkdHlwZVNjaGVtYSA9ICR0eXBlU2NoZW1hWzBdO1xuICAgICR0eXBlSXNBcnJheSA9IGZhbHNlO1xuICB9XG4gIGlmIChpdC5zY2hlbWEuJHJlZiAmJiAkcmVmS2V5d29yZHMpIHtcbiAgICBpZiAoaXQub3B0cy5leHRlbmRSZWZzID09ICdmYWlsJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCckcmVmOiB2YWxpZGF0aW9uIGtleXdvcmRzIHVzZWQgaW4gc2NoZW1hIGF0IHBhdGggXCInICsgaXQuZXJyU2NoZW1hUGF0aCArICdcIiAoc2VlIG9wdGlvbiBleHRlbmRSZWZzKScpO1xuICAgIH0gZWxzZSBpZiAoaXQub3B0cy5leHRlbmRSZWZzICE9PSB0cnVlKSB7XG4gICAgICAkcmVmS2V5d29yZHMgPSBmYWxzZTtcbiAgICAgIGl0LmxvZ2dlci53YXJuKCckcmVmOiBrZXl3b3JkcyBpZ25vcmVkIGluIHNjaGVtYSBhdCBwYXRoIFwiJyArIGl0LmVyclNjaGVtYVBhdGggKyAnXCInKTtcbiAgICB9XG4gIH1cbiAgaWYgKGl0LnNjaGVtYS4kY29tbWVudCAmJiBpdC5vcHRzLiRjb21tZW50KSB7XG4gICAgb3V0ICs9ICcgJyArIChpdC5SVUxFUy5hbGwuJGNvbW1lbnQuY29kZShpdCwgJyRjb21tZW50JykpO1xuICB9XG4gIGlmICgkdHlwZVNjaGVtYSkge1xuICAgIGlmIChpdC5vcHRzLmNvZXJjZVR5cGVzKSB7XG4gICAgICB2YXIgJGNvZXJjZVRvVHlwZXMgPSBpdC51dGlsLmNvZXJjZVRvVHlwZXMoaXQub3B0cy5jb2VyY2VUeXBlcywgJHR5cGVTY2hlbWEpO1xuICAgIH1cbiAgICB2YXIgJHJ1bGVzR3JvdXAgPSBpdC5SVUxFUy50eXBlc1skdHlwZVNjaGVtYV07XG4gICAgaWYgKCRjb2VyY2VUb1R5cGVzIHx8ICR0eXBlSXNBcnJheSB8fCAkcnVsZXNHcm91cCA9PT0gdHJ1ZSB8fCAoJHJ1bGVzR3JvdXAgJiYgISRzaG91bGRVc2VHcm91cCgkcnVsZXNHcm91cCkpKSB7XG4gICAgICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgJy50eXBlJyxcbiAgICAgICAgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy90eXBlJztcbiAgICAgIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyAnLnR5cGUnLFxuICAgICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnL3R5cGUnLFxuICAgICAgICAkbWV0aG9kID0gJHR5cGVJc0FycmF5ID8gJ2NoZWNrRGF0YVR5cGVzJyA6ICdjaGVja0RhdGFUeXBlJztcbiAgICAgIG91dCArPSAnIGlmICgnICsgKGl0LnV0aWxbJG1ldGhvZF0oJHR5cGVTY2hlbWEsICRkYXRhLCBpdC5vcHRzLnN0cmljdE51bWJlcnMsIHRydWUpKSArICcpIHsgJztcbiAgICAgIGlmICgkY29lcmNlVG9UeXBlcykge1xuICAgICAgICB2YXIgJGRhdGFUeXBlID0gJ2RhdGFUeXBlJyArICRsdmwsXG4gICAgICAgICAgJGNvZXJjZWQgPSAnY29lcmNlZCcgKyAkbHZsO1xuICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkZGF0YVR5cGUpICsgJyA9IHR5cGVvZiAnICsgKCRkYXRhKSArICc7IHZhciAnICsgKCRjb2VyY2VkKSArICcgPSB1bmRlZmluZWQ7ICc7XG4gICAgICAgIGlmIChpdC5vcHRzLmNvZXJjZVR5cGVzID09ICdhcnJheScpIHtcbiAgICAgICAgICBvdXQgKz0gJyBpZiAoJyArICgkZGF0YVR5cGUpICsgJyA9PSBcXCdvYmplY3RcXCcgJiYgQXJyYXkuaXNBcnJheSgnICsgKCRkYXRhKSArICcpICYmICcgKyAoJGRhdGEpICsgJy5sZW5ndGggPT0gMSkgeyAnICsgKCRkYXRhKSArICcgPSAnICsgKCRkYXRhKSArICdbMF07ICcgKyAoJGRhdGFUeXBlKSArICcgPSB0eXBlb2YgJyArICgkZGF0YSkgKyAnOyBpZiAoJyArIChpdC51dGlsLmNoZWNrRGF0YVR5cGUoaXQuc2NoZW1hLnR5cGUsICRkYXRhLCBpdC5vcHRzLnN0cmljdE51bWJlcnMpKSArICcpICcgKyAoJGNvZXJjZWQpICsgJyA9ICcgKyAoJGRhdGEpICsgJzsgfSAnO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIGlmICgnICsgKCRjb2VyY2VkKSArICcgIT09IHVuZGVmaW5lZCkgOyAnO1xuICAgICAgICB2YXIgYXJyMSA9ICRjb2VyY2VUb1R5cGVzO1xuICAgICAgICBpZiAoYXJyMSkge1xuICAgICAgICAgIHZhciAkdHlwZSwgJGkgPSAtMSxcbiAgICAgICAgICAgIGwxID0gYXJyMS5sZW5ndGggLSAxO1xuICAgICAgICAgIHdoaWxlICgkaSA8IGwxKSB7XG4gICAgICAgICAgICAkdHlwZSA9IGFycjFbJGkgKz0gMV07XG4gICAgICAgICAgICBpZiAoJHR5cGUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgZWxzZSBpZiAoJyArICgkZGF0YVR5cGUpICsgJyA9PSBcXCdudW1iZXJcXCcgfHwgJyArICgkZGF0YVR5cGUpICsgJyA9PSBcXCdib29sZWFuXFwnKSAnICsgKCRjb2VyY2VkKSArICcgPSBcXCdcXCcgKyAnICsgKCRkYXRhKSArICc7IGVsc2UgaWYgKCcgKyAoJGRhdGEpICsgJyA9PT0gbnVsbCkgJyArICgkY29lcmNlZCkgKyAnID0gXFwnXFwnOyAnO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkdHlwZSA9PSAnbnVtYmVyJyB8fCAkdHlwZSA9PSAnaW50ZWdlcicpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgZWxzZSBpZiAoJyArICgkZGF0YVR5cGUpICsgJyA9PSBcXCdib29sZWFuXFwnIHx8ICcgKyAoJGRhdGEpICsgJyA9PT0gbnVsbCB8fCAoJyArICgkZGF0YVR5cGUpICsgJyA9PSBcXCdzdHJpbmdcXCcgJiYgJyArICgkZGF0YSkgKyAnICYmICcgKyAoJGRhdGEpICsgJyA9PSArJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgICAgICAgIGlmICgkdHlwZSA9PSAnaW50ZWdlcicpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJyAmJiAhKCcgKyAoJGRhdGEpICsgJyAlIDEpJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBvdXQgKz0gJykpICcgKyAoJGNvZXJjZWQpICsgJyA9ICsnICsgKCRkYXRhKSArICc7ICc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCR0eXBlID09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyBlbHNlIGlmICgnICsgKCRkYXRhKSArICcgPT09IFxcJ2ZhbHNlXFwnIHx8ICcgKyAoJGRhdGEpICsgJyA9PT0gMCB8fCAnICsgKCRkYXRhKSArICcgPT09IG51bGwpICcgKyAoJGNvZXJjZWQpICsgJyA9IGZhbHNlOyBlbHNlIGlmICgnICsgKCRkYXRhKSArICcgPT09IFxcJ3RydWVcXCcgfHwgJyArICgkZGF0YSkgKyAnID09PSAxKSAnICsgKCRjb2VyY2VkKSArICcgPSB0cnVlOyAnO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkdHlwZSA9PSAnbnVsbCcpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgZWxzZSBpZiAoJyArICgkZGF0YSkgKyAnID09PSBcXCdcXCcgfHwgJyArICgkZGF0YSkgKyAnID09PSAwIHx8ICcgKyAoJGRhdGEpICsgJyA9PT0gZmFsc2UpICcgKyAoJGNvZXJjZWQpICsgJyA9IG51bGw7ICc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGl0Lm9wdHMuY29lcmNlVHlwZXMgPT0gJ2FycmF5JyAmJiAkdHlwZSA9PSAnYXJyYXknKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIGVsc2UgaWYgKCcgKyAoJGRhdGFUeXBlKSArICcgPT0gXFwnc3RyaW5nXFwnIHx8ICcgKyAoJGRhdGFUeXBlKSArICcgPT0gXFwnbnVtYmVyXFwnIHx8ICcgKyAoJGRhdGFUeXBlKSArICcgPT0gXFwnYm9vbGVhblxcJyB8fCAnICsgKCRkYXRhKSArICcgPT0gbnVsbCkgJyArICgkY29lcmNlZCkgKyAnID0gWycgKyAoJGRhdGEpICsgJ107ICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIGVsc2UgeyAgICc7XG4gICAgICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAgICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgICAgIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgkZXJyb3JLZXl3b3JkIHx8ICd0eXBlJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyB0eXBlOiBcXCcnO1xuICAgICAgICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYS5qb2luKFwiLFwiKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnXFwnIH0gJztcbiAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGJlICc7XG4gICAgICAgICAgICBpZiAoJHR5cGVJc0FycmF5KSB7XG4gICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYS5qb2luKFwiLFwiKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJycgKyAoJHR5cGVTY2hlbWEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyB9IGlmICgnICsgKCRjb2VyY2VkKSArICcgIT09IHVuZGVmaW5lZCkgeyAgJztcbiAgICAgICAgdmFyICRwYXJlbnREYXRhID0gJGRhdGFMdmwgPyAnZGF0YScgKyAoKCRkYXRhTHZsIC0gMSkgfHwgJycpIDogJ3BhcmVudERhdGEnLFxuICAgICAgICAgICRwYXJlbnREYXRhUHJvcGVydHkgPSAkZGF0YUx2bCA/IGl0LmRhdGFQYXRoQXJyWyRkYXRhTHZsXSA6ICdwYXJlbnREYXRhUHJvcGVydHknO1xuICAgICAgICBvdXQgKz0gJyAnICsgKCRkYXRhKSArICcgPSAnICsgKCRjb2VyY2VkKSArICc7ICc7XG4gICAgICAgIGlmICghJGRhdGFMdmwpIHtcbiAgICAgICAgICBvdXQgKz0gJ2lmICgnICsgKCRwYXJlbnREYXRhKSArICcgIT09IHVuZGVmaW5lZCknO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnICcgKyAoJHBhcmVudERhdGEpICsgJ1snICsgKCRwYXJlbnREYXRhUHJvcGVydHkpICsgJ10gPSAnICsgKCRjb2VyY2VkKSArICc7IH0gJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAgICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgICAgIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgkZXJyb3JLZXl3b3JkIHx8ICd0eXBlJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyB0eXBlOiBcXCcnO1xuICAgICAgICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYS5qb2luKFwiLFwiKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnXFwnIH0gJztcbiAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGJlICc7XG4gICAgICAgICAgICBpZiAoJHR5cGVJc0FycmF5KSB7XG4gICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYS5qb2luKFwiLFwiKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJycgKyAoJHR5cGVTY2hlbWEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH1cbiAgfVxuICBpZiAoaXQuc2NoZW1hLiRyZWYgJiYgISRyZWZLZXl3b3Jkcykge1xuICAgIG91dCArPSAnICcgKyAoaXQuUlVMRVMuYWxsLiRyZWYuY29kZShpdCwgJyRyZWYnKSkgKyAnICc7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIH0gaWYgKGVycm9ycyA9PT0gJztcbiAgICAgIGlmICgkdG9wKSB7XG4gICAgICAgIG91dCArPSAnMCc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJ2VycnNfJyArICgkbHZsKTtcbiAgICAgIH1cbiAgICAgIG91dCArPSAnKSB7ICc7XG4gICAgICAkY2xvc2luZ0JyYWNlczIgKz0gJ30nO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYXJyMiA9IGl0LlJVTEVTO1xuICAgIGlmIChhcnIyKSB7XG4gICAgICB2YXIgJHJ1bGVzR3JvdXAsIGkyID0gLTEsXG4gICAgICAgIGwyID0gYXJyMi5sZW5ndGggLSAxO1xuICAgICAgd2hpbGUgKGkyIDwgbDIpIHtcbiAgICAgICAgJHJ1bGVzR3JvdXAgPSBhcnIyW2kyICs9IDFdO1xuICAgICAgICBpZiAoJHNob3VsZFVzZUdyb3VwKCRydWxlc0dyb3VwKSkge1xuICAgICAgICAgIGlmICgkcnVsZXNHcm91cC50eXBlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBpZiAoJyArIChpdC51dGlsLmNoZWNrRGF0YVR5cGUoJHJ1bGVzR3JvdXAudHlwZSwgJGRhdGEsIGl0Lm9wdHMuc3RyaWN0TnVtYmVycykpICsgJykgeyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXQub3B0cy51c2VEZWZhdWx0cykge1xuICAgICAgICAgICAgaWYgKCRydWxlc0dyb3VwLnR5cGUgPT0gJ29iamVjdCcgJiYgaXQuc2NoZW1hLnByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWEucHJvcGVydGllcyxcbiAgICAgICAgICAgICAgICAkc2NoZW1hS2V5cyA9IE9iamVjdC5rZXlzKCRzY2hlbWEpO1xuICAgICAgICAgICAgICB2YXIgYXJyMyA9ICRzY2hlbWFLZXlzO1xuICAgICAgICAgICAgICBpZiAoYXJyMykge1xuICAgICAgICAgICAgICAgIHZhciAkcHJvcGVydHlLZXksIGkzID0gLTEsXG4gICAgICAgICAgICAgICAgICBsMyA9IGFycjMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaTMgPCBsMykge1xuICAgICAgICAgICAgICAgICAgJHByb3BlcnR5S2V5ID0gYXJyM1tpMyArPSAxXTtcbiAgICAgICAgICAgICAgICAgIHZhciAkc2NoID0gJHNjaGVtYVskcHJvcGVydHlLZXldO1xuICAgICAgICAgICAgICAgICAgaWYgKCRzY2guZGVmYXVsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkcGFzc0RhdGEgPSAkZGF0YSArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJHByb3BlcnR5S2V5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0LmNvbXBvc2l0ZVJ1bGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy5zdHJpY3REZWZhdWx0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyICRkZWZhdWx0TXNnID0gJ2RlZmF1bHQgaXMgaWdub3JlZCBmb3I6ICcgKyAkcGFzc0RhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy5zdHJpY3REZWZhdWx0cyA9PT0gJ2xvZycpIGl0LmxvZ2dlci53YXJuKCRkZWZhdWx0TXNnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKCRkZWZhdWx0TXNnKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJHBhc3NEYXRhKSArICcgPT09IHVuZGVmaW5lZCAnO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLnVzZURlZmF1bHRzID09ICdlbXB0eScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dCArPSAnIHx8ICcgKyAoJHBhc3NEYXRhKSArICcgPT09IG51bGwgfHwgJyArICgkcGFzc0RhdGEpICsgJyA9PT0gXFwnXFwnICc7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIG91dCArPSAnICkgJyArICgkcGFzc0RhdGEpICsgJyA9ICc7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudXNlRGVmYXVsdHMgPT0gJ3NoYXJlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dCArPSAnICcgKyAoaXQudXNlRGVmYXVsdCgkc2NoLmRlZmF1bHQpKSArICcgJztcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgJyArIChKU09OLnN0cmluZ2lmeSgkc2NoLmRlZmF1bHQpKSArICcgJztcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICc7ICc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJHJ1bGVzR3JvdXAudHlwZSA9PSAnYXJyYXknICYmIEFycmF5LmlzQXJyYXkoaXQuc2NoZW1hLml0ZW1zKSkge1xuICAgICAgICAgICAgICB2YXIgYXJyNCA9IGl0LnNjaGVtYS5pdGVtcztcbiAgICAgICAgICAgICAgaWYgKGFycjQpIHtcbiAgICAgICAgICAgICAgICB2YXIgJHNjaCwgJGkgPSAtMSxcbiAgICAgICAgICAgICAgICAgIGw0ID0gYXJyNC5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgIHdoaWxlICgkaSA8IGw0KSB7XG4gICAgICAgICAgICAgICAgICAkc2NoID0gYXJyNFskaSArPSAxXTtcbiAgICAgICAgICAgICAgICAgIGlmICgkc2NoLmRlZmF1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgJHBhc3NEYXRhID0gJGRhdGEgKyAnWycgKyAkaSArICddJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0LmNvbXBvc2l0ZVJ1bGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy5zdHJpY3REZWZhdWx0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyICRkZWZhdWx0TXNnID0gJ2RlZmF1bHQgaXMgaWdub3JlZCBmb3I6ICcgKyAkcGFzc0RhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy5zdHJpY3REZWZhdWx0cyA9PT0gJ2xvZycpIGl0LmxvZ2dlci53YXJuKCRkZWZhdWx0TXNnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKCRkZWZhdWx0TXNnKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJHBhc3NEYXRhKSArICcgPT09IHVuZGVmaW5lZCAnO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLnVzZURlZmF1bHRzID09ICdlbXB0eScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dCArPSAnIHx8ICcgKyAoJHBhc3NEYXRhKSArICcgPT09IG51bGwgfHwgJyArICgkcGFzc0RhdGEpICsgJyA9PT0gXFwnXFwnICc7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIG91dCArPSAnICkgJyArICgkcGFzc0RhdGEpICsgJyA9ICc7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudXNlRGVmYXVsdHMgPT0gJ3NoYXJlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dCArPSAnICcgKyAoaXQudXNlRGVmYXVsdCgkc2NoLmRlZmF1bHQpKSArICcgJztcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgJyArIChKU09OLnN0cmluZ2lmeSgkc2NoLmRlZmF1bHQpKSArICcgJztcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICc7ICc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGFycjUgPSAkcnVsZXNHcm91cC5ydWxlcztcbiAgICAgICAgICBpZiAoYXJyNSkge1xuICAgICAgICAgICAgdmFyICRydWxlLCBpNSA9IC0xLFxuICAgICAgICAgICAgICBsNSA9IGFycjUubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgIHdoaWxlIChpNSA8IGw1KSB7XG4gICAgICAgICAgICAgICRydWxlID0gYXJyNVtpNSArPSAxXTtcbiAgICAgICAgICAgICAgaWYgKCRzaG91bGRVc2VSdWxlKCRydWxlKSkge1xuICAgICAgICAgICAgICAgIHZhciAkY29kZSA9ICRydWxlLmNvZGUoaXQsICRydWxlLmtleXdvcmQsICRydWxlc0dyb3VwLnR5cGUpO1xuICAgICAgICAgICAgICAgIGlmICgkY29kZSkge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgJyArICgkY29kZSkgKyAnICc7XG4gICAgICAgICAgICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAkY2xvc2luZ0JyYWNlczEgKz0gJ30nO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArICgkY2xvc2luZ0JyYWNlczEpICsgJyAnO1xuICAgICAgICAgICAgJGNsb3NpbmdCcmFjZXMxID0gJyc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkcnVsZXNHcm91cC50eXBlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgICAgICBpZiAoJHR5cGVTY2hlbWEgJiYgJHR5cGVTY2hlbWEgPT09ICRydWxlc0dyb3VwLnR5cGUgJiYgISRjb2VyY2VUb1R5cGVzKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICAgICAgICAgICAgICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgJy50eXBlJyxcbiAgICAgICAgICAgICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnL3R5cGUnO1xuICAgICAgICAgICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAgICAgICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgICAgICAgICAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJGVycm9yS2V5d29yZCB8fCAndHlwZScpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgdHlwZTogXFwnJztcbiAgICAgICAgICAgICAgICBpZiAoJHR5cGVJc0FycmF5KSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJycgKyAoJHR5cGVTY2hlbWEuam9pbihcIixcIikpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJycgKyAoJHR5cGVTY2hlbWEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvdXQgKz0gJ1xcJyB9ICc7XG4gICAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBiZSAnO1xuICAgICAgICAgICAgICAgICAgaWYgKCR0eXBlSXNBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJycgKyAoJHR5cGVTY2hlbWEuam9pbihcIixcIikpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIG91dCArPSAnXFwnICc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJyB7fSAnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHZhciBfX2VyciA9IG91dDtcbiAgICAgICAgICAgICAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgICAgICAgICAgICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgICAgICAgICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgb3V0ICs9ICcgaWYgKGVycm9ycyA9PT0gJztcbiAgICAgICAgICAgIGlmICgkdG9wKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnMCc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJ2VycnNfJyArICgkbHZsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnKSB7ICc7XG4gICAgICAgICAgICAkY2xvc2luZ0JyYWNlczIgKz0gJ30nO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnICcgKyAoJGNsb3NpbmdCcmFjZXMyKSArICcgJztcbiAgfVxuICBpZiAoJHRvcCkge1xuICAgIGlmICgkYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIGlmIChlcnJvcnMgPT09IDApIHJldHVybiBkYXRhOyAgICAgICAgICAgJztcbiAgICAgIG91dCArPSAnIGVsc2UgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcih2RXJyb3JzKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gdkVycm9yczsgJztcbiAgICAgIG91dCArPSAnIHJldHVybiBlcnJvcnMgPT09IDA7ICAgICAgICc7XG4gICAgfVxuICAgIG91dCArPSAnIH07IHJldHVybiB2YWxpZGF0ZTsnO1xuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHZhciAnICsgKCR2YWxpZCkgKyAnID0gZXJyb3JzID09PSBlcnJzXycgKyAoJGx2bCkgKyAnOyc7XG4gIH1cblxuICBmdW5jdGlvbiAkc2hvdWxkVXNlR3JvdXAoJHJ1bGVzR3JvdXApIHtcbiAgICB2YXIgcnVsZXMgPSAkcnVsZXNHcm91cC5ydWxlcztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJ1bGVzLmxlbmd0aDsgaSsrKVxuICAgICAgaWYgKCRzaG91bGRVc2VSdWxlKHJ1bGVzW2ldKSkgcmV0dXJuIHRydWU7XG4gIH1cblxuICBmdW5jdGlvbiAkc2hvdWxkVXNlUnVsZSgkcnVsZSkge1xuICAgIHJldHVybiBpdC5zY2hlbWFbJHJ1bGUua2V5d29yZF0gIT09IHVuZGVmaW5lZCB8fCAoJHJ1bGUuaW1wbGVtZW50cyAmJiAkcnVsZUltcGxlbWVudHNTb21lS2V5d29yZCgkcnVsZSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gJHJ1bGVJbXBsZW1lbnRzU29tZUtleXdvcmQoJHJ1bGUpIHtcbiAgICB2YXIgaW1wbCA9ICRydWxlLmltcGxlbWVudHM7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbXBsLmxlbmd0aDsgaSsrKVxuICAgICAgaWYgKGl0LnNjaGVtYVtpbXBsW2ldXSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL3ZhbGlkYXRlLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5cbnZhciBJREVOVElGSUVSID0gL15bYS16XyRdW2EtejAtOV8kLV0qJC9pO1xudmFyIGN1c3RvbVJ1bGVDb2RlID0gcmVxdWlyZSgnLi9kb3Rqcy9jdXN0b20nKTtcbnZhciBkZWZpbml0aW9uU2NoZW1hID0gcmVxdWlyZSgnLi9kZWZpbml0aW9uX3NjaGVtYScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYWRkOiBhZGRLZXl3b3JkLFxuICBnZXQ6IGdldEtleXdvcmQsXG4gIHJlbW92ZTogcmVtb3ZlS2V5d29yZCxcbiAgdmFsaWRhdGU6IHZhbGlkYXRlS2V5d29yZFxufTtcblxuXG4vKipcbiAqIERlZmluZSBjdXN0b20ga2V5d29yZFxuICogQHRoaXMgIEFqdlxuICogQHBhcmFtIHtTdHJpbmd9IGtleXdvcmQgY3VzdG9tIGtleXdvcmQsIHNob3VsZCBiZSB1bmlxdWUgKGluY2x1ZGluZyBkaWZmZXJlbnQgZnJvbSBhbGwgc3RhbmRhcmQsIGN1c3RvbSBhbmQgbWFjcm8ga2V5d29yZHMpLlxuICogQHBhcmFtIHtPYmplY3R9IGRlZmluaXRpb24ga2V5d29yZCBkZWZpbml0aW9uIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgYHR5cGVgICh0eXBlKHMpIHdoaWNoIHRoZSBrZXl3b3JkIGFwcGxpZXMgdG8pLCBgdmFsaWRhdGVgIG9yIGBjb21waWxlYC5cbiAqIEByZXR1cm4ge0Fqdn0gdGhpcyBmb3IgbWV0aG9kIGNoYWluaW5nXG4gKi9cbmZ1bmN0aW9uIGFkZEtleXdvcmQoa2V5d29yZCwgZGVmaW5pdGlvbikge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gIC8qIGVzbGludCBuby1zaGFkb3c6IDAgKi9cbiAgdmFyIFJVTEVTID0gdGhpcy5SVUxFUztcbiAgaWYgKFJVTEVTLmtleXdvcmRzW2tleXdvcmRdKVxuICAgIHRocm93IG5ldyBFcnJvcignS2V5d29yZCAnICsga2V5d29yZCArICcgaXMgYWxyZWFkeSBkZWZpbmVkJyk7XG5cbiAgaWYgKCFJREVOVElGSUVSLnRlc3Qoa2V5d29yZCkpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdLZXl3b3JkICcgKyBrZXl3b3JkICsgJyBpcyBub3QgYSB2YWxpZCBpZGVudGlmaWVyJyk7XG5cbiAgaWYgKGRlZmluaXRpb24pIHtcbiAgICB0aGlzLnZhbGlkYXRlS2V5d29yZChkZWZpbml0aW9uLCB0cnVlKTtcblxuICAgIHZhciBkYXRhVHlwZSA9IGRlZmluaXRpb24udHlwZTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhVHlwZSkpIHtcbiAgICAgIGZvciAodmFyIGk9MDsgaTxkYXRhVHlwZS5sZW5ndGg7IGkrKylcbiAgICAgICAgX2FkZFJ1bGUoa2V5d29yZCwgZGF0YVR5cGVbaV0sIGRlZmluaXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICBfYWRkUnVsZShrZXl3b3JkLCBkYXRhVHlwZSwgZGVmaW5pdGlvbik7XG4gICAgfVxuXG4gICAgdmFyIG1ldGFTY2hlbWEgPSBkZWZpbml0aW9uLm1ldGFTY2hlbWE7XG4gICAgaWYgKG1ldGFTY2hlbWEpIHtcbiAgICAgIGlmIChkZWZpbml0aW9uLiRkYXRhICYmIHRoaXMuX29wdHMuJGRhdGEpIHtcbiAgICAgICAgbWV0YVNjaGVtYSA9IHtcbiAgICAgICAgICBhbnlPZjogW1xuICAgICAgICAgICAgbWV0YVNjaGVtYSxcbiAgICAgICAgICAgIHsgJyRyZWYnOiAnaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2Fqdi12YWxpZGF0b3IvYWp2L21hc3Rlci9saWIvcmVmcy9kYXRhLmpzb24jJyB9XG4gICAgICAgICAgXVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgZGVmaW5pdGlvbi52YWxpZGF0ZVNjaGVtYSA9IHRoaXMuY29tcGlsZShtZXRhU2NoZW1hLCB0cnVlKTtcbiAgICB9XG4gIH1cblxuICBSVUxFUy5rZXl3b3Jkc1trZXl3b3JkXSA9IFJVTEVTLmFsbFtrZXl3b3JkXSA9IHRydWU7XG5cblxuICBmdW5jdGlvbiBfYWRkUnVsZShrZXl3b3JkLCBkYXRhVHlwZSwgZGVmaW5pdGlvbikge1xuICAgIHZhciBydWxlR3JvdXA7XG4gICAgZm9yICh2YXIgaT0wOyBpPFJVTEVTLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgcmcgPSBSVUxFU1tpXTtcbiAgICAgIGlmIChyZy50eXBlID09IGRhdGFUeXBlKSB7XG4gICAgICAgIHJ1bGVHcm91cCA9IHJnO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXJ1bGVHcm91cCkge1xuICAgICAgcnVsZUdyb3VwID0geyB0eXBlOiBkYXRhVHlwZSwgcnVsZXM6IFtdIH07XG4gICAgICBSVUxFUy5wdXNoKHJ1bGVHcm91cCk7XG4gICAgfVxuXG4gICAgdmFyIHJ1bGUgPSB7XG4gICAgICBrZXl3b3JkOiBrZXl3b3JkLFxuICAgICAgZGVmaW5pdGlvbjogZGVmaW5pdGlvbixcbiAgICAgIGN1c3RvbTogdHJ1ZSxcbiAgICAgIGNvZGU6IGN1c3RvbVJ1bGVDb2RlLFxuICAgICAgaW1wbGVtZW50czogZGVmaW5pdGlvbi5pbXBsZW1lbnRzXG4gICAgfTtcbiAgICBydWxlR3JvdXAucnVsZXMucHVzaChydWxlKTtcbiAgICBSVUxFUy5jdXN0b21ba2V5d29yZF0gPSBydWxlO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59XG5cblxuLyoqXG4gKiBHZXQga2V5d29yZFxuICogQHRoaXMgIEFqdlxuICogQHBhcmFtIHtTdHJpbmd9IGtleXdvcmQgcHJlLWRlZmluZWQgb3IgY3VzdG9tIGtleXdvcmQuXG4gKiBAcmV0dXJuIHtPYmplY3R8Qm9vbGVhbn0gY3VzdG9tIGtleXdvcmQgZGVmaW5pdGlvbiwgYHRydWVgIGlmIGl0IGlzIGEgcHJlZGVmaW5lZCBrZXl3b3JkLCBgZmFsc2VgIG90aGVyd2lzZS5cbiAqL1xuZnVuY3Rpb24gZ2V0S2V5d29yZChrZXl3b3JkKSB7XG4gIC8qIGpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgdmFyIHJ1bGUgPSB0aGlzLlJVTEVTLmN1c3RvbVtrZXl3b3JkXTtcbiAgcmV0dXJuIHJ1bGUgPyBydWxlLmRlZmluaXRpb24gOiB0aGlzLlJVTEVTLmtleXdvcmRzW2tleXdvcmRdIHx8IGZhbHNlO1xufVxuXG5cbi8qKlxuICogUmVtb3ZlIGtleXdvcmRcbiAqIEB0aGlzICBBanZcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXl3b3JkIHByZS1kZWZpbmVkIG9yIGN1c3RvbSBrZXl3b3JkLlxuICogQHJldHVybiB7QWp2fSB0aGlzIGZvciBtZXRob2QgY2hhaW5pbmdcbiAqL1xuZnVuY3Rpb24gcmVtb3ZlS2V5d29yZChrZXl3b3JkKSB7XG4gIC8qIGpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgdmFyIFJVTEVTID0gdGhpcy5SVUxFUztcbiAgZGVsZXRlIFJVTEVTLmtleXdvcmRzW2tleXdvcmRdO1xuICBkZWxldGUgUlVMRVMuYWxsW2tleXdvcmRdO1xuICBkZWxldGUgUlVMRVMuY3VzdG9tW2tleXdvcmRdO1xuICBmb3IgKHZhciBpPTA7IGk8UlVMRVMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcnVsZXMgPSBSVUxFU1tpXS5ydWxlcztcbiAgICBmb3IgKHZhciBqPTA7IGo8cnVsZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgIGlmIChydWxlc1tqXS5rZXl3b3JkID09IGtleXdvcmQpIHtcbiAgICAgICAgcnVsZXMuc3BsaWNlKGosIDEpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59XG5cblxuLyoqXG4gKiBWYWxpZGF0ZSBrZXl3b3JkIGRlZmluaXRpb25cbiAqIEB0aGlzICBBanZcbiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZpbml0aW9uIGtleXdvcmQgZGVmaW5pdGlvbiBvYmplY3QuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHRocm93RXJyb3IgdHJ1ZSB0byB0aHJvdyBleGNlcHRpb24gaWYgZGVmaW5pdGlvbiBpcyBpbnZhbGlkXG4gKiBAcmV0dXJuIHtib29sZWFufSB2YWxpZGF0aW9uIHJlc3VsdFxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZUtleXdvcmQoZGVmaW5pdGlvbiwgdGhyb3dFcnJvcikge1xuICB2YWxpZGF0ZUtleXdvcmQuZXJyb3JzID0gbnVsbDtcbiAgdmFyIHYgPSB0aGlzLl92YWxpZGF0ZUtleXdvcmQgPSB0aGlzLl92YWxpZGF0ZUtleXdvcmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB0aGlzLmNvbXBpbGUoZGVmaW5pdGlvblNjaGVtYSwgdHJ1ZSk7XG5cbiAgaWYgKHYoZGVmaW5pdGlvbikpIHJldHVybiB0cnVlO1xuICB2YWxpZGF0ZUtleXdvcmQuZXJyb3JzID0gdi5lcnJvcnM7XG4gIGlmICh0aHJvd0Vycm9yKVxuICAgIHRocm93IG5ldyBFcnJvcignY3VzdG9tIGtleXdvcmQgZGVmaW5pdGlvbiBpcyBpbnZhbGlkOiAnICArIHRoaXMuZXJyb3JzVGV4dCh2LmVycm9ycykpO1xuICBlbHNlXG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2tleXdvcmQuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYlwiKSIsIm1vZHVsZS5leHBvcnRzPXtcbiAgICBcIiRzY2hlbWFcIjogXCJodHRwOi8vanNvbi1zY2hlbWEub3JnL2RyYWZ0LTA3L3NjaGVtYSNcIixcbiAgICBcIiRpZFwiOiBcImh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9hanYtdmFsaWRhdG9yL2Fqdi9tYXN0ZXIvbGliL3JlZnMvZGF0YS5qc29uI1wiLFxuICAgIFwiZGVzY3JpcHRpb25cIjogXCJNZXRhLXNjaGVtYSBmb3IgJGRhdGEgcmVmZXJlbmNlIChKU09OIFNjaGVtYSBleHRlbnNpb24gcHJvcG9zYWwpXCIsXG4gICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgXCJyZXF1aXJlZFwiOiBbIFwiJGRhdGFcIiBdLFxuICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiJGRhdGFcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICBcImFueU9mXCI6IFtcbiAgICAgICAgICAgICAgICB7IFwiZm9ybWF0XCI6IFwicmVsYXRpdmUtanNvbi1wb2ludGVyXCIgfSwgXG4gICAgICAgICAgICAgICAgeyBcImZvcm1hdFwiOiBcImpzb24tcG9pbnRlclwiIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXCJhZGRpdGlvbmFsUHJvcGVydGllc1wiOiBmYWxzZVxufVxuIiwibW9kdWxlLmV4cG9ydHM9e1xuICAgIFwiJHNjaGVtYVwiOiBcImh0dHA6Ly9qc29uLXNjaGVtYS5vcmcvZHJhZnQtMDcvc2NoZW1hI1wiLFxuICAgIFwiJGlkXCI6IFwiaHR0cDovL2pzb24tc2NoZW1hLm9yZy9kcmFmdC0wNy9zY2hlbWEjXCIsXG4gICAgXCJ0aXRsZVwiOiBcIkNvcmUgc2NoZW1hIG1ldGEtc2NoZW1hXCIsXG4gICAgXCJkZWZpbml0aW9uc1wiOiB7XG4gICAgICAgIFwic2NoZW1hQXJyYXlcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgIFwibWluSXRlbXNcIjogMSxcbiAgICAgICAgICAgIFwiaXRlbXNcIjogeyBcIiRyZWZcIjogXCIjXCIgfVxuICAgICAgICB9LFxuICAgICAgICBcIm5vbk5lZ2F0aXZlSW50ZWdlclwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJpbnRlZ2VyXCIsXG4gICAgICAgICAgICBcIm1pbmltdW1cIjogMFxuICAgICAgICB9LFxuICAgICAgICBcIm5vbk5lZ2F0aXZlSW50ZWdlckRlZmF1bHQwXCI6IHtcbiAgICAgICAgICAgIFwiYWxsT2ZcIjogW1xuICAgICAgICAgICAgICAgIHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9ub25OZWdhdGl2ZUludGVnZXJcIiB9LFxuICAgICAgICAgICAgICAgIHsgXCJkZWZhdWx0XCI6IDAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInNpbXBsZVR5cGVzXCI6IHtcbiAgICAgICAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgICAgICAgICAgXCJhcnJheVwiLFxuICAgICAgICAgICAgICAgIFwiYm9vbGVhblwiLFxuICAgICAgICAgICAgICAgIFwiaW50ZWdlclwiLFxuICAgICAgICAgICAgICAgIFwibnVsbFwiLFxuICAgICAgICAgICAgICAgIFwibnVtYmVyXCIsXG4gICAgICAgICAgICAgICAgXCJvYmplY3RcIixcbiAgICAgICAgICAgICAgICBcInN0cmluZ1wiXG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwic3RyaW5nQXJyYXlcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgIFwiaXRlbXNcIjogeyBcInR5cGVcIjogXCJzdHJpbmdcIiB9LFxuICAgICAgICAgICAgXCJ1bmlxdWVJdGVtc1wiOiB0cnVlLFxuICAgICAgICAgICAgXCJkZWZhdWx0XCI6IFtdXG4gICAgICAgIH1cbiAgICB9LFxuICAgIFwidHlwZVwiOiBbXCJvYmplY3RcIiwgXCJib29sZWFuXCJdLFxuICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiJGlkXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgICAgICAgXCJmb3JtYXRcIjogXCJ1cmktcmVmZXJlbmNlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCIkc2NoZW1hXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgICAgICAgXCJmb3JtYXRcIjogXCJ1cmlcIlxuICAgICAgICB9LFxuICAgICAgICBcIiRyZWZcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICBcImZvcm1hdFwiOiBcInVyaS1yZWZlcmVuY2VcIlxuICAgICAgICB9LFxuICAgICAgICBcIiRjb21tZW50XCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkZXNjcmlwdGlvblwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRlZmF1bHRcIjogdHJ1ZSxcbiAgICAgICAgXCJyZWFkT25seVwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCIsXG4gICAgICAgICAgICBcImRlZmF1bHRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgXCJleGFtcGxlc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgXCJpdGVtc1wiOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIFwibXVsdGlwbGVPZlwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIixcbiAgICAgICAgICAgIFwiZXhjbHVzaXZlTWluaW11bVwiOiAwXG4gICAgICAgIH0sXG4gICAgICAgIFwibWF4aW11bVwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImV4Y2x1c2l2ZU1heGltdW1cIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJtaW5pbXVtXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZXhjbHVzaXZlTWluaW11bVwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1heExlbmd0aFwiOiB7IFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvbm9uTmVnYXRpdmVJbnRlZ2VyXCIgfSxcbiAgICAgICAgXCJtaW5MZW5ndGhcIjogeyBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL25vbk5lZ2F0aXZlSW50ZWdlckRlZmF1bHQwXCIgfSxcbiAgICAgICAgXCJwYXR0ZXJuXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgICAgICAgXCJmb3JtYXRcIjogXCJyZWdleFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYWRkaXRpb25hbEl0ZW1zXCI6IHsgXCIkcmVmXCI6IFwiI1wiIH0sXG4gICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJhbnlPZlwiOiBbXG4gICAgICAgICAgICAgICAgeyBcIiRyZWZcIjogXCIjXCIgfSxcbiAgICAgICAgICAgICAgICB7IFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvc2NoZW1hQXJyYXlcIiB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgXCJkZWZhdWx0XCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgXCJtYXhJdGVtc1wiOiB7IFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvbm9uTmVnYXRpdmVJbnRlZ2VyXCIgfSxcbiAgICAgICAgXCJtaW5JdGVtc1wiOiB7IFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvbm9uTmVnYXRpdmVJbnRlZ2VyRGVmYXVsdDBcIiB9LFxuICAgICAgICBcInVuaXF1ZUl0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIixcbiAgICAgICAgICAgIFwiZGVmYXVsdFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBcImNvbnRhaW5zXCI6IHsgXCIkcmVmXCI6IFwiI1wiIH0sXG4gICAgICAgIFwibWF4UHJvcGVydGllc1wiOiB7IFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvbm9uTmVnYXRpdmVJbnRlZ2VyXCIgfSxcbiAgICAgICAgXCJtaW5Qcm9wZXJ0aWVzXCI6IHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9ub25OZWdhdGl2ZUludGVnZXJEZWZhdWx0MFwiIH0sXG4gICAgICAgIFwicmVxdWlyZWRcIjogeyBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL3N0cmluZ0FycmF5XCIgfSxcbiAgICAgICAgXCJhZGRpdGlvbmFsUHJvcGVydGllc1wiOiB7IFwiJHJlZlwiOiBcIiNcIiB9LFxuICAgICAgICBcImRlZmluaXRpb25zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgXCJhZGRpdGlvbmFsUHJvcGVydGllc1wiOiB7IFwiJHJlZlwiOiBcIiNcIiB9LFxuICAgICAgICAgICAgXCJkZWZhdWx0XCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgICAgICAgIFwiYWRkaXRpb25hbFByb3BlcnRpZXNcIjogeyBcIiRyZWZcIjogXCIjXCIgfSxcbiAgICAgICAgICAgIFwiZGVmYXVsdFwiOiB7fVxuICAgICAgICB9LFxuICAgICAgICBcInBhdHRlcm5Qcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgXCJhZGRpdGlvbmFsUHJvcGVydGllc1wiOiB7IFwiJHJlZlwiOiBcIiNcIiB9LFxuICAgICAgICAgICAgXCJwcm9wZXJ0eU5hbWVzXCI6IHsgXCJmb3JtYXRcIjogXCJyZWdleFwiIH0sXG4gICAgICAgICAgICBcImRlZmF1bHRcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAgXCJkZXBlbmRlbmNpZXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICAgICAgICBcImFueU9mXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgeyBcIiRyZWZcIjogXCIjXCIgfSxcbiAgICAgICAgICAgICAgICAgICAgeyBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL3N0cmluZ0FycmF5XCIgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9wZXJ0eU5hbWVzXCI6IHsgXCIkcmVmXCI6IFwiI1wiIH0sXG4gICAgICAgIFwiY29uc3RcIjogdHJ1ZSxcbiAgICAgICAgXCJlbnVtXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICBcIml0ZW1zXCI6IHRydWUsXG4gICAgICAgICAgICBcIm1pbkl0ZW1zXCI6IDEsXG4gICAgICAgICAgICBcInVuaXF1ZUl0ZW1zXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICAgIFwiYW55T2ZcIjogW1xuICAgICAgICAgICAgICAgIHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9zaW1wbGVUeXBlc1wiIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICAgICAgICBcIml0ZW1zXCI6IHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9zaW1wbGVUeXBlc1wiIH0sXG4gICAgICAgICAgICAgICAgICAgIFwibWluSXRlbXNcIjogMSxcbiAgICAgICAgICAgICAgICAgICAgXCJ1bmlxdWVJdGVtc1wiOiB0cnVlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImZvcm1hdFwiOiB7IFwidHlwZVwiOiBcInN0cmluZ1wiIH0sXG4gICAgICAgIFwiY29udGVudE1lZGlhVHlwZVwiOiB7IFwidHlwZVwiOiBcInN0cmluZ1wiIH0sXG4gICAgICAgIFwiY29udGVudEVuY29kaW5nXCI6IHsgXCJ0eXBlXCI6IFwic3RyaW5nXCIgfSxcbiAgICAgICAgXCJpZlwiOiB7XCIkcmVmXCI6IFwiI1wifSxcbiAgICAgICAgXCJ0aGVuXCI6IHtcIiRyZWZcIjogXCIjXCJ9LFxuICAgICAgICBcImVsc2VcIjoge1wiJHJlZlwiOiBcIiNcIn0sXG4gICAgICAgIFwiYWxsT2ZcIjogeyBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL3NjaGVtYUFycmF5XCIgfSxcbiAgICAgICAgXCJhbnlPZlwiOiB7IFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvc2NoZW1hQXJyYXlcIiB9LFxuICAgICAgICBcIm9uZU9mXCI6IHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9zY2hlbWFBcnJheVwiIH0sXG4gICAgICAgIFwibm90XCI6IHsgXCIkcmVmXCI6IFwiI1wiIH1cbiAgICB9LFxuICAgIFwiZGVmYXVsdFwiOiB0cnVlXG59XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG52YXIgbG9va3VwID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuXG47KGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuICB2YXIgQXJyID0gKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJylcbiAgICA/IFVpbnQ4QXJyYXlcbiAgICA6IEFycmF5XG5cblx0dmFyIFBMVVMgICA9ICcrJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSCAgPSAnLycuY2hhckNvZGVBdCgwKVxuXHR2YXIgTlVNQkVSID0gJzAnLmNoYXJDb2RlQXQoMClcblx0dmFyIExPV0VSICA9ICdhJy5jaGFyQ29kZUF0KDApXG5cdHZhciBVUFBFUiAgPSAnQScuY2hhckNvZGVBdCgwKVxuXHR2YXIgUExVU19VUkxfU0FGRSA9ICctJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSF9VUkxfU0FGRSA9ICdfJy5jaGFyQ29kZUF0KDApXG5cblx0ZnVuY3Rpb24gZGVjb2RlIChlbHQpIHtcblx0XHR2YXIgY29kZSA9IGVsdC5jaGFyQ29kZUF0KDApXG5cdFx0aWYgKGNvZGUgPT09IFBMVVMgfHxcblx0XHQgICAgY29kZSA9PT0gUExVU19VUkxfU0FGRSlcblx0XHRcdHJldHVybiA2MiAvLyAnKydcblx0XHRpZiAoY29kZSA9PT0gU0xBU0ggfHxcblx0XHQgICAgY29kZSA9PT0gU0xBU0hfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjMgLy8gJy8nXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIpXG5cdFx0XHRyZXR1cm4gLTEgLy9ubyBtYXRjaFxuXHRcdGlmIChjb2RlIDwgTlVNQkVSICsgMTApXG5cdFx0XHRyZXR1cm4gY29kZSAtIE5VTUJFUiArIDI2ICsgMjZcblx0XHRpZiAoY29kZSA8IFVQUEVSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIFVQUEVSXG5cdFx0aWYgKGNvZGUgPCBMT1dFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBMT1dFUiArIDI2XG5cdH1cblxuXHRmdW5jdGlvbiBiNjRUb0J5dGVBcnJheSAoYjY0KSB7XG5cdFx0dmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcblxuXHRcdGlmIChiNjQubGVuZ3RoICUgNCA+IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG5cdFx0fVxuXG5cdFx0Ly8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcblx0XHQvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG5cdFx0Ly8gcmVwcmVzZW50IG9uZSBieXRlXG5cdFx0Ly8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG5cdFx0Ly8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuXHRcdHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cdFx0cGxhY2VIb2xkZXJzID0gJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDIpID8gMiA6ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAxKSA/IDEgOiAwXG5cblx0XHQvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcblx0XHRhcnIgPSBuZXcgQXJyKGI2NC5sZW5ndGggKiAzIC8gNCAtIHBsYWNlSG9sZGVycylcblxuXHRcdC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcblx0XHRsID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSA0IDogYjY0Lmxlbmd0aFxuXG5cdFx0dmFyIEwgPSAwXG5cblx0XHRmdW5jdGlvbiBwdXNoICh2KSB7XG5cdFx0XHRhcnJbTCsrXSA9IHZcblx0XHR9XG5cblx0XHRmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDE4KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDEyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpIDw8IDYpIHwgZGVjb2RlKGI2NC5jaGFyQXQoaSArIDMpKVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwMDApID4+IDE2KVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwKSA+PiA4KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA+PiA0KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDEwKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDQpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPj4gMilcblx0XHRcdHB1c2goKHRtcCA+PiA4KSAmIDB4RkYpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFyclxuXHR9XG5cblx0ZnVuY3Rpb24gdWludDhUb0Jhc2U2NCAodWludDgpIHtcblx0XHR2YXIgaSxcblx0XHRcdGV4dHJhQnl0ZXMgPSB1aW50OC5sZW5ndGggJSAzLCAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuXHRcdFx0b3V0cHV0ID0gXCJcIixcblx0XHRcdHRlbXAsIGxlbmd0aFxuXG5cdFx0ZnVuY3Rpb24gZW5jb2RlIChudW0pIHtcblx0XHRcdHJldHVybiBsb29rdXAuY2hhckF0KG51bSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuXHRcdFx0cmV0dXJuIGVuY29kZShudW0gPj4gMTggJiAweDNGKSArIGVuY29kZShudW0gPj4gMTIgJiAweDNGKSArIGVuY29kZShudW0gPj4gNiAmIDB4M0YpICsgZW5jb2RlKG51bSAmIDB4M0YpXG5cdFx0fVxuXG5cdFx0Ly8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuXHRcdGZvciAoaSA9IDAsIGxlbmd0aCA9IHVpbnQ4Lmxlbmd0aCAtIGV4dHJhQnl0ZXM7IGkgPCBsZW5ndGg7IGkgKz0gMykge1xuXHRcdFx0dGVtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcblx0XHRcdG91dHB1dCArPSB0cmlwbGV0VG9CYXNlNjQodGVtcClcblx0XHR9XG5cblx0XHQvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG5cdFx0c3dpdGNoIChleHRyYUJ5dGVzKSB7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHRlbXAgPSB1aW50OFt1aW50OC5sZW5ndGggLSAxXVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPT0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXAgPSAodWludDhbdWludDgubGVuZ3RoIC0gMl0gPDwgOCkgKyAodWludDhbdWludDgubGVuZ3RoIC0gMV0pXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAxMClcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA+PiA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgMikgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dFxuXHR9XG5cblx0ZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5XG5cdGV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IHVpbnQ4VG9CYXNlNjRcbn0odHlwZW9mIGV4cG9ydHMgPT09ICd1bmRlZmluZWQnID8gKHRoaXMuYmFzZTY0anMgPSB7fSkgOiBleHBvcnRzKSlcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYi9iNjQuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYlwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTJcblxuLyoqXG4gKiBJZiBgQnVmZmVyLl91c2VUeXBlZEFycmF5c2A6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBVc2UgT2JqZWN0IGltcGxlbWVudGF0aW9uIChjb21wYXRpYmxlIGRvd24gdG8gSUU2KVxuICovXG5CdWZmZXIuX3VzZVR5cGVkQXJyYXlzID0gKGZ1bmN0aW9uICgpIHtcbiAgLy8gRGV0ZWN0IGlmIGJyb3dzZXIgc3VwcG9ydHMgVHlwZWQgQXJyYXlzLiBTdXBwb3J0ZWQgYnJvd3NlcnMgYXJlIElFIDEwKywgRmlyZWZveCA0KyxcbiAgLy8gQ2hyb21lIDcrLCBTYWZhcmkgNS4xKywgT3BlcmEgMTEuNissIGlPUyA0LjIrLiBJZiB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IGFkZGluZ1xuICAvLyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMsIHRoZW4gdGhhdCdzIHRoZSBzYW1lIGFzIG5vIGBVaW50OEFycmF5YCBzdXBwb3J0XG4gIC8vIGJlY2F1c2Ugd2UgbmVlZCB0byBiZSBhYmxlIHRvIGFkZCBhbGwgdGhlIG5vZGUgQnVmZmVyIEFQSSBtZXRob2RzLiBUaGlzIGlzIGFuIGlzc3VlXG4gIC8vIGluIEZpcmVmb3ggNC0yOS4gTm93IGZpeGVkOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzhcbiAgdHJ5IHtcbiAgICB2YXIgYnVmID0gbmV3IEFycmF5QnVmZmVyKDApXG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICBhcnIuZm9vID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfVxuICAgIHJldHVybiA0MiA9PT0gYXJyLmZvbygpICYmXG4gICAgICAgIHR5cGVvZiBhcnIuc3ViYXJyYXkgPT09ICdmdW5jdGlvbicgLy8gQ2hyb21lIDktMTAgbGFjayBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufSkoKVxuXG4vKipcbiAqIENsYXNzOiBCdWZmZXJcbiAqID09PT09PT09PT09PT1cbiAqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGFyZSBhdWdtZW50ZWRcbiAqIHdpdGggZnVuY3Rpb24gcHJvcGVydGllcyBmb3IgYWxsIHRoZSBub2RlIGBCdWZmZXJgIEFQSSBmdW5jdGlvbnMuIFdlIHVzZVxuICogYFVpbnQ4QXJyYXlgIHNvIHRoYXQgc3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXQgcmV0dXJuc1xuICogYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogQnkgYXVnbWVudGluZyB0aGUgaW5zdGFuY2VzLCB3ZSBjYW4gYXZvaWQgbW9kaWZ5aW5nIHRoZSBgVWludDhBcnJheWBcbiAqIHByb3RvdHlwZS5cbiAqL1xuZnVuY3Rpb24gQnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKVxuICAgIHJldHVybiBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pXG5cbiAgdmFyIHR5cGUgPSB0eXBlb2Ygc3ViamVjdFxuXG4gIC8vIFdvcmthcm91bmQ6IG5vZGUncyBiYXNlNjQgaW1wbGVtZW50YXRpb24gYWxsb3dzIGZvciBub24tcGFkZGVkIHN0cmluZ3NcbiAgLy8gd2hpbGUgYmFzZTY0LWpzIGRvZXMgbm90LlxuICBpZiAoZW5jb2RpbmcgPT09ICdiYXNlNjQnICYmIHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgc3ViamVjdCA9IHN0cmluZ3RyaW0oc3ViamVjdClcbiAgICB3aGlsZSAoc3ViamVjdC5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgICBzdWJqZWN0ID0gc3ViamVjdCArICc9J1xuICAgIH1cbiAgfVxuXG4gIC8vIEZpbmQgdGhlIGxlbmd0aFxuICB2YXIgbGVuZ3RoXG4gIGlmICh0eXBlID09PSAnbnVtYmVyJylcbiAgICBsZW5ndGggPSBjb2VyY2Uoc3ViamVjdClcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycpXG4gICAgbGVuZ3RoID0gQnVmZmVyLmJ5dGVMZW5ndGgoc3ViamVjdCwgZW5jb2RpbmcpXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnKVxuICAgIGxlbmd0aCA9IGNvZXJjZShzdWJqZWN0Lmxlbmd0aCkgLy8gYXNzdW1lIHRoYXQgb2JqZWN0IGlzIGFycmF5LWxpa2VcbiAgZWxzZVxuICAgIHRocm93IG5ldyBFcnJvcignRmlyc3QgYXJndW1lbnQgbmVlZHMgdG8gYmUgYSBudW1iZXIsIGFycmF5IG9yIHN0cmluZy4nKVxuXG4gIHZhciBidWZcbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICAvLyBQcmVmZXJyZWQ6IFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgYnVmID0gQnVmZmVyLl9hdWdtZW50KG5ldyBVaW50OEFycmF5KGxlbmd0aCkpXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBUSElTIGluc3RhbmNlIG9mIEJ1ZmZlciAoY3JlYXRlZCBieSBgbmV3YClcbiAgICBidWYgPSB0aGlzXG4gICAgYnVmLmxlbmd0aCA9IGxlbmd0aFxuICAgIGJ1Zi5faXNCdWZmZXIgPSB0cnVlXG4gIH1cblxuICB2YXIgaVxuICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cyAmJiB0eXBlb2Ygc3ViamVjdC5ieXRlTGVuZ3RoID09PSAnbnVtYmVyJykge1xuICAgIC8vIFNwZWVkIG9wdGltaXphdGlvbiAtLSB1c2Ugc2V0IGlmIHdlJ3JlIGNvcHlpbmcgZnJvbSBhIHR5cGVkIGFycmF5XG4gICAgYnVmLl9zZXQoc3ViamVjdClcbiAgfSBlbHNlIGlmIChpc0FycmF5aXNoKHN1YmplY3QpKSB7XG4gICAgLy8gVHJlYXQgYXJyYXktaXNoIG9iamVjdHMgYXMgYSBieXRlIGFycmF5XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpKVxuICAgICAgICBidWZbaV0gPSBzdWJqZWN0LnJlYWRVSW50OChpKVxuICAgICAgZWxzZVxuICAgICAgICBidWZbaV0gPSBzdWJqZWN0W2ldXG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgYnVmLndyaXRlKHN1YmplY3QsIDAsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdudW1iZXInICYmICFCdWZmZXIuX3VzZVR5cGVkQXJyYXlzICYmICFub1plcm8pIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGJ1ZltpXSA9IDBcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnVmXG59XG5cbi8vIFNUQVRJQyBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAncmF3JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gKGIpIHtcbiAgcmV0dXJuICEhKGIgIT09IG51bGwgJiYgYiAhPT0gdW5kZWZpbmVkICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uIChzdHIsIGVuY29kaW5nKSB7XG4gIHZhciByZXRcbiAgc3RyID0gc3RyICsgJydcbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAvIDJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAncmF3JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggKiAyXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIChsaXN0LCB0b3RhbExlbmd0aCkge1xuICBhc3NlcnQoaXNBcnJheShsaXN0KSwgJ1VzYWdlOiBCdWZmZXIuY29uY2F0KGxpc3QsIFt0b3RhbExlbmd0aF0pXFxuJyArXG4gICAgICAnbGlzdCBzaG91bGQgYmUgYW4gQXJyYXkuJylcblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcigwKVxuICB9IGVsc2UgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGxpc3RbMF1cbiAgfVxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdG90YWxMZW5ndGggIT09ICdudW1iZXInKSB7XG4gICAgdG90YWxMZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRvdGFsTGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIodG90YWxMZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXG4gICAgaXRlbS5jb3B5KGJ1ZiwgcG9zKVxuICAgIHBvcyArPSBpdGVtLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZcbn1cblxuLy8gQlVGRkVSIElOU1RBTkNFIE1FVEhPRFNcbi8vID09PT09PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIF9oZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIC8vIG11c3QgYmUgYW4gZXZlbiBudW1iZXIgb2YgZGlnaXRzXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGFzc2VydChzdHJMZW4gJSAyID09PSAwLCAnSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGJ5dGUgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgYXNzZXJ0KCFpc05hTihieXRlKSwgJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gYnl0ZVxuICB9XG4gIEJ1ZmZlci5fY2hhcnNXcml0dGVuID0gaSAqIDJcbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gX3V0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF9hc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IEJ1ZmZlci5fY2hhcnNXcml0dGVuID1cbiAgICBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF9iaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBfYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIF9iYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gX3V0ZjE2bGVXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gU3VwcG9ydCBib3RoIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZylcbiAgLy8gYW5kIHRoZSBsZWdhY3kgKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIGlmICghaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHsgIC8vIGxlZ2FjeVxuICAgIHZhciBzd2FwID0gZW5jb2RpbmdcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIG9mZnNldCA9IGxlbmd0aFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IF9oZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSBfdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIHJldCA9IF9hc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBfYmluYXJ5V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IF9iYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gX3V0ZjE2bGVXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG4gIHN0YXJ0ID0gTnVtYmVyKHN0YXJ0KSB8fCAwXG4gIGVuZCA9IChlbmQgIT09IHVuZGVmaW5lZClcbiAgICA/IE51bWJlcihlbmQpXG4gICAgOiBlbmQgPSBzZWxmLmxlbmd0aFxuXG4gIC8vIEZhc3RwYXRoIGVtcHR5IHN0cmluZ3NcbiAgaWYgKGVuZCA9PT0gc3RhcnQpXG4gICAgcmV0dXJuICcnXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IF9oZXhTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSBfdXRmOFNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIHJldCA9IF9hc2NpaVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBfYmluYXJ5U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IF9iYXNlNjRTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gX3V0ZjE2bGVTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICh0YXJnZXQsIHRhcmdldF9zdGFydCwgc3RhcnQsIGVuZCkge1xuICB2YXIgc291cmNlID0gdGhpc1xuXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICghdGFyZ2V0X3N0YXJ0KSB0YXJnZXRfc3RhcnQgPSAwXG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgc291cmNlLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBhc3NlcnQoZW5kID49IHN0YXJ0LCAnc291cmNlRW5kIDwgc291cmNlU3RhcnQnKVxuICBhc3NlcnQodGFyZ2V0X3N0YXJ0ID49IDAgJiYgdGFyZ2V0X3N0YXJ0IDwgdGFyZ2V0Lmxlbmd0aCxcbiAgICAgICd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgYXNzZXJ0KHN0YXJ0ID49IDAgJiYgc3RhcnQgPCBzb3VyY2UubGVuZ3RoLCAnc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChlbmQgPj0gMCAmJiBlbmQgPD0gc291cmNlLmxlbmd0aCwgJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpXG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgPCBlbmQgLSBzdGFydClcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0ICsgc3RhcnRcblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAobGVuIDwgMTAwIHx8ICFCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0X3N0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICB9IGVsc2Uge1xuICAgIHRhcmdldC5fc2V0KHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSwgdGFyZ2V0X3N0YXJ0KVxuICB9XG59XG5cbmZ1bmN0aW9uIF9iYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gX3V0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXMgPSAnJ1xuICB2YXIgdG1wID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgaWYgKGJ1ZltpXSA8PSAweDdGKSB7XG4gICAgICByZXMgKz0gZGVjb2RlVXRmOENoYXIodG1wKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICAgICAgdG1wID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgdG1wICs9ICclJyArIGJ1ZltpXS50b1N0cmluZygxNilcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzICsgZGVjb2RlVXRmOENoYXIodG1wKVxufVxuXG5mdW5jdGlvbiBfYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspXG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIF9iaW5hcnlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHJldHVybiBfYXNjaWlTbGljZShidWYsIHN0YXJ0LCBlbmQpXG59XG5cbmZ1bmN0aW9uIF9oZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIF91dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIGJ5dGVzW2krMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gY2xhbXAoc3RhcnQsIGxlbiwgMClcbiAgZW5kID0gY2xhbXAoZW5kLCBsZW4sIGxlbilcblxuICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIHJldHVybiBCdWZmZXIuX2F1Z21lbnQodGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIHZhciBuZXdCdWYgPSBuZXcgQnVmZmVyKHNsaWNlTGVuLCB1bmRlZmluZWQsIHRydWUpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzbGljZUxlbjsgaSsrKSB7XG4gICAgICBuZXdCdWZbaV0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gICAgcmV0dXJuIG5ld0J1ZlxuICB9XG59XG5cbi8vIGBnZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5nZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLnJlYWRVSW50OChvZmZzZXQpXG59XG5cbi8vIGBzZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uICh2LCBvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5zZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLndyaXRlVUludDgodiwgb2Zmc2V0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5mdW5jdGlvbiBfcmVhZFVJbnQxNiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWxcbiAgaWYgKGxpdHRsZUVuZGlhbikge1xuICAgIHZhbCA9IGJ1ZltvZmZzZXRdXG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdIDw8IDhcbiAgfSBlbHNlIHtcbiAgICB2YWwgPSBidWZbb2Zmc2V0XSA8PCA4XG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdXG4gIH1cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQxNih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRVSW50MzIgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsXG4gIGlmIChsaXR0bGVFbmRpYW4pIHtcbiAgICBpZiAob2Zmc2V0ICsgMiA8IGxlbilcbiAgICAgIHZhbCA9IGJ1ZltvZmZzZXQgKyAyXSA8PCAxNlxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXSA8PCA4XG4gICAgdmFsIHw9IGJ1ZltvZmZzZXRdXG4gICAgaWYgKG9mZnNldCArIDMgPCBsZW4pXG4gICAgICB2YWwgPSB2YWwgKyAoYnVmW29mZnNldCArIDNdIDw8IDI0ID4+PiAwKVxuICB9IGVsc2Uge1xuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsID0gYnVmW29mZnNldCArIDFdIDw8IDE2XG4gICAgaWYgKG9mZnNldCArIDIgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDJdIDw8IDhcbiAgICBpZiAob2Zmc2V0ICsgMyA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgM11cbiAgICB2YWwgPSB2YWwgKyAoYnVmW29mZnNldF0gPDwgMjQgPj4+IDApXG4gIH1cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQzMih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgdmFyIG5lZyA9IHRoaXNbb2Zmc2V0XSAmIDB4ODBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xXG4gIGVsc2VcbiAgICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbmZ1bmN0aW9uIF9yZWFkSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsID0gX3JlYWRVSW50MTYoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgdHJ1ZSlcbiAgdmFyIG5lZyA9IHZhbCAmIDB4ODAwMFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZmZmIC0gdmFsICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDE2KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZEludDMyIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbCA9IF9yZWFkVUludDMyKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIHRydWUpXG4gIHZhciBuZWcgPSB2YWwgJiAweDgwMDAwMDAwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmZmZmZmZmIC0gdmFsICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDMyKHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZEZsb2F0IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHJldHVybiBpZWVlNzU0LnJlYWQoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRGbG9hdCh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRmxvYXQodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkRG91YmxlIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgKyA3IDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHJldHVybiBpZWVlNzU0LnJlYWQoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRG91YmxlKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRG91YmxlKHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZilcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVyblxuXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG59XG5cbmZ1bmN0aW9uIF93cml0ZVVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmZmYpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGxlbiAtIG9mZnNldCwgMik7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPVxuICAgICAgICAodmFsdWUgJiAoMHhmZiA8PCAoOCAqIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpKSkpID4+PlxuICAgICAgICAgICAgKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkgKiA4XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmZmZmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihsZW4gLSBvZmZzZXQsIDQpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmLCAtMHg4MClcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgdGhpcy53cml0ZVVJbnQ4KHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgdGhpcy53cml0ZVVJbnQ4KDB4ZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2ZmZiwgLTB4ODAwMClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIF93cml0ZVVJbnQxNihidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG4gIGVsc2VcbiAgICBfd3JpdGVVSW50MTYoYnVmLCAweGZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICBfd3JpdGVVSW50MzIoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgX3dyaXRlVUludDMyKGJ1ZiwgMHhmZmZmZmZmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZJRUVFNzU0KHZhbHVlLCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsXG4gICAgICAgICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gZmlsbCh2YWx1ZSwgc3RhcnQ9MCwgZW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiAodmFsdWUsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCF2YWx1ZSkgdmFsdWUgPSAwXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCkgZW5kID0gdGhpcy5sZW5ndGhcblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHZhbHVlID0gdmFsdWUuY2hhckNvZGVBdCgwKVxuICB9XG5cbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgIWlzTmFOKHZhbHVlKSwgJ3ZhbHVlIGlzIG5vdCBhIG51bWJlcicpXG4gIGFzc2VydChlbmQgPj0gc3RhcnQsICdlbmQgPCBzdGFydCcpXG5cbiAgLy8gRmlsbCAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBhc3NlcnQoc3RhcnQgPj0gMCAmJiBzdGFydCA8IHRoaXMubGVuZ3RoLCAnc3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChlbmQgPj0gMCAmJiBlbmQgPD0gdGhpcy5sZW5ndGgsICdlbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICB0aGlzW2ldID0gdmFsdWVcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBvdXQgPSBbXVxuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIG91dFtpXSA9IHRvSGV4KHRoaXNbaV0pXG4gICAgaWYgKGkgPT09IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMpIHtcbiAgICAgIG91dFtpICsgMV0gPSAnLi4uJ1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBvdXQuam9pbignICcpICsgJz4nXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBgQXJyYXlCdWZmZXJgIHdpdGggdGhlICpjb3BpZWQqIG1lbW9yeSBvZiB0aGUgYnVmZmVyIGluc3RhbmNlLlxuICogQWRkZWQgaW4gTm9kZSAwLjEyLiBPbmx5IGF2YWlsYWJsZSBpbiBicm93c2VycyB0aGF0IHN1cHBvcnQgQXJyYXlCdWZmZXIuXG4gKi9cbkJ1ZmZlci5wcm90b3R5cGUudG9BcnJheUJ1ZmZlciA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgICByZXR1cm4gKG5ldyBCdWZmZXIodGhpcykpLmJ1ZmZlclxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5sZW5ndGgpXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKVxuICAgICAgICBidWZbaV0gPSB0aGlzW2ldXG4gICAgICByZXR1cm4gYnVmLmJ1ZmZlclxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0J1ZmZlci50b0FycmF5QnVmZmVyIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyJylcbiAgfVxufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIHN0cmluZ3RyaW0gKHN0cikge1xuICBpZiAoc3RyLnRyaW0pIHJldHVybiBzdHIudHJpbSgpXG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpXG59XG5cbnZhciBCUCA9IEJ1ZmZlci5wcm90b3R5cGVcblxuLyoqXG4gKiBBdWdtZW50IGEgVWludDhBcnJheSAqaW5zdGFuY2UqIChub3QgdGhlIFVpbnQ4QXJyYXkgY2xhc3MhKSB3aXRoIEJ1ZmZlciBtZXRob2RzXG4gKi9cbkJ1ZmZlci5fYXVnbWVudCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgYXJyLl9pc0J1ZmZlciA9IHRydWVcblxuICAvLyBzYXZlIHJlZmVyZW5jZSB0byBvcmlnaW5hbCBVaW50OEFycmF5IGdldC9zZXQgbWV0aG9kcyBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgYXJyLl9nZXQgPSBhcnIuZ2V0XG4gIGFyci5fc2V0ID0gYXJyLnNldFxuXG4gIC8vIGRlcHJlY2F0ZWQsIHdpbGwgYmUgcmVtb3ZlZCBpbiBub2RlIDAuMTMrXG4gIGFyci5nZXQgPSBCUC5nZXRcbiAgYXJyLnNldCA9IEJQLnNldFxuXG4gIGFyci53cml0ZSA9IEJQLndyaXRlXG4gIGFyci50b1N0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0xvY2FsZVN0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0pTT04gPSBCUC50b0pTT05cbiAgYXJyLmNvcHkgPSBCUC5jb3B5XG4gIGFyci5zbGljZSA9IEJQLnNsaWNlXG4gIGFyci5yZWFkVUludDggPSBCUC5yZWFkVUludDhcbiAgYXJyLnJlYWRVSW50MTZMRSA9IEJQLnJlYWRVSW50MTZMRVxuICBhcnIucmVhZFVJbnQxNkJFID0gQlAucmVhZFVJbnQxNkJFXG4gIGFyci5yZWFkVUludDMyTEUgPSBCUC5yZWFkVUludDMyTEVcbiAgYXJyLnJlYWRVSW50MzJCRSA9IEJQLnJlYWRVSW50MzJCRVxuICBhcnIucmVhZEludDggPSBCUC5yZWFkSW50OFxuICBhcnIucmVhZEludDE2TEUgPSBCUC5yZWFkSW50MTZMRVxuICBhcnIucmVhZEludDE2QkUgPSBCUC5yZWFkSW50MTZCRVxuICBhcnIucmVhZEludDMyTEUgPSBCUC5yZWFkSW50MzJMRVxuICBhcnIucmVhZEludDMyQkUgPSBCUC5yZWFkSW50MzJCRVxuICBhcnIucmVhZEZsb2F0TEUgPSBCUC5yZWFkRmxvYXRMRVxuICBhcnIucmVhZEZsb2F0QkUgPSBCUC5yZWFkRmxvYXRCRVxuICBhcnIucmVhZERvdWJsZUxFID0gQlAucmVhZERvdWJsZUxFXG4gIGFyci5yZWFkRG91YmxlQkUgPSBCUC5yZWFkRG91YmxlQkVcbiAgYXJyLndyaXRlVUludDggPSBCUC53cml0ZVVJbnQ4XG4gIGFyci53cml0ZVVJbnQxNkxFID0gQlAud3JpdGVVSW50MTZMRVxuICBhcnIud3JpdGVVSW50MTZCRSA9IEJQLndyaXRlVUludDE2QkVcbiAgYXJyLndyaXRlVUludDMyTEUgPSBCUC53cml0ZVVJbnQzMkxFXG4gIGFyci53cml0ZVVJbnQzMkJFID0gQlAud3JpdGVVSW50MzJCRVxuICBhcnIud3JpdGVJbnQ4ID0gQlAud3JpdGVJbnQ4XG4gIGFyci53cml0ZUludDE2TEUgPSBCUC53cml0ZUludDE2TEVcbiAgYXJyLndyaXRlSW50MTZCRSA9IEJQLndyaXRlSW50MTZCRVxuICBhcnIud3JpdGVJbnQzMkxFID0gQlAud3JpdGVJbnQzMkxFXG4gIGFyci53cml0ZUludDMyQkUgPSBCUC53cml0ZUludDMyQkVcbiAgYXJyLndyaXRlRmxvYXRMRSA9IEJQLndyaXRlRmxvYXRMRVxuICBhcnIud3JpdGVGbG9hdEJFID0gQlAud3JpdGVGbG9hdEJFXG4gIGFyci53cml0ZURvdWJsZUxFID0gQlAud3JpdGVEb3VibGVMRVxuICBhcnIud3JpdGVEb3VibGVCRSA9IEJQLndyaXRlRG91YmxlQkVcbiAgYXJyLmZpbGwgPSBCUC5maWxsXG4gIGFyci5pbnNwZWN0ID0gQlAuaW5zcGVjdFxuICBhcnIudG9BcnJheUJ1ZmZlciA9IEJQLnRvQXJyYXlCdWZmZXJcblxuICByZXR1cm4gYXJyXG59XG5cbi8vIHNsaWNlKHN0YXJ0LCBlbmQpXG5mdW5jdGlvbiBjbGFtcCAoaW5kZXgsIGxlbiwgZGVmYXVsdFZhbHVlKSB7XG4gIGlmICh0eXBlb2YgaW5kZXggIT09ICdudW1iZXInKSByZXR1cm4gZGVmYXVsdFZhbHVlXG4gIGluZGV4ID0gfn5pbmRleDsgIC8vIENvZXJjZSB0byBpbnRlZ2VyLlxuICBpZiAoaW5kZXggPj0gbGVuKSByZXR1cm4gbGVuXG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4gaW5kZXhcbiAgaW5kZXggKz0gbGVuXG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4gaW5kZXhcbiAgcmV0dXJuIDBcbn1cblxuZnVuY3Rpb24gY29lcmNlIChsZW5ndGgpIHtcbiAgLy8gQ29lcmNlIGxlbmd0aCB0byBhIG51bWJlciAocG9zc2libHkgTmFOKSwgcm91bmQgdXBcbiAgLy8gaW4gY2FzZSBpdCdzIGZyYWN0aW9uYWwgKGUuZy4gMTIzLjQ1NikgdGhlbiBkbyBhXG4gIC8vIGRvdWJsZSBuZWdhdGUgdG8gY29lcmNlIGEgTmFOIHRvIDAuIEVhc3ksIHJpZ2h0P1xuICBsZW5ndGggPSB+fk1hdGguY2VpbCgrbGVuZ3RoKVxuICByZXR1cm4gbGVuZ3RoIDwgMCA/IDAgOiBsZW5ndGhcbn1cblxuZnVuY3Rpb24gaXNBcnJheSAoc3ViamVjdCkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHN1YmplY3QpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN1YmplY3QpID09PSAnW29iamVjdCBBcnJheV0nXG4gIH0pKHN1YmplY3QpXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlpc2ggKHN1YmplY3QpIHtcbiAgcmV0dXJuIGlzQXJyYXkoc3ViamVjdCkgfHwgQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpIHx8XG4gICAgICBzdWJqZWN0ICYmIHR5cGVvZiBzdWJqZWN0ID09PSAnb2JqZWN0JyAmJlxuICAgICAgdHlwZW9mIHN1YmplY3QubGVuZ3RoID09PSAnbnVtYmVyJ1xufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGIgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGlmIChiIDw9IDB4N0YpXG4gICAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSlcbiAgICBlbHNlIHtcbiAgICAgIHZhciBzdGFydCA9IGlcbiAgICAgIGlmIChiID49IDB4RDgwMCAmJiBiIDw9IDB4REZGRikgaSsrXG4gICAgICB2YXIgaCA9IGVuY29kZVVSSUNvbXBvbmVudChzdHIuc2xpY2Uoc3RhcnQsIGkrMSkpLnN1YnN0cigxKS5zcGxpdCgnJScpXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGgubGVuZ3RoOyBqKyspXG4gICAgICAgIGJ5dGVBcnJheS5wdXNoKHBhcnNlSW50KGhbal0sIDE2KSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoc3RyKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIHBvc1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKVxuICAgICAgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiBkZWNvZGVVdGY4Q2hhciAoc3RyKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzdHIpXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4RkZGRCkgLy8gVVRGIDggaW52YWxpZCBjaGFyXG4gIH1cbn1cblxuLypcbiAqIFdlIGhhdmUgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIHZhbHVlIGlzIGEgdmFsaWQgaW50ZWdlci4gVGhpcyBtZWFucyB0aGF0IGl0XG4gKiBpcyBub24tbmVnYXRpdmUuIEl0IGhhcyBubyBmcmFjdGlvbmFsIGNvbXBvbmVudCBhbmQgdGhhdCBpdCBkb2VzIG5vdFxuICogZXhjZWVkIHRoZSBtYXhpbXVtIGFsbG93ZWQgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIHZlcmlmdWludCAodmFsdWUsIG1heCkge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPj0gMCwgJ3NwZWNpZmllZCBhIG5lZ2F0aXZlIHZhbHVlIGZvciB3cml0aW5nIGFuIHVuc2lnbmVkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGlzIGxhcmdlciB0aGFuIG1heGltdW0gdmFsdWUgZm9yIHR5cGUnKVxuICBhc3NlcnQoTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlLCAndmFsdWUgaGFzIGEgZnJhY3Rpb25hbCBjb21wb25lbnQnKVxufVxuXG5mdW5jdGlvbiB2ZXJpZnNpbnQgKHZhbHVlLCBtYXgsIG1pbikge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgbGFyZ2VyIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlID49IG1pbiwgJ3ZhbHVlIHNtYWxsZXIgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUnKVxuICBhc3NlcnQoTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlLCAndmFsdWUgaGFzIGEgZnJhY3Rpb25hbCBjb21wb25lbnQnKVxufVxuXG5mdW5jdGlvbiB2ZXJpZklFRUU3NTQgKHZhbHVlLCBtYXgsIG1pbikge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgbGFyZ2VyIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlID49IG1pbiwgJ3ZhbHVlIHNtYWxsZXIgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUnKVxufVxuXG5mdW5jdGlvbiBhc3NlcnQgKHRlc3QsIG1lc3NhZ2UpIHtcbiAgaWYgKCF0ZXN0KSB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSB8fCAnRmFpbGVkIGFzc2VydGlvbicpXG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9idWZmZXJcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5cbi8vIGRvIG5vdCBlZGl0IC5qcyBmaWxlcyBkaXJlY3RseSAtIGVkaXQgc3JjL2luZGV4LmpzdFxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBlcXVhbChhLCBiKSB7XG4gIGlmIChhID09PSBiKSByZXR1cm4gdHJ1ZTtcblxuICBpZiAoYSAmJiBiICYmIHR5cGVvZiBhID09ICdvYmplY3QnICYmIHR5cGVvZiBiID09ICdvYmplY3QnKSB7XG4gICAgaWYgKGEuY29uc3RydWN0b3IgIT09IGIuY29uc3RydWN0b3IpIHJldHVybiBmYWxzZTtcblxuICAgIHZhciBsZW5ndGgsIGksIGtleXM7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYSkpIHtcbiAgICAgIGxlbmd0aCA9IGEubGVuZ3RoO1xuICAgICAgaWYgKGxlbmd0aCAhPSBiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gIT09IDA7KVxuICAgICAgICBpZiAoIWVxdWFsKGFbaV0sIGJbaV0pKSByZXR1cm4gZmFsc2U7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cblxuXG4gICAgaWYgKGEuY29uc3RydWN0b3IgPT09IFJlZ0V4cCkgcmV0dXJuIGEuc291cmNlID09PSBiLnNvdXJjZSAmJiBhLmZsYWdzID09PSBiLmZsYWdzO1xuICAgIGlmIChhLnZhbHVlT2YgIT09IE9iamVjdC5wcm90b3R5cGUudmFsdWVPZikgcmV0dXJuIGEudmFsdWVPZigpID09PSBiLnZhbHVlT2YoKTtcbiAgICBpZiAoYS50b1N0cmluZyAhPT0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZykgcmV0dXJuIGEudG9TdHJpbmcoKSA9PT0gYi50b1N0cmluZygpO1xuXG4gICAga2V5cyA9IE9iamVjdC5rZXlzKGEpO1xuICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIGlmIChsZW5ndGggIT09IE9iamVjdC5rZXlzKGIpLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gIT09IDA7KVxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwga2V5c1tpXSkpIHJldHVybiBmYWxzZTtcblxuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tICE9PSAwOykge1xuICAgICAgdmFyIGtleSA9IGtleXNbaV07XG5cbiAgICAgIGlmICghZXF1YWwoYVtrZXldLCBiW2tleV0pKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyB0cnVlIGlmIGJvdGggTmFOLCBmYWxzZSBvdGhlcndpc2VcbiAgcmV0dXJuIGEhPT1hICYmIGIhPT1iO1xufTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvZmFzdC1kZWVwLWVxdWFsL2luZGV4LmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Zhc3QtZGVlcC1lcXVhbFwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZGF0YSwgb3B0cykge1xuICAgIGlmICghb3B0cykgb3B0cyA9IHt9O1xuICAgIGlmICh0eXBlb2Ygb3B0cyA9PT0gJ2Z1bmN0aW9uJykgb3B0cyA9IHsgY21wOiBvcHRzIH07XG4gICAgdmFyIGN5Y2xlcyA9ICh0eXBlb2Ygb3B0cy5jeWNsZXMgPT09ICdib29sZWFuJykgPyBvcHRzLmN5Y2xlcyA6IGZhbHNlO1xuXG4gICAgdmFyIGNtcCA9IG9wdHMuY21wICYmIChmdW5jdGlvbiAoZikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgIHZhciBhb2JqID0geyBrZXk6IGEsIHZhbHVlOiBub2RlW2FdIH07XG4gICAgICAgICAgICAgICAgdmFyIGJvYmogPSB7IGtleTogYiwgdmFsdWU6IG5vZGVbYl0gfTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZihhb2JqLCBib2JqKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgfSkob3B0cy5jbXApO1xuXG4gICAgdmFyIHNlZW4gPSBbXTtcbiAgICByZXR1cm4gKGZ1bmN0aW9uIHN0cmluZ2lmeSAobm9kZSkge1xuICAgICAgICBpZiAobm9kZSAmJiBub2RlLnRvSlNPTiAmJiB0eXBlb2Ygbm9kZS50b0pTT04gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIG5vZGUgPSBub2RlLnRvSlNPTigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUgPT0gJ251bWJlcicpIHJldHVybiBpc0Zpbml0ZShub2RlKSA/ICcnICsgbm9kZSA6ICdudWxsJztcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlICE9PSAnb2JqZWN0JykgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG5vZGUpO1xuXG4gICAgICAgIHZhciBpLCBvdXQ7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSB7XG4gICAgICAgICAgICBvdXQgPSAnWyc7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbm9kZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpKSBvdXQgKz0gJywnO1xuICAgICAgICAgICAgICAgIG91dCArPSBzdHJpbmdpZnkobm9kZVtpXSkgfHwgJ251bGwnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG91dCArICddJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChub2RlID09PSBudWxsKSByZXR1cm4gJ251bGwnO1xuXG4gICAgICAgIGlmIChzZWVuLmluZGV4T2Yobm9kZSkgIT09IC0xKSB7XG4gICAgICAgICAgICBpZiAoY3ljbGVzKSByZXR1cm4gSlNPTi5zdHJpbmdpZnkoJ19fY3ljbGVfXycpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ29udmVydGluZyBjaXJjdWxhciBzdHJ1Y3R1cmUgdG8gSlNPTicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHNlZW5JbmRleCA9IHNlZW4ucHVzaChub2RlKSAtIDE7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMobm9kZSkuc29ydChjbXAgJiYgY21wKG5vZGUpKTtcbiAgICAgICAgb3V0ID0gJyc7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHN0cmluZ2lmeShub2RlW2tleV0pO1xuXG4gICAgICAgICAgICBpZiAoIXZhbHVlKSBjb250aW51ZTtcbiAgICAgICAgICAgIGlmIChvdXQpIG91dCArPSAnLCc7XG4gICAgICAgICAgICBvdXQgKz0gSlNPTi5zdHJpbmdpZnkoa2V5KSArICc6JyArIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHNlZW4uc3BsaWNlKHNlZW5JbmRleCwgMSk7XG4gICAgICAgIHJldHVybiAneycgKyBvdXQgKyAnfSc7XG4gICAgfSkoZGF0YSk7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9mYXN0LWpzb24tc3RhYmxlLXN0cmluZ2lmeS9pbmRleC5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9mYXN0LWpzb24tc3RhYmxlLXN0cmluZ2lmeVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbmV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtXG4gIHZhciBlTGVuID0gKG5CeXRlcyAqIDgpIC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBuQml0cyA9IC03XG4gIHZhciBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDBcbiAgdmFyIGQgPSBpc0xFID8gLTEgOiAxXG4gIHZhciBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gKGUgKiAyNTYpICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgZSA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gbUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gKG0gKiAyNTYpICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgY1xuICB2YXIgZUxlbiA9IChuQnl0ZXMgKiA4KSAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApXG4gIHZhciBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSlcbiAgdmFyIGQgPSBpc0xFID8gMSA6IC0xXG4gIHZhciBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwXG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSlcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMFxuICAgIGUgPSBlTWF4XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpXG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tXG4gICAgICBjICo9IDJcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGNcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpXG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrXG4gICAgICBjIC89IDJcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwXG4gICAgICBlID0gZU1heFxuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAoKHZhbHVlICogYykgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9pZWVlNzU0XCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdHJhdmVyc2UgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzY2hlbWEsIG9wdHMsIGNiKSB7XG4gIC8vIExlZ2FjeSBzdXBwb3J0IGZvciB2MC4zLjEgYW5kIGVhcmxpZXIuXG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBvcHRzO1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIGNiID0gb3B0cy5jYiB8fCBjYjtcbiAgdmFyIHByZSA9ICh0eXBlb2YgY2IgPT0gJ2Z1bmN0aW9uJykgPyBjYiA6IGNiLnByZSB8fCBmdW5jdGlvbigpIHt9O1xuICB2YXIgcG9zdCA9IGNiLnBvc3QgfHwgZnVuY3Rpb24oKSB7fTtcblxuICBfdHJhdmVyc2Uob3B0cywgcHJlLCBwb3N0LCBzY2hlbWEsICcnLCBzY2hlbWEpO1xufTtcblxuXG50cmF2ZXJzZS5rZXl3b3JkcyA9IHtcbiAgYWRkaXRpb25hbEl0ZW1zOiB0cnVlLFxuICBpdGVtczogdHJ1ZSxcbiAgY29udGFpbnM6IHRydWUsXG4gIGFkZGl0aW9uYWxQcm9wZXJ0aWVzOiB0cnVlLFxuICBwcm9wZXJ0eU5hbWVzOiB0cnVlLFxuICBub3Q6IHRydWVcbn07XG5cbnRyYXZlcnNlLmFycmF5S2V5d29yZHMgPSB7XG4gIGl0ZW1zOiB0cnVlLFxuICBhbGxPZjogdHJ1ZSxcbiAgYW55T2Y6IHRydWUsXG4gIG9uZU9mOiB0cnVlXG59O1xuXG50cmF2ZXJzZS5wcm9wc0tleXdvcmRzID0ge1xuICBkZWZpbml0aW9uczogdHJ1ZSxcbiAgcHJvcGVydGllczogdHJ1ZSxcbiAgcGF0dGVyblByb3BlcnRpZXM6IHRydWUsXG4gIGRlcGVuZGVuY2llczogdHJ1ZVxufTtcblxudHJhdmVyc2Uuc2tpcEtleXdvcmRzID0ge1xuICBkZWZhdWx0OiB0cnVlLFxuICBlbnVtOiB0cnVlLFxuICBjb25zdDogdHJ1ZSxcbiAgcmVxdWlyZWQ6IHRydWUsXG4gIG1heGltdW06IHRydWUsXG4gIG1pbmltdW06IHRydWUsXG4gIGV4Y2x1c2l2ZU1heGltdW06IHRydWUsXG4gIGV4Y2x1c2l2ZU1pbmltdW06IHRydWUsXG4gIG11bHRpcGxlT2Y6IHRydWUsXG4gIG1heExlbmd0aDogdHJ1ZSxcbiAgbWluTGVuZ3RoOiB0cnVlLFxuICBwYXR0ZXJuOiB0cnVlLFxuICBmb3JtYXQ6IHRydWUsXG4gIG1heEl0ZW1zOiB0cnVlLFxuICBtaW5JdGVtczogdHJ1ZSxcbiAgdW5pcXVlSXRlbXM6IHRydWUsXG4gIG1heFByb3BlcnRpZXM6IHRydWUsXG4gIG1pblByb3BlcnRpZXM6IHRydWVcbn07XG5cblxuZnVuY3Rpb24gX3RyYXZlcnNlKG9wdHMsIHByZSwgcG9zdCwgc2NoZW1hLCBqc29uUHRyLCByb290U2NoZW1hLCBwYXJlbnRKc29uUHRyLCBwYXJlbnRLZXl3b3JkLCBwYXJlbnRTY2hlbWEsIGtleUluZGV4KSB7XG4gIGlmIChzY2hlbWEgJiYgdHlwZW9mIHNjaGVtYSA9PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShzY2hlbWEpKSB7XG4gICAgcHJlKHNjaGVtYSwganNvblB0ciwgcm9vdFNjaGVtYSwgcGFyZW50SnNvblB0ciwgcGFyZW50S2V5d29yZCwgcGFyZW50U2NoZW1hLCBrZXlJbmRleCk7XG4gICAgZm9yICh2YXIga2V5IGluIHNjaGVtYSkge1xuICAgICAgdmFyIHNjaCA9IHNjaGVtYVtrZXldO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc2NoKSkge1xuICAgICAgICBpZiAoa2V5IGluIHRyYXZlcnNlLmFycmF5S2V5d29yZHMpIHtcbiAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8c2NoLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgX3RyYXZlcnNlKG9wdHMsIHByZSwgcG9zdCwgc2NoW2ldLCBqc29uUHRyICsgJy8nICsga2V5ICsgJy8nICsgaSwgcm9vdFNjaGVtYSwganNvblB0ciwga2V5LCBzY2hlbWEsIGkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGtleSBpbiB0cmF2ZXJzZS5wcm9wc0tleXdvcmRzKSB7XG4gICAgICAgIGlmIChzY2ggJiYgdHlwZW9mIHNjaCA9PSAnb2JqZWN0Jykge1xuICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gc2NoKVxuICAgICAgICAgICAgX3RyYXZlcnNlKG9wdHMsIHByZSwgcG9zdCwgc2NoW3Byb3BdLCBqc29uUHRyICsgJy8nICsga2V5ICsgJy8nICsgZXNjYXBlSnNvblB0cihwcm9wKSwgcm9vdFNjaGVtYSwganNvblB0ciwga2V5LCBzY2hlbWEsIHByb3ApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGtleSBpbiB0cmF2ZXJzZS5rZXl3b3JkcyB8fCAob3B0cy5hbGxLZXlzICYmICEoa2V5IGluIHRyYXZlcnNlLnNraXBLZXl3b3JkcykpKSB7XG4gICAgICAgIF90cmF2ZXJzZShvcHRzLCBwcmUsIHBvc3QsIHNjaCwganNvblB0ciArICcvJyArIGtleSwgcm9vdFNjaGVtYSwganNvblB0ciwga2V5LCBzY2hlbWEpO1xuICAgICAgfVxuICAgIH1cbiAgICBwb3N0KHNjaGVtYSwganNvblB0ciwgcm9vdFNjaGVtYSwgcGFyZW50SnNvblB0ciwgcGFyZW50S2V5d29yZCwgcGFyZW50U2NoZW1hLCBrZXlJbmRleCk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBlc2NhcGVKc29uUHRyKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL34vZywgJ34wJykucmVwbGFjZSgvXFwvL2csICd+MScpO1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9qc29uLXNjaGVtYS10cmF2ZXJzZS9pbmRleC5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9qc29uLXNjaGVtYS10cmF2ZXJzZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvcHJvY2Vzc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qKiBAbGljZW5zZSBVUkkuanMgdjQuNC4xIChjKSAyMDExIEdhcnkgQ291cnQuIExpY2Vuc2U6IGh0dHA6Ly9naXRodWIuY29tL2dhcnljb3VydC91cmktanMgKi9cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcblx0KGZhY3RvcnkoKGdsb2JhbC5VUkkgPSBnbG9iYWwuVVJJIHx8IHt9KSkpO1xufSh0aGlzLCAoZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBtZXJnZSgpIHtcbiAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgc2V0cyA9IEFycmF5KF9sZW4pLCBfa2V5ID0gMDsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgICBzZXRzW19rZXldID0gYXJndW1lbnRzW19rZXldO1xuICAgIH1cblxuICAgIGlmIChzZXRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgc2V0c1swXSA9IHNldHNbMF0uc2xpY2UoMCwgLTEpO1xuICAgICAgICB2YXIgeGwgPSBzZXRzLmxlbmd0aCAtIDE7XG4gICAgICAgIGZvciAodmFyIHggPSAxOyB4IDwgeGw7ICsreCkge1xuICAgICAgICAgICAgc2V0c1t4XSA9IHNldHNbeF0uc2xpY2UoMSwgLTEpO1xuICAgICAgICB9XG4gICAgICAgIHNldHNbeGxdID0gc2V0c1t4bF0uc2xpY2UoMSk7XG4gICAgICAgIHJldHVybiBzZXRzLmpvaW4oJycpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzZXRzWzBdO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHN1YmV4cChzdHIpIHtcbiAgICByZXR1cm4gXCIoPzpcIiArIHN0ciArIFwiKVwiO1xufVxuZnVuY3Rpb24gdHlwZU9mKG8pIHtcbiAgICByZXR1cm4gbyA9PT0gdW5kZWZpbmVkID8gXCJ1bmRlZmluZWRcIiA6IG8gPT09IG51bGwgPyBcIm51bGxcIiA6IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKS5zcGxpdChcIiBcIikucG9wKCkuc3BsaXQoXCJdXCIpLnNoaWZ0KCkudG9Mb3dlckNhc2UoKTtcbn1cbmZ1bmN0aW9uIHRvVXBwZXJDYXNlKHN0cikge1xuICAgIHJldHVybiBzdHIudG9VcHBlckNhc2UoKTtcbn1cbmZ1bmN0aW9uIHRvQXJyYXkob2JqKSB7XG4gICAgcmV0dXJuIG9iaiAhPT0gdW5kZWZpbmVkICYmIG9iaiAhPT0gbnVsbCA/IG9iaiBpbnN0YW5jZW9mIEFycmF5ID8gb2JqIDogdHlwZW9mIG9iai5sZW5ndGggIT09IFwibnVtYmVyXCIgfHwgb2JqLnNwbGl0IHx8IG9iai5zZXRJbnRlcnZhbCB8fCBvYmouY2FsbCA/IFtvYmpdIDogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwob2JqKSA6IFtdO1xufVxuZnVuY3Rpb24gYXNzaWduKHRhcmdldCwgc291cmNlKSB7XG4gICAgdmFyIG9iaiA9IHRhcmdldDtcbiAgICBpZiAoc291cmNlKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIG9ialtrZXldID0gc291cmNlW2tleV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gYnVpbGRFeHBzKGlzSVJJKSB7XG4gICAgdmFyIEFMUEhBJCQgPSBcIltBLVphLXpdXCIsXG4gICAgICAgIENSJCA9IFwiW1xcXFx4MERdXCIsXG4gICAgICAgIERJR0lUJCQgPSBcIlswLTldXCIsXG4gICAgICAgIERRVU9URSQkID0gXCJbXFxcXHgyMl1cIixcbiAgICAgICAgSEVYRElHJCQgPSBtZXJnZShESUdJVCQkLCBcIltBLUZhLWZdXCIpLFxuICAgICAgICAvL2Nhc2UtaW5zZW5zaXRpdmVcbiAgICBMRiQkID0gXCJbXFxcXHgwQV1cIixcbiAgICAgICAgU1AkJCA9IFwiW1xcXFx4MjBdXCIsXG4gICAgICAgIFBDVF9FTkNPREVEJCA9IHN1YmV4cChzdWJleHAoXCIlW0VGZWZdXCIgKyBIRVhESUckJCArIFwiJVwiICsgSEVYRElHJCQgKyBIRVhESUckJCArIFwiJVwiICsgSEVYRElHJCQgKyBIRVhESUckJCkgKyBcInxcIiArIHN1YmV4cChcIiVbODlBLUZhLWZdXCIgKyBIRVhESUckJCArIFwiJVwiICsgSEVYRElHJCQgKyBIRVhESUckJCkgKyBcInxcIiArIHN1YmV4cChcIiVcIiArIEhFWERJRyQkICsgSEVYRElHJCQpKSxcbiAgICAgICAgLy9leHBhbmRlZFxuICAgIEdFTl9ERUxJTVMkJCA9IFwiW1xcXFw6XFxcXC9cXFxcP1xcXFwjXFxcXFtcXFxcXVxcXFxAXVwiLFxuICAgICAgICBTVUJfREVMSU1TJCQgPSBcIltcXFxcIVxcXFwkXFxcXCZcXFxcJ1xcXFwoXFxcXClcXFxcKlxcXFwrXFxcXCxcXFxcO1xcXFw9XVwiLFxuICAgICAgICBSRVNFUlZFRCQkID0gbWVyZ2UoR0VOX0RFTElNUyQkLCBTVUJfREVMSU1TJCQpLFxuICAgICAgICBVQ1NDSEFSJCQgPSBpc0lSSSA/IFwiW1xcXFx4QTAtXFxcXHUyMDBEXFxcXHUyMDEwLVxcXFx1MjAyOVxcXFx1MjAyRi1cXFxcdUQ3RkZcXFxcdUY5MDAtXFxcXHVGRENGXFxcXHVGREYwLVxcXFx1RkZFRl1cIiA6IFwiW11cIixcbiAgICAgICAgLy9zdWJzZXQsIGV4Y2x1ZGVzIGJpZGkgY29udHJvbCBjaGFyYWN0ZXJzXG4gICAgSVBSSVZBVEUkJCA9IGlzSVJJID8gXCJbXFxcXHVFMDAwLVxcXFx1RjhGRl1cIiA6IFwiW11cIixcbiAgICAgICAgLy9zdWJzZXRcbiAgICBVTlJFU0VSVkVEJCQgPSBtZXJnZShBTFBIQSQkLCBESUdJVCQkLCBcIltcXFxcLVxcXFwuXFxcXF9cXFxcfl1cIiwgVUNTQ0hBUiQkKSxcbiAgICAgICAgU0NIRU1FJCA9IHN1YmV4cChBTFBIQSQkICsgbWVyZ2UoQUxQSEEkJCwgRElHSVQkJCwgXCJbXFxcXCtcXFxcLVxcXFwuXVwiKSArIFwiKlwiKSxcbiAgICAgICAgVVNFUklORk8kID0gc3ViZXhwKHN1YmV4cChQQ1RfRU5DT0RFRCQgKyBcInxcIiArIG1lcmdlKFVOUkVTRVJWRUQkJCwgU1VCX0RFTElNUyQkLCBcIltcXFxcOl1cIikpICsgXCIqXCIpLFxuICAgICAgICBERUNfT0NURVQkID0gc3ViZXhwKHN1YmV4cChcIjI1WzAtNV1cIikgKyBcInxcIiArIHN1YmV4cChcIjJbMC00XVwiICsgRElHSVQkJCkgKyBcInxcIiArIHN1YmV4cChcIjFcIiArIERJR0lUJCQgKyBESUdJVCQkKSArIFwifFwiICsgc3ViZXhwKFwiWzEtOV1cIiArIERJR0lUJCQpICsgXCJ8XCIgKyBESUdJVCQkKSxcbiAgICAgICAgREVDX09DVEVUX1JFTEFYRUQkID0gc3ViZXhwKHN1YmV4cChcIjI1WzAtNV1cIikgKyBcInxcIiArIHN1YmV4cChcIjJbMC00XVwiICsgRElHSVQkJCkgKyBcInxcIiArIHN1YmV4cChcIjFcIiArIERJR0lUJCQgKyBESUdJVCQkKSArIFwifFwiICsgc3ViZXhwKFwiMD9bMS05XVwiICsgRElHSVQkJCkgKyBcInwwPzA/XCIgKyBESUdJVCQkKSxcbiAgICAgICAgLy9yZWxheGVkIHBhcnNpbmcgcnVsZXNcbiAgICBJUFY0QUREUkVTUyQgPSBzdWJleHAoREVDX09DVEVUX1JFTEFYRUQkICsgXCJcXFxcLlwiICsgREVDX09DVEVUX1JFTEFYRUQkICsgXCJcXFxcLlwiICsgREVDX09DVEVUX1JFTEFYRUQkICsgXCJcXFxcLlwiICsgREVDX09DVEVUX1JFTEFYRUQkKSxcbiAgICAgICAgSDE2JCA9IHN1YmV4cChIRVhESUckJCArIFwiezEsNH1cIiksXG4gICAgICAgIExTMzIkID0gc3ViZXhwKHN1YmV4cChIMTYkICsgXCJcXFxcOlwiICsgSDE2JCkgKyBcInxcIiArIElQVjRBRERSRVNTJCksXG4gICAgICAgIElQVjZBRERSRVNTMSQgPSBzdWJleHAoc3ViZXhwKEgxNiQgKyBcIlxcXFw6XCIpICsgXCJ7Nn1cIiArIExTMzIkKSxcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICA2KCBoMTYgXCI6XCIgKSBsczMyXG4gICAgSVBWNkFERFJFU1MyJCA9IHN1YmV4cChcIlxcXFw6XFxcXDpcIiArIHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezV9XCIgKyBMUzMyJCksXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgIFwiOjpcIiA1KCBoMTYgXCI6XCIgKSBsczMyXG4gICAgSVBWNkFERFJFU1MzJCA9IHN1YmV4cChzdWJleHAoSDE2JCkgKyBcIj9cXFxcOlxcXFw6XCIgKyBzdWJleHAoSDE2JCArIFwiXFxcXDpcIikgKyBcIns0fVwiICsgTFMzMiQpLFxuICAgICAgICAvL1sgICAgICAgICAgICAgICBoMTYgXSBcIjo6XCIgNCggaDE2IFwiOlwiICkgbHMzMlxuICAgIElQVjZBRERSRVNTNCQgPSBzdWJleHAoc3ViZXhwKHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezAsMX1cIiArIEgxNiQpICsgXCI/XFxcXDpcXFxcOlwiICsgc3ViZXhwKEgxNiQgKyBcIlxcXFw6XCIpICsgXCJ7M31cIiArIExTMzIkKSxcbiAgICAgICAgLy9bICoxKCBoMTYgXCI6XCIgKSBoMTYgXSBcIjo6XCIgMyggaDE2IFwiOlwiICkgbHMzMlxuICAgIElQVjZBRERSRVNTNSQgPSBzdWJleHAoc3ViZXhwKHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezAsMn1cIiArIEgxNiQpICsgXCI/XFxcXDpcXFxcOlwiICsgc3ViZXhwKEgxNiQgKyBcIlxcXFw6XCIpICsgXCJ7Mn1cIiArIExTMzIkKSxcbiAgICAgICAgLy9bICoyKCBoMTYgXCI6XCIgKSBoMTYgXSBcIjo6XCIgMiggaDE2IFwiOlwiICkgbHMzMlxuICAgIElQVjZBRERSRVNTNiQgPSBzdWJleHAoc3ViZXhwKHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezAsM31cIiArIEgxNiQpICsgXCI/XFxcXDpcXFxcOlwiICsgSDE2JCArIFwiXFxcXDpcIiArIExTMzIkKSxcbiAgICAgICAgLy9bICozKCBoMTYgXCI6XCIgKSBoMTYgXSBcIjo6XCIgICAgaDE2IFwiOlwiICAgbHMzMlxuICAgIElQVjZBRERSRVNTNyQgPSBzdWJleHAoc3ViZXhwKHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezAsNH1cIiArIEgxNiQpICsgXCI/XFxcXDpcXFxcOlwiICsgTFMzMiQpLFxuICAgICAgICAvL1sgKjQoIGgxNiBcIjpcIiApIGgxNiBdIFwiOjpcIiAgICAgICAgICAgICAgbHMzMlxuICAgIElQVjZBRERSRVNTOCQgPSBzdWJleHAoc3ViZXhwKHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezAsNX1cIiArIEgxNiQpICsgXCI/XFxcXDpcXFxcOlwiICsgSDE2JCksXG4gICAgICAgIC8vWyAqNSggaDE2IFwiOlwiICkgaDE2IF0gXCI6OlwiICAgICAgICAgICAgICBoMTZcbiAgICBJUFY2QUREUkVTUzkkID0gc3ViZXhwKHN1YmV4cChzdWJleHAoSDE2JCArIFwiXFxcXDpcIikgKyBcInswLDZ9XCIgKyBIMTYkKSArIFwiP1xcXFw6XFxcXDpcIiksXG4gICAgICAgIC8vWyAqNiggaDE2IFwiOlwiICkgaDE2IF0gXCI6OlwiXG4gICAgSVBWNkFERFJFU1MkID0gc3ViZXhwKFtJUFY2QUREUkVTUzEkLCBJUFY2QUREUkVTUzIkLCBJUFY2QUREUkVTUzMkLCBJUFY2QUREUkVTUzQkLCBJUFY2QUREUkVTUzUkLCBJUFY2QUREUkVTUzYkLCBJUFY2QUREUkVTUzckLCBJUFY2QUREUkVTUzgkLCBJUFY2QUREUkVTUzkkXS5qb2luKFwifFwiKSksXG4gICAgICAgIFpPTkVJRCQgPSBzdWJleHAoc3ViZXhwKFVOUkVTRVJWRUQkJCArIFwifFwiICsgUENUX0VOQ09ERUQkKSArIFwiK1wiKSxcbiAgICAgICAgLy9SRkMgNjg3NFxuICAgIElQVjZBRERSWiQgPSBzdWJleHAoSVBWNkFERFJFU1MkICsgXCJcXFxcJTI1XCIgKyBaT05FSUQkKSxcbiAgICAgICAgLy9SRkMgNjg3NFxuICAgIElQVjZBRERSWl9SRUxBWEVEJCA9IHN1YmV4cChJUFY2QUREUkVTUyQgKyBzdWJleHAoXCJcXFxcJTI1fFxcXFwlKD8hXCIgKyBIRVhESUckJCArIFwiezJ9KVwiKSArIFpPTkVJRCQpLFxuICAgICAgICAvL1JGQyA2ODc0LCB3aXRoIHJlbGF4ZWQgcGFyc2luZyBydWxlc1xuICAgIElQVkZVVFVSRSQgPSBzdWJleHAoXCJbdlZdXCIgKyBIRVhESUckJCArIFwiK1xcXFwuXCIgKyBtZXJnZShVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCwgXCJbXFxcXDpdXCIpICsgXCIrXCIpLFxuICAgICAgICBJUF9MSVRFUkFMJCA9IHN1YmV4cChcIlxcXFxbXCIgKyBzdWJleHAoSVBWNkFERFJaX1JFTEFYRUQkICsgXCJ8XCIgKyBJUFY2QUREUkVTUyQgKyBcInxcIiArIElQVkZVVFVSRSQpICsgXCJcXFxcXVwiKSxcbiAgICAgICAgLy9SRkMgNjg3NFxuICAgIFJFR19OQU1FJCA9IHN1YmV4cChzdWJleHAoUENUX0VOQ09ERUQkICsgXCJ8XCIgKyBtZXJnZShVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCkpICsgXCIqXCIpLFxuICAgICAgICBIT1NUJCA9IHN1YmV4cChJUF9MSVRFUkFMJCArIFwifFwiICsgSVBWNEFERFJFU1MkICsgXCIoPyFcIiArIFJFR19OQU1FJCArIFwiKVwiICsgXCJ8XCIgKyBSRUdfTkFNRSQpLFxuICAgICAgICBQT1JUJCA9IHN1YmV4cChESUdJVCQkICsgXCIqXCIpLFxuICAgICAgICBBVVRIT1JJVFkkID0gc3ViZXhwKHN1YmV4cChVU0VSSU5GTyQgKyBcIkBcIikgKyBcIj9cIiArIEhPU1QkICsgc3ViZXhwKFwiXFxcXDpcIiArIFBPUlQkKSArIFwiP1wiKSxcbiAgICAgICAgUENIQVIkID0gc3ViZXhwKFBDVF9FTkNPREVEJCArIFwifFwiICsgbWVyZ2UoVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQsIFwiW1xcXFw6XFxcXEBdXCIpKSxcbiAgICAgICAgU0VHTUVOVCQgPSBzdWJleHAoUENIQVIkICsgXCIqXCIpLFxuICAgICAgICBTRUdNRU5UX05aJCA9IHN1YmV4cChQQ0hBUiQgKyBcIitcIiksXG4gICAgICAgIFNFR01FTlRfTlpfTkMkID0gc3ViZXhwKHN1YmV4cChQQ1RfRU5DT0RFRCQgKyBcInxcIiArIG1lcmdlKFVOUkVTRVJWRUQkJCwgU1VCX0RFTElNUyQkLCBcIltcXFxcQF1cIikpICsgXCIrXCIpLFxuICAgICAgICBQQVRIX0FCRU1QVFkkID0gc3ViZXhwKHN1YmV4cChcIlxcXFwvXCIgKyBTRUdNRU5UJCkgKyBcIipcIiksXG4gICAgICAgIFBBVEhfQUJTT0xVVEUkID0gc3ViZXhwKFwiXFxcXC9cIiArIHN1YmV4cChTRUdNRU5UX05aJCArIFBBVEhfQUJFTVBUWSQpICsgXCI/XCIpLFxuICAgICAgICAvL3NpbXBsaWZpZWRcbiAgICBQQVRIX05PU0NIRU1FJCA9IHN1YmV4cChTRUdNRU5UX05aX05DJCArIFBBVEhfQUJFTVBUWSQpLFxuICAgICAgICAvL3NpbXBsaWZpZWRcbiAgICBQQVRIX1JPT1RMRVNTJCA9IHN1YmV4cChTRUdNRU5UX05aJCArIFBBVEhfQUJFTVBUWSQpLFxuICAgICAgICAvL3NpbXBsaWZpZWRcbiAgICBQQVRIX0VNUFRZJCA9IFwiKD8hXCIgKyBQQ0hBUiQgKyBcIilcIixcbiAgICAgICAgUEFUSCQgPSBzdWJleHAoUEFUSF9BQkVNUFRZJCArIFwifFwiICsgUEFUSF9BQlNPTFVURSQgKyBcInxcIiArIFBBVEhfTk9TQ0hFTUUkICsgXCJ8XCIgKyBQQVRIX1JPT1RMRVNTJCArIFwifFwiICsgUEFUSF9FTVBUWSQpLFxuICAgICAgICBRVUVSWSQgPSBzdWJleHAoc3ViZXhwKFBDSEFSJCArIFwifFwiICsgbWVyZ2UoXCJbXFxcXC9cXFxcP11cIiwgSVBSSVZBVEUkJCkpICsgXCIqXCIpLFxuICAgICAgICBGUkFHTUVOVCQgPSBzdWJleHAoc3ViZXhwKFBDSEFSJCArIFwifFtcXFxcL1xcXFw/XVwiKSArIFwiKlwiKSxcbiAgICAgICAgSElFUl9QQVJUJCA9IHN1YmV4cChzdWJleHAoXCJcXFxcL1xcXFwvXCIgKyBBVVRIT1JJVFkkICsgUEFUSF9BQkVNUFRZJCkgKyBcInxcIiArIFBBVEhfQUJTT0xVVEUkICsgXCJ8XCIgKyBQQVRIX1JPT1RMRVNTJCArIFwifFwiICsgUEFUSF9FTVBUWSQpLFxuICAgICAgICBVUkkkID0gc3ViZXhwKFNDSEVNRSQgKyBcIlxcXFw6XCIgKyBISUVSX1BBUlQkICsgc3ViZXhwKFwiXFxcXD9cIiArIFFVRVJZJCkgKyBcIj9cIiArIHN1YmV4cChcIlxcXFwjXCIgKyBGUkFHTUVOVCQpICsgXCI/XCIpLFxuICAgICAgICBSRUxBVElWRV9QQVJUJCA9IHN1YmV4cChzdWJleHAoXCJcXFxcL1xcXFwvXCIgKyBBVVRIT1JJVFkkICsgUEFUSF9BQkVNUFRZJCkgKyBcInxcIiArIFBBVEhfQUJTT0xVVEUkICsgXCJ8XCIgKyBQQVRIX05PU0NIRU1FJCArIFwifFwiICsgUEFUSF9FTVBUWSQpLFxuICAgICAgICBSRUxBVElWRSQgPSBzdWJleHAoUkVMQVRJVkVfUEFSVCQgKyBzdWJleHAoXCJcXFxcP1wiICsgUVVFUlkkKSArIFwiP1wiICsgc3ViZXhwKFwiXFxcXCNcIiArIEZSQUdNRU5UJCkgKyBcIj9cIiksXG4gICAgICAgIFVSSV9SRUZFUkVOQ0UkID0gc3ViZXhwKFVSSSQgKyBcInxcIiArIFJFTEFUSVZFJCksXG4gICAgICAgIEFCU09MVVRFX1VSSSQgPSBzdWJleHAoU0NIRU1FJCArIFwiXFxcXDpcIiArIEhJRVJfUEFSVCQgKyBzdWJleHAoXCJcXFxcP1wiICsgUVVFUlkkKSArIFwiP1wiKSxcbiAgICAgICAgR0VORVJJQ19SRUYkID0gXCJeKFwiICsgU0NIRU1FJCArIFwiKVxcXFw6XCIgKyBzdWJleHAoc3ViZXhwKFwiXFxcXC9cXFxcLyhcIiArIHN1YmV4cChcIihcIiArIFVTRVJJTkZPJCArIFwiKUBcIikgKyBcIj8oXCIgKyBIT1NUJCArIFwiKVwiICsgc3ViZXhwKFwiXFxcXDooXCIgKyBQT1JUJCArIFwiKVwiKSArIFwiPylcIikgKyBcIj8oXCIgKyBQQVRIX0FCRU1QVFkkICsgXCJ8XCIgKyBQQVRIX0FCU09MVVRFJCArIFwifFwiICsgUEFUSF9ST09UTEVTUyQgKyBcInxcIiArIFBBVEhfRU1QVFkkICsgXCIpXCIpICsgc3ViZXhwKFwiXFxcXD8oXCIgKyBRVUVSWSQgKyBcIilcIikgKyBcIj9cIiArIHN1YmV4cChcIlxcXFwjKFwiICsgRlJBR01FTlQkICsgXCIpXCIpICsgXCI/JFwiLFxuICAgICAgICBSRUxBVElWRV9SRUYkID0gXCJeKCl7MH1cIiArIHN1YmV4cChzdWJleHAoXCJcXFxcL1xcXFwvKFwiICsgc3ViZXhwKFwiKFwiICsgVVNFUklORk8kICsgXCIpQFwiKSArIFwiPyhcIiArIEhPU1QkICsgXCIpXCIgKyBzdWJleHAoXCJcXFxcOihcIiArIFBPUlQkICsgXCIpXCIpICsgXCI/KVwiKSArIFwiPyhcIiArIFBBVEhfQUJFTVBUWSQgKyBcInxcIiArIFBBVEhfQUJTT0xVVEUkICsgXCJ8XCIgKyBQQVRIX05PU0NIRU1FJCArIFwifFwiICsgUEFUSF9FTVBUWSQgKyBcIilcIikgKyBzdWJleHAoXCJcXFxcPyhcIiArIFFVRVJZJCArIFwiKVwiKSArIFwiP1wiICsgc3ViZXhwKFwiXFxcXCMoXCIgKyBGUkFHTUVOVCQgKyBcIilcIikgKyBcIj8kXCIsXG4gICAgICAgIEFCU09MVVRFX1JFRiQgPSBcIl4oXCIgKyBTQ0hFTUUkICsgXCIpXFxcXDpcIiArIHN1YmV4cChzdWJleHAoXCJcXFxcL1xcXFwvKFwiICsgc3ViZXhwKFwiKFwiICsgVVNFUklORk8kICsgXCIpQFwiKSArIFwiPyhcIiArIEhPU1QkICsgXCIpXCIgKyBzdWJleHAoXCJcXFxcOihcIiArIFBPUlQkICsgXCIpXCIpICsgXCI/KVwiKSArIFwiPyhcIiArIFBBVEhfQUJFTVBUWSQgKyBcInxcIiArIFBBVEhfQUJTT0xVVEUkICsgXCJ8XCIgKyBQQVRIX1JPT1RMRVNTJCArIFwifFwiICsgUEFUSF9FTVBUWSQgKyBcIilcIikgKyBzdWJleHAoXCJcXFxcPyhcIiArIFFVRVJZJCArIFwiKVwiKSArIFwiPyRcIixcbiAgICAgICAgU0FNRURPQ19SRUYkID0gXCJeXCIgKyBzdWJleHAoXCJcXFxcIyhcIiArIEZSQUdNRU5UJCArIFwiKVwiKSArIFwiPyRcIixcbiAgICAgICAgQVVUSE9SSVRZX1JFRiQgPSBcIl5cIiArIHN1YmV4cChcIihcIiArIFVTRVJJTkZPJCArIFwiKUBcIikgKyBcIj8oXCIgKyBIT1NUJCArIFwiKVwiICsgc3ViZXhwKFwiXFxcXDooXCIgKyBQT1JUJCArIFwiKVwiKSArIFwiPyRcIjtcbiAgICByZXR1cm4ge1xuICAgICAgICBOT1RfU0NIRU1FOiBuZXcgUmVnRXhwKG1lcmdlKFwiW15dXCIsIEFMUEhBJCQsIERJR0lUJCQsIFwiW1xcXFwrXFxcXC1cXFxcLl1cIiksIFwiZ1wiKSxcbiAgICAgICAgTk9UX1VTRVJJTkZPOiBuZXcgUmVnRXhwKG1lcmdlKFwiW15cXFxcJVxcXFw6XVwiLCBVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCksIFwiZ1wiKSxcbiAgICAgICAgTk9UX0hPU1Q6IG5ldyBSZWdFeHAobWVyZ2UoXCJbXlxcXFwlXFxcXFtcXFxcXVxcXFw6XVwiLCBVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCksIFwiZ1wiKSxcbiAgICAgICAgTk9UX1BBVEg6IG5ldyBSZWdFeHAobWVyZ2UoXCJbXlxcXFwlXFxcXC9cXFxcOlxcXFxAXVwiLCBVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCksIFwiZ1wiKSxcbiAgICAgICAgTk9UX1BBVEhfTk9TQ0hFTUU6IG5ldyBSZWdFeHAobWVyZ2UoXCJbXlxcXFwlXFxcXC9cXFxcQF1cIiwgVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQpLCBcImdcIiksXG4gICAgICAgIE5PVF9RVUVSWTogbmV3IFJlZ0V4cChtZXJnZShcIlteXFxcXCVdXCIsIFVOUkVTRVJWRUQkJCwgU1VCX0RFTElNUyQkLCBcIltcXFxcOlxcXFxAXFxcXC9cXFxcP11cIiwgSVBSSVZBVEUkJCksIFwiZ1wiKSxcbiAgICAgICAgTk9UX0ZSQUdNRU5UOiBuZXcgUmVnRXhwKG1lcmdlKFwiW15cXFxcJV1cIiwgVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQsIFwiW1xcXFw6XFxcXEBcXFxcL1xcXFw/XVwiKSwgXCJnXCIpLFxuICAgICAgICBFU0NBUEU6IG5ldyBSZWdFeHAobWVyZ2UoXCJbXl1cIiwgVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQpLCBcImdcIiksXG4gICAgICAgIFVOUkVTRVJWRUQ6IG5ldyBSZWdFeHAoVU5SRVNFUlZFRCQkLCBcImdcIiksXG4gICAgICAgIE9USEVSX0NIQVJTOiBuZXcgUmVnRXhwKG1lcmdlKFwiW15cXFxcJV1cIiwgVU5SRVNFUlZFRCQkLCBSRVNFUlZFRCQkKSwgXCJnXCIpLFxuICAgICAgICBQQ1RfRU5DT0RFRDogbmV3IFJlZ0V4cChQQ1RfRU5DT0RFRCQsIFwiZ1wiKSxcbiAgICAgICAgSVBWNEFERFJFU1M6IG5ldyBSZWdFeHAoXCJeKFwiICsgSVBWNEFERFJFU1MkICsgXCIpJFwiKSxcbiAgICAgICAgSVBWNkFERFJFU1M6IG5ldyBSZWdFeHAoXCJeXFxcXFs/KFwiICsgSVBWNkFERFJFU1MkICsgXCIpXCIgKyBzdWJleHAoc3ViZXhwKFwiXFxcXCUyNXxcXFxcJSg/IVwiICsgSEVYRElHJCQgKyBcInsyfSlcIikgKyBcIihcIiArIFpPTkVJRCQgKyBcIilcIikgKyBcIj9cXFxcXT8kXCIpIC8vUkZDIDY4NzQsIHdpdGggcmVsYXhlZCBwYXJzaW5nIHJ1bGVzXG4gICAgfTtcbn1cbnZhciBVUklfUFJPVE9DT0wgPSBidWlsZEV4cHMoZmFsc2UpO1xuXG52YXIgSVJJX1BST1RPQ09MID0gYnVpbGRFeHBzKHRydWUpO1xuXG52YXIgc2xpY2VkVG9BcnJheSA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gc2xpY2VJdGVyYXRvcihhcnIsIGkpIHtcbiAgICB2YXIgX2FyciA9IFtdO1xuICAgIHZhciBfbiA9IHRydWU7XG4gICAgdmFyIF9kID0gZmFsc2U7XG4gICAgdmFyIF9lID0gdW5kZWZpbmVkO1xuXG4gICAgdHJ5IHtcbiAgICAgIGZvciAodmFyIF9pID0gYXJyW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3M7ICEoX24gPSAoX3MgPSBfaS5uZXh0KCkpLmRvbmUpOyBfbiA9IHRydWUpIHtcbiAgICAgICAgX2Fyci5wdXNoKF9zLnZhbHVlKTtcblxuICAgICAgICBpZiAoaSAmJiBfYXJyLmxlbmd0aCA9PT0gaSkgYnJlYWs7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBfZCA9IHRydWU7XG4gICAgICBfZSA9IGVycjtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKCFfbiAmJiBfaVtcInJldHVyblwiXSkgX2lbXCJyZXR1cm5cIl0oKTtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGlmIChfZCkgdGhyb3cgX2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIF9hcnI7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gKGFyciwgaSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGFycikpIHtcbiAgICAgIHJldHVybiBhcnI7XG4gICAgfSBlbHNlIGlmIChTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KGFycikpIHtcbiAgICAgIHJldHVybiBzbGljZUl0ZXJhdG9yKGFyciwgaSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIGF0dGVtcHQgdG8gZGVzdHJ1Y3R1cmUgbm9uLWl0ZXJhYmxlIGluc3RhbmNlXCIpO1xuICAgIH1cbiAgfTtcbn0oKTtcblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxudmFyIHRvQ29uc3VtYWJsZUFycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGFycjIgPSBBcnJheShhcnIubGVuZ3RoKTsgaSA8IGFyci5sZW5ndGg7IGkrKykgYXJyMltpXSA9IGFycltpXTtcblxuICAgIHJldHVybiBhcnIyO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBBcnJheS5mcm9tKGFycik7XG4gIH1cbn07XG5cbi8qKiBIaWdoZXN0IHBvc2l0aXZlIHNpZ25lZCAzMi1iaXQgZmxvYXQgdmFsdWUgKi9cblxudmFyIG1heEludCA9IDIxNDc0ODM2NDc7IC8vIGFrYS4gMHg3RkZGRkZGRiBvciAyXjMxLTFcblxuLyoqIEJvb3RzdHJpbmcgcGFyYW1ldGVycyAqL1xudmFyIGJhc2UgPSAzNjtcbnZhciB0TWluID0gMTtcbnZhciB0TWF4ID0gMjY7XG52YXIgc2tldyA9IDM4O1xudmFyIGRhbXAgPSA3MDA7XG52YXIgaW5pdGlhbEJpYXMgPSA3MjtcbnZhciBpbml0aWFsTiA9IDEyODsgLy8gMHg4MFxudmFyIGRlbGltaXRlciA9ICctJzsgLy8gJ1xceDJEJ1xuXG4vKiogUmVndWxhciBleHByZXNzaW9ucyAqL1xudmFyIHJlZ2V4UHVueWNvZGUgPSAvXnhuLS0vO1xudmFyIHJlZ2V4Tm9uQVNDSUkgPSAvW15cXDAtXFx4N0VdLzsgLy8gbm9uLUFTQ0lJIGNoYXJzXG52YXIgcmVnZXhTZXBhcmF0b3JzID0gL1tcXHgyRVxcdTMwMDJcXHVGRjBFXFx1RkY2MV0vZzsgLy8gUkZDIDM0OTAgc2VwYXJhdG9yc1xuXG4vKiogRXJyb3IgbWVzc2FnZXMgKi9cbnZhciBlcnJvcnMgPSB7XG5cdCdvdmVyZmxvdyc6ICdPdmVyZmxvdzogaW5wdXQgbmVlZHMgd2lkZXIgaW50ZWdlcnMgdG8gcHJvY2VzcycsXG5cdCdub3QtYmFzaWMnOiAnSWxsZWdhbCBpbnB1dCA+PSAweDgwIChub3QgYSBiYXNpYyBjb2RlIHBvaW50KScsXG5cdCdpbnZhbGlkLWlucHV0JzogJ0ludmFsaWQgaW5wdXQnXG59O1xuXG4vKiogQ29udmVuaWVuY2Ugc2hvcnRjdXRzICovXG52YXIgYmFzZU1pbnVzVE1pbiA9IGJhc2UgLSB0TWluO1xudmFyIGZsb29yID0gTWF0aC5mbG9vcjtcbnZhciBzdHJpbmdGcm9tQ2hhckNvZGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlO1xuXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuLyoqXG4gKiBBIGdlbmVyaWMgZXJyb3IgdXRpbGl0eSBmdW5jdGlvbi5cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBUaGUgZXJyb3IgdHlwZS5cbiAqIEByZXR1cm5zIHtFcnJvcn0gVGhyb3dzIGEgYFJhbmdlRXJyb3JgIHdpdGggdGhlIGFwcGxpY2FibGUgZXJyb3IgbWVzc2FnZS5cbiAqL1xuZnVuY3Rpb24gZXJyb3IkMSh0eXBlKSB7XG5cdHRocm93IG5ldyBSYW5nZUVycm9yKGVycm9yc1t0eXBlXSk7XG59XG5cbi8qKlxuICogQSBnZW5lcmljIGBBcnJheSNtYXBgIHV0aWxpdHkgZnVuY3Rpb24uXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGZvciBldmVyeSBhcnJheVxuICogaXRlbS5cbiAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgYXJyYXkgb2YgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gbWFwKGFycmF5LCBmbikge1xuXHR2YXIgcmVzdWx0ID0gW107XG5cdHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG5cdHdoaWxlIChsZW5ndGgtLSkge1xuXHRcdHJlc3VsdFtsZW5ndGhdID0gZm4oYXJyYXlbbGVuZ3RoXSk7XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBBIHNpbXBsZSBgQXJyYXkjbWFwYC1saWtlIHdyYXBwZXIgdG8gd29yayB3aXRoIGRvbWFpbiBuYW1lIHN0cmluZ3Mgb3IgZW1haWxcbiAqIGFkZHJlc3Nlcy5cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZSBvciBlbWFpbCBhZGRyZXNzLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5XG4gKiBjaGFyYWN0ZXIuXG4gKiBAcmV0dXJucyB7QXJyYXl9IEEgbmV3IHN0cmluZyBvZiBjaGFyYWN0ZXJzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFja1xuICogZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIG1hcERvbWFpbihzdHJpbmcsIGZuKSB7XG5cdHZhciBwYXJ0cyA9IHN0cmluZy5zcGxpdCgnQCcpO1xuXHR2YXIgcmVzdWx0ID0gJyc7XG5cdGlmIChwYXJ0cy5sZW5ndGggPiAxKSB7XG5cdFx0Ly8gSW4gZW1haWwgYWRkcmVzc2VzLCBvbmx5IHRoZSBkb21haW4gbmFtZSBzaG91bGQgYmUgcHVueWNvZGVkLiBMZWF2ZVxuXHRcdC8vIHRoZSBsb2NhbCBwYXJ0IChpLmUuIGV2ZXJ5dGhpbmcgdXAgdG8gYEBgKSBpbnRhY3QuXG5cdFx0cmVzdWx0ID0gcGFydHNbMF0gKyAnQCc7XG5cdFx0c3RyaW5nID0gcGFydHNbMV07XG5cdH1cblx0Ly8gQXZvaWQgYHNwbGl0KHJlZ2V4KWAgZm9yIElFOCBjb21wYXRpYmlsaXR5LiBTZWUgIzE3LlxuXHRzdHJpbmcgPSBzdHJpbmcucmVwbGFjZShyZWdleFNlcGFyYXRvcnMsICdcXHgyRScpO1xuXHR2YXIgbGFiZWxzID0gc3RyaW5nLnNwbGl0KCcuJyk7XG5cdHZhciBlbmNvZGVkID0gbWFwKGxhYmVscywgZm4pLmpvaW4oJy4nKTtcblx0cmV0dXJuIHJlc3VsdCArIGVuY29kZWQ7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhcnJheSBjb250YWluaW5nIHRoZSBudW1lcmljIGNvZGUgcG9pbnRzIG9mIGVhY2ggVW5pY29kZVxuICogY2hhcmFjdGVyIGluIHRoZSBzdHJpbmcuIFdoaWxlIEphdmFTY3JpcHQgdXNlcyBVQ1MtMiBpbnRlcm5hbGx5LFxuICogdGhpcyBmdW5jdGlvbiB3aWxsIGNvbnZlcnQgYSBwYWlyIG9mIHN1cnJvZ2F0ZSBoYWx2ZXMgKGVhY2ggb2Ygd2hpY2hcbiAqIFVDUy0yIGV4cG9zZXMgYXMgc2VwYXJhdGUgY2hhcmFjdGVycykgaW50byBhIHNpbmdsZSBjb2RlIHBvaW50LFxuICogbWF0Y2hpbmcgVVRGLTE2LlxuICogQHNlZSBgcHVueWNvZGUudWNzMi5lbmNvZGVgXG4gKiBAc2VlIDxodHRwczovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cbiAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG4gKiBAbmFtZSBkZWNvZGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmcgVGhlIFVuaWNvZGUgaW5wdXQgc3RyaW5nIChVQ1MtMikuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBuZXcgYXJyYXkgb2YgY29kZSBwb2ludHMuXG4gKi9cbmZ1bmN0aW9uIHVjczJkZWNvZGUoc3RyaW5nKSB7XG5cdHZhciBvdXRwdXQgPSBbXTtcblx0dmFyIGNvdW50ZXIgPSAwO1xuXHR2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcblx0d2hpbGUgKGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHR2YXIgdmFsdWUgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdGlmICh2YWx1ZSA+PSAweEQ4MDAgJiYgdmFsdWUgPD0gMHhEQkZGICYmIGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdC8vIEl0J3MgYSBoaWdoIHN1cnJvZ2F0ZSwgYW5kIHRoZXJlIGlzIGEgbmV4dCBjaGFyYWN0ZXIuXG5cdFx0XHR2YXIgZXh0cmEgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdFx0aWYgKChleHRyYSAmIDB4RkMwMCkgPT0gMHhEQzAwKSB7XG5cdFx0XHRcdC8vIExvdyBzdXJyb2dhdGUuXG5cdFx0XHRcdG91dHB1dC5wdXNoKCgodmFsdWUgJiAweDNGRikgPDwgMTApICsgKGV4dHJhICYgMHgzRkYpICsgMHgxMDAwMCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBJdCdzIGFuIHVubWF0Y2hlZCBzdXJyb2dhdGU7IG9ubHkgYXBwZW5kIHRoaXMgY29kZSB1bml0LCBpbiBjYXNlIHRoZVxuXHRcdFx0XHQvLyBuZXh0IGNvZGUgdW5pdCBpcyB0aGUgaGlnaCBzdXJyb2dhdGUgb2YgYSBzdXJyb2dhdGUgcGFpci5cblx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0XHRjb3VudGVyLS07XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIG91dHB1dDtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgc3RyaW5nIGJhc2VkIG9uIGFuIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG4gKiBAc2VlIGBwdW55Y29kZS51Y3MyLmRlY29kZWBcbiAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG4gKiBAbmFtZSBlbmNvZGVcbiAqIEBwYXJhbSB7QXJyYXl9IGNvZGVQb2ludHMgVGhlIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgbmV3IFVuaWNvZGUgc3RyaW5nIChVQ1MtMikuXG4gKi9cbnZhciB1Y3MyZW5jb2RlID0gZnVuY3Rpb24gdWNzMmVuY29kZShhcnJheSkge1xuXHRyZXR1cm4gU3RyaW5nLmZyb21Db2RlUG9pbnQuYXBwbHkoU3RyaW5nLCB0b0NvbnN1bWFibGVBcnJheShhcnJheSkpO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIGJhc2ljIGNvZGUgcG9pbnQgaW50byBhIGRpZ2l0L2ludGVnZXIuXG4gKiBAc2VlIGBkaWdpdFRvQmFzaWMoKWBcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge051bWJlcn0gY29kZVBvaW50IFRoZSBiYXNpYyBudW1lcmljIGNvZGUgcG9pbnQgdmFsdWUuXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgbnVtZXJpYyB2YWx1ZSBvZiBhIGJhc2ljIGNvZGUgcG9pbnQgKGZvciB1c2UgaW5cbiAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaW4gdGhlIHJhbmdlIGAwYCB0byBgYmFzZSAtIDFgLCBvciBgYmFzZWAgaWZcbiAqIHRoZSBjb2RlIHBvaW50IGRvZXMgbm90IHJlcHJlc2VudCBhIHZhbHVlLlxuICovXG52YXIgYmFzaWNUb0RpZ2l0ID0gZnVuY3Rpb24gYmFzaWNUb0RpZ2l0KGNvZGVQb2ludCkge1xuXHRpZiAoY29kZVBvaW50IC0gMHgzMCA8IDB4MEEpIHtcblx0XHRyZXR1cm4gY29kZVBvaW50IC0gMHgxNjtcblx0fVxuXHRpZiAoY29kZVBvaW50IC0gMHg0MSA8IDB4MUEpIHtcblx0XHRyZXR1cm4gY29kZVBvaW50IC0gMHg0MTtcblx0fVxuXHRpZiAoY29kZVBvaW50IC0gMHg2MSA8IDB4MUEpIHtcblx0XHRyZXR1cm4gY29kZVBvaW50IC0gMHg2MTtcblx0fVxuXHRyZXR1cm4gYmFzZTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgYSBkaWdpdC9pbnRlZ2VyIGludG8gYSBiYXNpYyBjb2RlIHBvaW50LlxuICogQHNlZSBgYmFzaWNUb0RpZ2l0KClgXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtOdW1iZXJ9IGRpZ2l0IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludC5cbiAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBiYXNpYyBjb2RlIHBvaW50IHdob3NlIHZhbHVlICh3aGVuIHVzZWQgZm9yXG4gKiByZXByZXNlbnRpbmcgaW50ZWdlcnMpIGlzIGBkaWdpdGAsIHdoaWNoIG5lZWRzIHRvIGJlIGluIHRoZSByYW5nZVxuICogYDBgIHRvIGBiYXNlIC0gMWAuIElmIGBmbGFnYCBpcyBub24temVybywgdGhlIHVwcGVyY2FzZSBmb3JtIGlzXG4gKiB1c2VkOyBlbHNlLCB0aGUgbG93ZXJjYXNlIGZvcm0gaXMgdXNlZC4gVGhlIGJlaGF2aW9yIGlzIHVuZGVmaW5lZFxuICogaWYgYGZsYWdgIGlzIG5vbi16ZXJvIGFuZCBgZGlnaXRgIGhhcyBubyB1cHBlcmNhc2UgZm9ybS5cbiAqL1xudmFyIGRpZ2l0VG9CYXNpYyA9IGZ1bmN0aW9uIGRpZ2l0VG9CYXNpYyhkaWdpdCwgZmxhZykge1xuXHQvLyAgMC4uMjUgbWFwIHRvIEFTQ0lJIGEuLnogb3IgQS4uWlxuXHQvLyAyNi4uMzUgbWFwIHRvIEFTQ0lJIDAuLjlcblx0cmV0dXJuIGRpZ2l0ICsgMjIgKyA3NSAqIChkaWdpdCA8IDI2KSAtICgoZmxhZyAhPSAwKSA8PCA1KTtcbn07XG5cbi8qKlxuICogQmlhcyBhZGFwdGF0aW9uIGZ1bmN0aW9uIGFzIHBlciBzZWN0aW9uIDMuNCBvZiBSRkMgMzQ5Mi5cbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNDkyI3NlY3Rpb24tMy40XG4gKiBAcHJpdmF0ZVxuICovXG52YXIgYWRhcHQgPSBmdW5jdGlvbiBhZGFwdChkZWx0YSwgbnVtUG9pbnRzLCBmaXJzdFRpbWUpIHtcblx0dmFyIGsgPSAwO1xuXHRkZWx0YSA9IGZpcnN0VGltZSA/IGZsb29yKGRlbHRhIC8gZGFtcCkgOiBkZWx0YSA+PiAxO1xuXHRkZWx0YSArPSBmbG9vcihkZWx0YSAvIG51bVBvaW50cyk7XG5cdGZvciAoOyAvKiBubyBpbml0aWFsaXphdGlvbiAqL2RlbHRhID4gYmFzZU1pbnVzVE1pbiAqIHRNYXggPj4gMTsgayArPSBiYXNlKSB7XG5cdFx0ZGVsdGEgPSBmbG9vcihkZWx0YSAvIGJhc2VNaW51c1RNaW4pO1xuXHR9XG5cdHJldHVybiBmbG9vcihrICsgKGJhc2VNaW51c1RNaW4gKyAxKSAqIGRlbHRhIC8gKGRlbHRhICsgc2tldykpO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMgdG8gYSBzdHJpbmcgb2YgVW5pY29kZVxuICogc3ltYm9scy5cbiAqIEBtZW1iZXJPZiBwdW55Y29kZVxuICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuICovXG52YXIgZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKGlucHV0KSB7XG5cdC8vIERvbid0IHVzZSBVQ1MtMi5cblx0dmFyIG91dHB1dCA9IFtdO1xuXHR2YXIgaW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGg7XG5cdHZhciBpID0gMDtcblx0dmFyIG4gPSBpbml0aWFsTjtcblx0dmFyIGJpYXMgPSBpbml0aWFsQmlhcztcblxuXHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzOiBsZXQgYGJhc2ljYCBiZSB0aGUgbnVtYmVyIG9mIGlucHV0IGNvZGVcblx0Ly8gcG9pbnRzIGJlZm9yZSB0aGUgbGFzdCBkZWxpbWl0ZXIsIG9yIGAwYCBpZiB0aGVyZSBpcyBub25lLCB0aGVuIGNvcHlcblx0Ly8gdGhlIGZpcnN0IGJhc2ljIGNvZGUgcG9pbnRzIHRvIHRoZSBvdXRwdXQuXG5cblx0dmFyIGJhc2ljID0gaW5wdXQubGFzdEluZGV4T2YoZGVsaW1pdGVyKTtcblx0aWYgKGJhc2ljIDwgMCkge1xuXHRcdGJhc2ljID0gMDtcblx0fVxuXG5cdGZvciAodmFyIGogPSAwOyBqIDwgYmFzaWM7ICsraikge1xuXHRcdC8vIGlmIGl0J3Mgbm90IGEgYmFzaWMgY29kZSBwb2ludFxuXHRcdGlmIChpbnB1dC5jaGFyQ29kZUF0KGopID49IDB4ODApIHtcblx0XHRcdGVycm9yJDEoJ25vdC1iYXNpYycpO1xuXHRcdH1cblx0XHRvdXRwdXQucHVzaChpbnB1dC5jaGFyQ29kZUF0KGopKTtcblx0fVxuXG5cdC8vIE1haW4gZGVjb2RpbmcgbG9vcDogc3RhcnQganVzdCBhZnRlciB0aGUgbGFzdCBkZWxpbWl0ZXIgaWYgYW55IGJhc2ljIGNvZGVcblx0Ly8gcG9pbnRzIHdlcmUgY29waWVkOyBzdGFydCBhdCB0aGUgYmVnaW5uaW5nIG90aGVyd2lzZS5cblxuXHRmb3IgKHZhciBpbmRleCA9IGJhc2ljID4gMCA/IGJhc2ljICsgMSA6IDA7IGluZGV4IDwgaW5wdXRMZW5ndGg7KSAvKiBubyBmaW5hbCBleHByZXNzaW9uICove1xuXG5cdFx0Ly8gYGluZGV4YCBpcyB0aGUgaW5kZXggb2YgdGhlIG5leHQgY2hhcmFjdGVyIHRvIGJlIGNvbnN1bWVkLlxuXHRcdC8vIERlY29kZSBhIGdlbmVyYWxpemVkIHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyIGludG8gYGRlbHRhYCxcblx0XHQvLyB3aGljaCBnZXRzIGFkZGVkIHRvIGBpYC4gVGhlIG92ZXJmbG93IGNoZWNraW5nIGlzIGVhc2llclxuXHRcdC8vIGlmIHdlIGluY3JlYXNlIGBpYCBhcyB3ZSBnbywgdGhlbiBzdWJ0cmFjdCBvZmYgaXRzIHN0YXJ0aW5nXG5cdFx0Ly8gdmFsdWUgYXQgdGhlIGVuZCB0byBvYnRhaW4gYGRlbHRhYC5cblx0XHR2YXIgb2xkaSA9IGk7XG5cdFx0Zm9yICh2YXIgdyA9IDEsIGsgPSBiYXNlOzsgLyogbm8gY29uZGl0aW9uICovayArPSBiYXNlKSB7XG5cblx0XHRcdGlmIChpbmRleCA+PSBpbnB1dExlbmd0aCkge1xuXHRcdFx0XHRlcnJvciQxKCdpbnZhbGlkLWlucHV0Jyk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBkaWdpdCA9IGJhc2ljVG9EaWdpdChpbnB1dC5jaGFyQ29kZUF0KGluZGV4KyspKTtcblxuXHRcdFx0aWYgKGRpZ2l0ID49IGJhc2UgfHwgZGlnaXQgPiBmbG9vcigobWF4SW50IC0gaSkgLyB3KSkge1xuXHRcdFx0XHRlcnJvciQxKCdvdmVyZmxvdycpO1xuXHRcdFx0fVxuXG5cdFx0XHRpICs9IGRpZ2l0ICogdztcblx0XHRcdHZhciB0ID0gayA8PSBiaWFzID8gdE1pbiA6IGsgPj0gYmlhcyArIHRNYXggPyB0TWF4IDogayAtIGJpYXM7XG5cblx0XHRcdGlmIChkaWdpdCA8IHQpIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRpZiAodyA+IGZsb29yKG1heEludCAvIGJhc2VNaW51c1QpKSB7XG5cdFx0XHRcdGVycm9yJDEoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdHcgKj0gYmFzZU1pbnVzVDtcblx0XHR9XG5cblx0XHR2YXIgb3V0ID0gb3V0cHV0Lmxlbmd0aCArIDE7XG5cdFx0YmlhcyA9IGFkYXB0KGkgLSBvbGRpLCBvdXQsIG9sZGkgPT0gMCk7XG5cblx0XHQvLyBgaWAgd2FzIHN1cHBvc2VkIHRvIHdyYXAgYXJvdW5kIGZyb20gYG91dGAgdG8gYDBgLFxuXHRcdC8vIGluY3JlbWVudGluZyBgbmAgZWFjaCB0aW1lLCBzbyB3ZSdsbCBmaXggdGhhdCBub3c6XG5cdFx0aWYgKGZsb29yKGkgLyBvdXQpID4gbWF4SW50IC0gbikge1xuXHRcdFx0ZXJyb3IkMSgnb3ZlcmZsb3cnKTtcblx0XHR9XG5cblx0XHRuICs9IGZsb29yKGkgLyBvdXQpO1xuXHRcdGkgJT0gb3V0O1xuXG5cdFx0Ly8gSW5zZXJ0IGBuYCBhdCBwb3NpdGlvbiBgaWAgb2YgdGhlIG91dHB1dC5cblx0XHRvdXRwdXQuc3BsaWNlKGkrKywgMCwgbik7XG5cdH1cblxuXHRyZXR1cm4gU3RyaW5nLmZyb21Db2RlUG9pbnQuYXBwbHkoU3RyaW5nLCBvdXRwdXQpO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMgKGUuZy4gYSBkb21haW4gbmFtZSBsYWJlbCkgdG8gYVxuICogUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cbiAqIEBtZW1iZXJPZiBwdW55Y29kZVxuICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuICovXG52YXIgZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKGlucHV0KSB7XG5cdHZhciBvdXRwdXQgPSBbXTtcblxuXHQvLyBDb252ZXJ0IHRoZSBpbnB1dCBpbiBVQ1MtMiB0byBhbiBhcnJheSBvZiBVbmljb2RlIGNvZGUgcG9pbnRzLlxuXHRpbnB1dCA9IHVjczJkZWNvZGUoaW5wdXQpO1xuXG5cdC8vIENhY2hlIHRoZSBsZW5ndGguXG5cdHZhciBpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aDtcblxuXHQvLyBJbml0aWFsaXplIHRoZSBzdGF0ZS5cblx0dmFyIG4gPSBpbml0aWFsTjtcblx0dmFyIGRlbHRhID0gMDtcblx0dmFyIGJpYXMgPSBpbml0aWFsQmlhcztcblxuXHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzLlxuXHR2YXIgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IHRydWU7XG5cdHZhciBfZGlkSXRlcmF0b3JFcnJvciA9IGZhbHNlO1xuXHR2YXIgX2l0ZXJhdG9yRXJyb3IgPSB1bmRlZmluZWQ7XG5cblx0dHJ5IHtcblx0XHRmb3IgKHZhciBfaXRlcmF0b3IgPSBpbnB1dFtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSAoX3N0ZXAgPSBfaXRlcmF0b3IubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IHRydWUpIHtcblx0XHRcdHZhciBfY3VycmVudFZhbHVlMiA9IF9zdGVwLnZhbHVlO1xuXG5cdFx0XHRpZiAoX2N1cnJlbnRWYWx1ZTIgPCAweDgwKSB7XG5cdFx0XHRcdG91dHB1dC5wdXNoKHN0cmluZ0Zyb21DaGFyQ29kZShfY3VycmVudFZhbHVlMikpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0X2RpZEl0ZXJhdG9yRXJyb3IgPSB0cnVlO1xuXHRcdF9pdGVyYXRvckVycm9yID0gZXJyO1xuXHR9IGZpbmFsbHkge1xuXHRcdHRyeSB7XG5cdFx0XHRpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gJiYgX2l0ZXJhdG9yLnJldHVybikge1xuXHRcdFx0XHRfaXRlcmF0b3IucmV0dXJuKCk7XG5cdFx0XHR9XG5cdFx0fSBmaW5hbGx5IHtcblx0XHRcdGlmIChfZGlkSXRlcmF0b3JFcnJvcikge1xuXHRcdFx0XHR0aHJvdyBfaXRlcmF0b3JFcnJvcjtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHR2YXIgYmFzaWNMZW5ndGggPSBvdXRwdXQubGVuZ3RoO1xuXHR2YXIgaGFuZGxlZENQQ291bnQgPSBiYXNpY0xlbmd0aDtcblxuXHQvLyBgaGFuZGxlZENQQ291bnRgIGlzIHRoZSBudW1iZXIgb2YgY29kZSBwb2ludHMgdGhhdCBoYXZlIGJlZW4gaGFuZGxlZDtcblx0Ly8gYGJhc2ljTGVuZ3RoYCBpcyB0aGUgbnVtYmVyIG9mIGJhc2ljIGNvZGUgcG9pbnRzLlxuXG5cdC8vIEZpbmlzaCB0aGUgYmFzaWMgc3RyaW5nIHdpdGggYSBkZWxpbWl0ZXIgdW5sZXNzIGl0J3MgZW1wdHkuXG5cdGlmIChiYXNpY0xlbmd0aCkge1xuXHRcdG91dHB1dC5wdXNoKGRlbGltaXRlcik7XG5cdH1cblxuXHQvLyBNYWluIGVuY29kaW5nIGxvb3A6XG5cdHdoaWxlIChoYW5kbGVkQ1BDb3VudCA8IGlucHV0TGVuZ3RoKSB7XG5cblx0XHQvLyBBbGwgbm9uLWJhc2ljIGNvZGUgcG9pbnRzIDwgbiBoYXZlIGJlZW4gaGFuZGxlZCBhbHJlYWR5LiBGaW5kIHRoZSBuZXh0XG5cdFx0Ly8gbGFyZ2VyIG9uZTpcblx0XHR2YXIgbSA9IG1heEludDtcblx0XHR2YXIgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSB0cnVlO1xuXHRcdHZhciBfZGlkSXRlcmF0b3JFcnJvcjIgPSBmYWxzZTtcblx0XHR2YXIgX2l0ZXJhdG9yRXJyb3IyID0gdW5kZWZpbmVkO1xuXG5cdFx0dHJ5IHtcblx0XHRcdGZvciAodmFyIF9pdGVyYXRvcjIgPSBpbnB1dFtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwMjsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IChfc3RlcDIgPSBfaXRlcmF0b3IyLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZSkge1xuXHRcdFx0XHR2YXIgY3VycmVudFZhbHVlID0gX3N0ZXAyLnZhbHVlO1xuXG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPj0gbiAmJiBjdXJyZW50VmFsdWUgPCBtKSB7XG5cdFx0XHRcdFx0bSA9IGN1cnJlbnRWYWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBJbmNyZWFzZSBgZGVsdGFgIGVub3VnaCB0byBhZHZhbmNlIHRoZSBkZWNvZGVyJ3MgPG4saT4gc3RhdGUgdG8gPG0sMD4sXG5cdFx0XHQvLyBidXQgZ3VhcmQgYWdhaW5zdCBvdmVyZmxvdy5cblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdF9kaWRJdGVyYXRvckVycm9yMiA9IHRydWU7XG5cdFx0XHRfaXRlcmF0b3JFcnJvcjIgPSBlcnI7XG5cdFx0fSBmaW5hbGx5IHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgJiYgX2l0ZXJhdG9yMi5yZXR1cm4pIHtcblx0XHRcdFx0XHRfaXRlcmF0b3IyLnJldHVybigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGZpbmFsbHkge1xuXHRcdFx0XHRpZiAoX2RpZEl0ZXJhdG9yRXJyb3IyKSB7XG5cdFx0XHRcdFx0dGhyb3cgX2l0ZXJhdG9yRXJyb3IyO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dmFyIGhhbmRsZWRDUENvdW50UGx1c09uZSA9IGhhbmRsZWRDUENvdW50ICsgMTtcblx0XHRpZiAobSAtIG4gPiBmbG9vcigobWF4SW50IC0gZGVsdGEpIC8gaGFuZGxlZENQQ291bnRQbHVzT25lKSkge1xuXHRcdFx0ZXJyb3IkMSgnb3ZlcmZsb3cnKTtcblx0XHR9XG5cblx0XHRkZWx0YSArPSAobSAtIG4pICogaGFuZGxlZENQQ291bnRQbHVzT25lO1xuXHRcdG4gPSBtO1xuXG5cdFx0dmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24zID0gdHJ1ZTtcblx0XHR2YXIgX2RpZEl0ZXJhdG9yRXJyb3IzID0gZmFsc2U7XG5cdFx0dmFyIF9pdGVyYXRvckVycm9yMyA9IHVuZGVmaW5lZDtcblxuXHRcdHRyeSB7XG5cdFx0XHRmb3IgKHZhciBfaXRlcmF0b3IzID0gaW5wdXRbU3ltYm9sLml0ZXJhdG9yXSgpLCBfc3RlcDM7ICEoX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjMgPSAoX3N0ZXAzID0gX2l0ZXJhdG9yMy5uZXh0KCkpLmRvbmUpOyBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMyA9IHRydWUpIHtcblx0XHRcdFx0dmFyIF9jdXJyZW50VmFsdWUgPSBfc3RlcDMudmFsdWU7XG5cblx0XHRcdFx0aWYgKF9jdXJyZW50VmFsdWUgPCBuICYmICsrZGVsdGEgPiBtYXhJbnQpIHtcblx0XHRcdFx0XHRlcnJvciQxKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChfY3VycmVudFZhbHVlID09IG4pIHtcblx0XHRcdFx0XHQvLyBSZXByZXNlbnQgZGVsdGEgYXMgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlci5cblx0XHRcdFx0XHR2YXIgcSA9IGRlbHRhO1xuXHRcdFx0XHRcdGZvciAodmFyIGsgPSBiYXNlOzsgLyogbm8gY29uZGl0aW9uICovayArPSBiYXNlKSB7XG5cdFx0XHRcdFx0XHR2YXIgdCA9IGsgPD0gYmlhcyA/IHRNaW4gOiBrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzO1xuXHRcdFx0XHRcdFx0aWYgKHEgPCB0KSB7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dmFyIHFNaW51c1QgPSBxIC0gdDtcblx0XHRcdFx0XHRcdHZhciBiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHQgKyBxTWludXNUICUgYmFzZU1pbnVzVCwgMCkpKTtcblx0XHRcdFx0XHRcdHEgPSBmbG9vcihxTWludXNUIC8gYmFzZU1pbnVzVCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGRpZ2l0VG9CYXNpYyhxLCAwKSkpO1xuXHRcdFx0XHRcdGJpYXMgPSBhZGFwdChkZWx0YSwgaGFuZGxlZENQQ291bnRQbHVzT25lLCBoYW5kbGVkQ1BDb3VudCA9PSBiYXNpY0xlbmd0aCk7XG5cdFx0XHRcdFx0ZGVsdGEgPSAwO1xuXHRcdFx0XHRcdCsraGFuZGxlZENQQ291bnQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdF9kaWRJdGVyYXRvckVycm9yMyA9IHRydWU7XG5cdFx0XHRfaXRlcmF0b3JFcnJvcjMgPSBlcnI7XG5cdFx0fSBmaW5hbGx5IHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjMgJiYgX2l0ZXJhdG9yMy5yZXR1cm4pIHtcblx0XHRcdFx0XHRfaXRlcmF0b3IzLnJldHVybigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGZpbmFsbHkge1xuXHRcdFx0XHRpZiAoX2RpZEl0ZXJhdG9yRXJyb3IzKSB7XG5cdFx0XHRcdFx0dGhyb3cgX2l0ZXJhdG9yRXJyb3IzO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0KytkZWx0YTtcblx0XHQrK247XG5cdH1cblx0cmV0dXJuIG91dHB1dC5qb2luKCcnKTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgb3IgYW4gZW1haWwgYWRkcmVzc1xuICogdG8gVW5pY29kZS4gT25seSB0aGUgUHVueWNvZGVkIHBhcnRzIG9mIHRoZSBpbnB1dCB3aWxsIGJlIGNvbnZlcnRlZCwgaS5lLlxuICogaXQgZG9lc24ndCBtYXR0ZXIgaWYgeW91IGNhbGwgaXQgb24gYSBzdHJpbmcgdGhhdCBoYXMgYWxyZWFkeSBiZWVuXG4gKiBjb252ZXJ0ZWQgdG8gVW5pY29kZS5cbiAqIEBtZW1iZXJPZiBwdW55Y29kZVxuICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBQdW55Y29kZWQgZG9tYWluIG5hbWUgb3IgZW1haWwgYWRkcmVzcyB0b1xuICogY29udmVydCB0byBVbmljb2RlLlxuICogQHJldHVybnMge1N0cmluZ30gVGhlIFVuaWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIFB1bnljb2RlXG4gKiBzdHJpbmcuXG4gKi9cbnZhciB0b1VuaWNvZGUgPSBmdW5jdGlvbiB0b1VuaWNvZGUoaW5wdXQpIHtcblx0cmV0dXJuIG1hcERvbWFpbihpbnB1dCwgZnVuY3Rpb24gKHN0cmluZykge1xuXHRcdHJldHVybiByZWdleFB1bnljb2RlLnRlc3Qoc3RyaW5nKSA/IGRlY29kZShzdHJpbmcuc2xpY2UoNCkudG9Mb3dlckNhc2UoKSkgOiBzdHJpbmc7XG5cdH0pO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIFVuaWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIG9yIGFuIGVtYWlsIGFkZHJlc3MgdG9cbiAqIFB1bnljb2RlLiBPbmx5IHRoZSBub24tQVNDSUkgcGFydHMgb2YgdGhlIGRvbWFpbiBuYW1lIHdpbGwgYmUgY29udmVydGVkLFxuICogaS5lLiBpdCBkb2Vzbid0IG1hdHRlciBpZiB5b3UgY2FsbCBpdCB3aXRoIGEgZG9tYWluIHRoYXQncyBhbHJlYWR5IGluXG4gKiBBU0NJSS5cbiAqIEBtZW1iZXJPZiBwdW55Y29kZVxuICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBkb21haW4gbmFtZSBvciBlbWFpbCBhZGRyZXNzIHRvIGNvbnZlcnQsIGFzIGFcbiAqIFVuaWNvZGUgc3RyaW5nLlxuICogQHJldHVybnMge1N0cmluZ30gVGhlIFB1bnljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBkb21haW4gbmFtZSBvclxuICogZW1haWwgYWRkcmVzcy5cbiAqL1xudmFyIHRvQVNDSUkgPSBmdW5jdGlvbiB0b0FTQ0lJKGlucHV0KSB7XG5cdHJldHVybiBtYXBEb21haW4oaW5wdXQsIGZ1bmN0aW9uIChzdHJpbmcpIHtcblx0XHRyZXR1cm4gcmVnZXhOb25BU0NJSS50ZXN0KHN0cmluZykgPyAneG4tLScgKyBlbmNvZGUoc3RyaW5nKSA6IHN0cmluZztcblx0fSk7XG59O1xuXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuLyoqIERlZmluZSB0aGUgcHVibGljIEFQSSAqL1xudmFyIHB1bnljb2RlID0ge1xuXHQvKipcbiAgKiBBIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGN1cnJlbnQgUHVueWNvZGUuanMgdmVyc2lvbiBudW1iZXIuXG4gICogQG1lbWJlck9mIHB1bnljb2RlXG4gICogQHR5cGUgU3RyaW5nXG4gICovXG5cdCd2ZXJzaW9uJzogJzIuMS4wJyxcblx0LyoqXG4gICogQW4gb2JqZWN0IG9mIG1ldGhvZHMgdG8gY29udmVydCBmcm9tIEphdmFTY3JpcHQncyBpbnRlcm5hbCBjaGFyYWN0ZXJcbiAgKiByZXByZXNlbnRhdGlvbiAoVUNTLTIpIHRvIFVuaWNvZGUgY29kZSBwb2ludHMsIGFuZCBiYWNrLlxuICAqIEBzZWUgPGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nPlxuICAqIEBtZW1iZXJPZiBwdW55Y29kZVxuICAqIEB0eXBlIE9iamVjdFxuICAqL1xuXHQndWNzMic6IHtcblx0XHQnZGVjb2RlJzogdWNzMmRlY29kZSxcblx0XHQnZW5jb2RlJzogdWNzMmVuY29kZVxuXHR9LFxuXHQnZGVjb2RlJzogZGVjb2RlLFxuXHQnZW5jb2RlJzogZW5jb2RlLFxuXHQndG9BU0NJSSc6IHRvQVNDSUksXG5cdCd0b1VuaWNvZGUnOiB0b1VuaWNvZGVcbn07XG5cbi8qKlxuICogVVJJLmpzXG4gKlxuICogQGZpbGVvdmVydmlldyBBbiBSRkMgMzk4NiBjb21wbGlhbnQsIHNjaGVtZSBleHRlbmRhYmxlIFVSSSBwYXJzaW5nL3ZhbGlkYXRpbmcvcmVzb2x2aW5nIGxpYnJhcnkgZm9yIEphdmFTY3JpcHQuXG4gKiBAYXV0aG9yIDxhIGhyZWY9XCJtYWlsdG86Z2FyeS5jb3VydEBnbWFpbC5jb21cIj5HYXJ5IENvdXJ0PC9hPlxuICogQHNlZSBodHRwOi8vZ2l0aHViLmNvbS9nYXJ5Y291cnQvdXJpLWpzXG4gKi9cbi8qKlxuICogQ29weXJpZ2h0IDIwMTEgR2FyeSBDb3VydC4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBSZWRpc3RyaWJ1dGlvbiBhbmQgdXNlIGluIHNvdXJjZSBhbmQgYmluYXJ5IGZvcm1zLCB3aXRoIG9yIHdpdGhvdXQgbW9kaWZpY2F0aW9uLCBhcmVcbiAqIHBlcm1pdHRlZCBwcm92aWRlZCB0aGF0IHRoZSBmb2xsb3dpbmcgY29uZGl0aW9ucyBhcmUgbWV0OlxuICpcbiAqICAgIDEuIFJlZGlzdHJpYnV0aW9ucyBvZiBzb3VyY2UgY29kZSBtdXN0IHJldGFpbiB0aGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSwgdGhpcyBsaXN0IG9mXG4gKiAgICAgICBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIuXG4gKlxuICogICAgMi4gUmVkaXN0cmlidXRpb25zIGluIGJpbmFyeSBmb3JtIG11c3QgcmVwcm9kdWNlIHRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlLCB0aGlzIGxpc3RcbiAqICAgICAgIG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lciBpbiB0aGUgZG9jdW1lbnRhdGlvbiBhbmQvb3Igb3RoZXIgbWF0ZXJpYWxzXG4gKiAgICAgICBwcm92aWRlZCB3aXRoIHRoZSBkaXN0cmlidXRpb24uXG4gKlxuICogVEhJUyBTT0ZUV0FSRSBJUyBQUk9WSURFRCBCWSBHQVJZIENPVVJUIGBgQVMgSVMnJyBBTkQgQU5ZIEVYUFJFU1MgT1IgSU1QTElFRFxuICogV0FSUkFOVElFUywgSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFRIRSBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZIEFORFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQVJFIERJU0NMQUlNRUQuIElOIE5PIEVWRU5UIFNIQUxMIEdBUlkgQ09VUlQgT1JcbiAqIENPTlRSSUJVVE9SUyBCRSBMSUFCTEUgRk9SIEFOWSBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SXG4gKiBDT05TRVFVRU5USUFMIERBTUFHRVMgKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SXG4gKiBTRVJWSUNFUzsgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTikgSE9XRVZFUiBDQVVTRUQgQU5EIE9OXG4gKiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVCAoSU5DTFVESU5HXG4gKiBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSkgQVJJU0lORyBJTiBBTlkgV0FZIE9VVCBPRiBUSEUgVVNFIE9GIFRISVMgU09GVFdBUkUsIEVWRU4gSUZcbiAqIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxuICpcbiAqIFRoZSB2aWV3cyBhbmQgY29uY2x1c2lvbnMgY29udGFpbmVkIGluIHRoZSBzb2Z0d2FyZSBhbmQgZG9jdW1lbnRhdGlvbiBhcmUgdGhvc2Ugb2YgdGhlXG4gKiBhdXRob3JzIGFuZCBzaG91bGQgbm90IGJlIGludGVycHJldGVkIGFzIHJlcHJlc2VudGluZyBvZmZpY2lhbCBwb2xpY2llcywgZWl0aGVyIGV4cHJlc3NlZFxuICogb3IgaW1wbGllZCwgb2YgR2FyeSBDb3VydC5cbiAqL1xudmFyIFNDSEVNRVMgPSB7fTtcbmZ1bmN0aW9uIHBjdEVuY0NoYXIoY2hyKSB7XG4gICAgdmFyIGMgPSBjaHIuY2hhckNvZGVBdCgwKTtcbiAgICB2YXIgZSA9IHZvaWQgMDtcbiAgICBpZiAoYyA8IDE2KSBlID0gXCIlMFwiICsgYy50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTtlbHNlIGlmIChjIDwgMTI4KSBlID0gXCIlXCIgKyBjLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO2Vsc2UgaWYgKGMgPCAyMDQ4KSBlID0gXCIlXCIgKyAoYyA+PiA2IHwgMTkyKS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKSArIFwiJVwiICsgKGMgJiA2MyB8IDEyOCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7ZWxzZSBlID0gXCIlXCIgKyAoYyA+PiAxMiB8IDIyNCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkgKyBcIiVcIiArIChjID4+IDYgJiA2MyB8IDEyOCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkgKyBcIiVcIiArIChjICYgNjMgfCAxMjgpLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO1xuICAgIHJldHVybiBlO1xufVxuZnVuY3Rpb24gcGN0RGVjQ2hhcnMoc3RyKSB7XG4gICAgdmFyIG5ld1N0ciA9IFwiXCI7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBpbCA9IHN0ci5sZW5ndGg7XG4gICAgd2hpbGUgKGkgPCBpbCkge1xuICAgICAgICB2YXIgYyA9IHBhcnNlSW50KHN0ci5zdWJzdHIoaSArIDEsIDIpLCAxNik7XG4gICAgICAgIGlmIChjIDwgMTI4KSB7XG4gICAgICAgICAgICBuZXdTdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcbiAgICAgICAgICAgIGkgKz0gMztcbiAgICAgICAgfSBlbHNlIGlmIChjID49IDE5NCAmJiBjIDwgMjI0KSB7XG4gICAgICAgICAgICBpZiAoaWwgLSBpID49IDYpIHtcbiAgICAgICAgICAgICAgICB2YXIgYzIgPSBwYXJzZUludChzdHIuc3Vic3RyKGkgKyA0LCAyKSwgMTYpO1xuICAgICAgICAgICAgICAgIG5ld1N0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKChjICYgMzEpIDw8IDYgfCBjMiAmIDYzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV3U3RyICs9IHN0ci5zdWJzdHIoaSwgNik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpICs9IDY7XG4gICAgICAgIH0gZWxzZSBpZiAoYyA+PSAyMjQpIHtcbiAgICAgICAgICAgIGlmIChpbCAtIGkgPj0gOSkge1xuICAgICAgICAgICAgICAgIHZhciBfYyA9IHBhcnNlSW50KHN0ci5zdWJzdHIoaSArIDQsIDIpLCAxNik7XG4gICAgICAgICAgICAgICAgdmFyIGMzID0gcGFyc2VJbnQoc3RyLnN1YnN0cihpICsgNywgMiksIDE2KTtcbiAgICAgICAgICAgICAgICBuZXdTdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgoYyAmIDE1KSA8PCAxMiB8IChfYyAmIDYzKSA8PCA2IHwgYzMgJiA2Myk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld1N0ciArPSBzdHIuc3Vic3RyKGksIDkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaSArPSA5O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3U3RyICs9IHN0ci5zdWJzdHIoaSwgMyk7XG4gICAgICAgICAgICBpICs9IDM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ld1N0cjtcbn1cbmZ1bmN0aW9uIF9ub3JtYWxpemVDb21wb25lbnRFbmNvZGluZyhjb21wb25lbnRzLCBwcm90b2NvbCkge1xuICAgIGZ1bmN0aW9uIGRlY29kZVVucmVzZXJ2ZWQoc3RyKSB7XG4gICAgICAgIHZhciBkZWNTdHIgPSBwY3REZWNDaGFycyhzdHIpO1xuICAgICAgICByZXR1cm4gIWRlY1N0ci5tYXRjaChwcm90b2NvbC5VTlJFU0VSVkVEKSA/IHN0ciA6IGRlY1N0cjtcbiAgICB9XG4gICAgaWYgKGNvbXBvbmVudHMuc2NoZW1lKSBjb21wb25lbnRzLnNjaGVtZSA9IFN0cmluZyhjb21wb25lbnRzLnNjaGVtZSkucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgZGVjb2RlVW5yZXNlcnZlZCkudG9Mb3dlckNhc2UoKS5yZXBsYWNlKHByb3RvY29sLk5PVF9TQ0hFTUUsIFwiXCIpO1xuICAgIGlmIChjb21wb25lbnRzLnVzZXJpbmZvICE9PSB1bmRlZmluZWQpIGNvbXBvbmVudHMudXNlcmluZm8gPSBTdHJpbmcoY29tcG9uZW50cy51c2VyaW5mbykucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgZGVjb2RlVW5yZXNlcnZlZCkucmVwbGFjZShwcm90b2NvbC5OT1RfVVNFUklORk8sIHBjdEVuY0NoYXIpLnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIHRvVXBwZXJDYXNlKTtcbiAgICBpZiAoY29tcG9uZW50cy5ob3N0ICE9PSB1bmRlZmluZWQpIGNvbXBvbmVudHMuaG9zdCA9IFN0cmluZyhjb21wb25lbnRzLmhvc3QpLnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIGRlY29kZVVucmVzZXJ2ZWQpLnRvTG93ZXJDYXNlKCkucmVwbGFjZShwcm90b2NvbC5OT1RfSE9TVCwgcGN0RW5jQ2hhcikucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgdG9VcHBlckNhc2UpO1xuICAgIGlmIChjb21wb25lbnRzLnBhdGggIT09IHVuZGVmaW5lZCkgY29tcG9uZW50cy5wYXRoID0gU3RyaW5nKGNvbXBvbmVudHMucGF0aCkucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgZGVjb2RlVW5yZXNlcnZlZCkucmVwbGFjZShjb21wb25lbnRzLnNjaGVtZSA/IHByb3RvY29sLk5PVF9QQVRIIDogcHJvdG9jb2wuTk9UX1BBVEhfTk9TQ0hFTUUsIHBjdEVuY0NoYXIpLnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIHRvVXBwZXJDYXNlKTtcbiAgICBpZiAoY29tcG9uZW50cy5xdWVyeSAhPT0gdW5kZWZpbmVkKSBjb21wb25lbnRzLnF1ZXJ5ID0gU3RyaW5nKGNvbXBvbmVudHMucXVlcnkpLnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIGRlY29kZVVucmVzZXJ2ZWQpLnJlcGxhY2UocHJvdG9jb2wuTk9UX1FVRVJZLCBwY3RFbmNDaGFyKS5yZXBsYWNlKHByb3RvY29sLlBDVF9FTkNPREVELCB0b1VwcGVyQ2FzZSk7XG4gICAgaWYgKGNvbXBvbmVudHMuZnJhZ21lbnQgIT09IHVuZGVmaW5lZCkgY29tcG9uZW50cy5mcmFnbWVudCA9IFN0cmluZyhjb21wb25lbnRzLmZyYWdtZW50KS5yZXBsYWNlKHByb3RvY29sLlBDVF9FTkNPREVELCBkZWNvZGVVbnJlc2VydmVkKS5yZXBsYWNlKHByb3RvY29sLk5PVF9GUkFHTUVOVCwgcGN0RW5jQ2hhcikucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgdG9VcHBlckNhc2UpO1xuICAgIHJldHVybiBjb21wb25lbnRzO1xufVxuXG5mdW5jdGlvbiBfc3RyaXBMZWFkaW5nWmVyb3Moc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eMCooLiopLywgXCIkMVwiKSB8fCBcIjBcIjtcbn1cbmZ1bmN0aW9uIF9ub3JtYWxpemVJUHY0KGhvc3QsIHByb3RvY29sKSB7XG4gICAgdmFyIG1hdGNoZXMgPSBob3N0Lm1hdGNoKHByb3RvY29sLklQVjRBRERSRVNTKSB8fCBbXTtcblxuICAgIHZhciBfbWF0Y2hlcyA9IHNsaWNlZFRvQXJyYXkobWF0Y2hlcywgMiksXG4gICAgICAgIGFkZHJlc3MgPSBfbWF0Y2hlc1sxXTtcblxuICAgIGlmIChhZGRyZXNzKSB7XG4gICAgICAgIHJldHVybiBhZGRyZXNzLnNwbGl0KFwiLlwiKS5tYXAoX3N0cmlwTGVhZGluZ1plcm9zKS5qb2luKFwiLlwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaG9zdDtcbiAgICB9XG59XG5mdW5jdGlvbiBfbm9ybWFsaXplSVB2Nihob3N0LCBwcm90b2NvbCkge1xuICAgIHZhciBtYXRjaGVzID0gaG9zdC5tYXRjaChwcm90b2NvbC5JUFY2QUREUkVTUykgfHwgW107XG5cbiAgICB2YXIgX21hdGNoZXMyID0gc2xpY2VkVG9BcnJheShtYXRjaGVzLCAzKSxcbiAgICAgICAgYWRkcmVzcyA9IF9tYXRjaGVzMlsxXSxcbiAgICAgICAgem9uZSA9IF9tYXRjaGVzMlsyXTtcblxuICAgIGlmIChhZGRyZXNzKSB7XG4gICAgICAgIHZhciBfYWRkcmVzcyR0b0xvd2VyQ2FzZSQgPSBhZGRyZXNzLnRvTG93ZXJDYXNlKCkuc3BsaXQoJzo6JykucmV2ZXJzZSgpLFxuICAgICAgICAgICAgX2FkZHJlc3MkdG9Mb3dlckNhc2UkMiA9IHNsaWNlZFRvQXJyYXkoX2FkZHJlc3MkdG9Mb3dlckNhc2UkLCAyKSxcbiAgICAgICAgICAgIGxhc3QgPSBfYWRkcmVzcyR0b0xvd2VyQ2FzZSQyWzBdLFxuICAgICAgICAgICAgZmlyc3QgPSBfYWRkcmVzcyR0b0xvd2VyQ2FzZSQyWzFdO1xuXG4gICAgICAgIHZhciBmaXJzdEZpZWxkcyA9IGZpcnN0ID8gZmlyc3Quc3BsaXQoXCI6XCIpLm1hcChfc3RyaXBMZWFkaW5nWmVyb3MpIDogW107XG4gICAgICAgIHZhciBsYXN0RmllbGRzID0gbGFzdC5zcGxpdChcIjpcIikubWFwKF9zdHJpcExlYWRpbmdaZXJvcyk7XG4gICAgICAgIHZhciBpc0xhc3RGaWVsZElQdjRBZGRyZXNzID0gcHJvdG9jb2wuSVBWNEFERFJFU1MudGVzdChsYXN0RmllbGRzW2xhc3RGaWVsZHMubGVuZ3RoIC0gMV0pO1xuICAgICAgICB2YXIgZmllbGRDb3VudCA9IGlzTGFzdEZpZWxkSVB2NEFkZHJlc3MgPyA3IDogODtcbiAgICAgICAgdmFyIGxhc3RGaWVsZHNTdGFydCA9IGxhc3RGaWVsZHMubGVuZ3RoIC0gZmllbGRDb3VudDtcbiAgICAgICAgdmFyIGZpZWxkcyA9IEFycmF5KGZpZWxkQ291bnQpO1xuICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IGZpZWxkQ291bnQ7ICsreCkge1xuICAgICAgICAgICAgZmllbGRzW3hdID0gZmlyc3RGaWVsZHNbeF0gfHwgbGFzdEZpZWxkc1tsYXN0RmllbGRzU3RhcnQgKyB4XSB8fCAnJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNMYXN0RmllbGRJUHY0QWRkcmVzcykge1xuICAgICAgICAgICAgZmllbGRzW2ZpZWxkQ291bnQgLSAxXSA9IF9ub3JtYWxpemVJUHY0KGZpZWxkc1tmaWVsZENvdW50IC0gMV0sIHByb3RvY29sKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYWxsWmVyb0ZpZWxkcyA9IGZpZWxkcy5yZWR1Y2UoZnVuY3Rpb24gKGFjYywgZmllbGQsIGluZGV4KSB7XG4gICAgICAgICAgICBpZiAoIWZpZWxkIHx8IGZpZWxkID09PSBcIjBcIikge1xuICAgICAgICAgICAgICAgIHZhciBsYXN0TG9uZ2VzdCA9IGFjY1thY2MubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RMb25nZXN0ICYmIGxhc3RMb25nZXN0LmluZGV4ICsgbGFzdExvbmdlc3QubGVuZ3RoID09PSBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBsYXN0TG9uZ2VzdC5sZW5ndGgrKztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhY2MucHVzaCh7IGluZGV4OiBpbmRleCwgbGVuZ3RoOiAxIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIFtdKTtcbiAgICAgICAgdmFyIGxvbmdlc3RaZXJvRmllbGRzID0gYWxsWmVyb0ZpZWxkcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gYi5sZW5ndGggLSBhLmxlbmd0aDtcbiAgICAgICAgfSlbMF07XG4gICAgICAgIHZhciBuZXdIb3N0ID0gdm9pZCAwO1xuICAgICAgICBpZiAobG9uZ2VzdFplcm9GaWVsZHMgJiYgbG9uZ2VzdFplcm9GaWVsZHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdmFyIG5ld0ZpcnN0ID0gZmllbGRzLnNsaWNlKDAsIGxvbmdlc3RaZXJvRmllbGRzLmluZGV4KTtcbiAgICAgICAgICAgIHZhciBuZXdMYXN0ID0gZmllbGRzLnNsaWNlKGxvbmdlc3RaZXJvRmllbGRzLmluZGV4ICsgbG9uZ2VzdFplcm9GaWVsZHMubGVuZ3RoKTtcbiAgICAgICAgICAgIG5ld0hvc3QgPSBuZXdGaXJzdC5qb2luKFwiOlwiKSArIFwiOjpcIiArIG5ld0xhc3Quam9pbihcIjpcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXdIb3N0ID0gZmllbGRzLmpvaW4oXCI6XCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh6b25lKSB7XG4gICAgICAgICAgICBuZXdIb3N0ICs9IFwiJVwiICsgem9uZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3SG9zdDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaG9zdDtcbiAgICB9XG59XG52YXIgVVJJX1BBUlNFID0gL14oPzooW146XFwvPyNdKyk6KT8oPzpcXC9cXC8oKD86KFteXFwvPyNAXSopQCk/KFxcW1teXFwvPyNcXF1dK1xcXXxbXlxcLz8jOl0qKSg/OlxcOihcXGQqKSk/KSk/KFtePyNdKikoPzpcXD8oW14jXSopKT8oPzojKCg/Oi58XFxufFxccikqKSk/L2k7XG52YXIgTk9fTUFUQ0hfSVNfVU5ERUZJTkVEID0gXCJcIi5tYXRjaCgvKCl7MH0vKVsxXSA9PT0gdW5kZWZpbmVkO1xuZnVuY3Rpb24gcGFyc2UodXJpU3RyaW5nKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IHt9O1xuXG4gICAgdmFyIGNvbXBvbmVudHMgPSB7fTtcbiAgICB2YXIgcHJvdG9jb2wgPSBvcHRpb25zLmlyaSAhPT0gZmFsc2UgPyBJUklfUFJPVE9DT0wgOiBVUklfUFJPVE9DT0w7XG4gICAgaWYgKG9wdGlvbnMucmVmZXJlbmNlID09PSBcInN1ZmZpeFwiKSB1cmlTdHJpbmcgPSAob3B0aW9ucy5zY2hlbWUgPyBvcHRpb25zLnNjaGVtZSArIFwiOlwiIDogXCJcIikgKyBcIi8vXCIgKyB1cmlTdHJpbmc7XG4gICAgdmFyIG1hdGNoZXMgPSB1cmlTdHJpbmcubWF0Y2goVVJJX1BBUlNFKTtcbiAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICBpZiAoTk9fTUFUQ0hfSVNfVU5ERUZJTkVEKSB7XG4gICAgICAgICAgICAvL3N0b3JlIGVhY2ggY29tcG9uZW50XG4gICAgICAgICAgICBjb21wb25lbnRzLnNjaGVtZSA9IG1hdGNoZXNbMV07XG4gICAgICAgICAgICBjb21wb25lbnRzLnVzZXJpbmZvID0gbWF0Y2hlc1szXTtcbiAgICAgICAgICAgIGNvbXBvbmVudHMuaG9zdCA9IG1hdGNoZXNbNF07XG4gICAgICAgICAgICBjb21wb25lbnRzLnBvcnQgPSBwYXJzZUludChtYXRjaGVzWzVdLCAxMCk7XG4gICAgICAgICAgICBjb21wb25lbnRzLnBhdGggPSBtYXRjaGVzWzZdIHx8IFwiXCI7XG4gICAgICAgICAgICBjb21wb25lbnRzLnF1ZXJ5ID0gbWF0Y2hlc1s3XTtcbiAgICAgICAgICAgIGNvbXBvbmVudHMuZnJhZ21lbnQgPSBtYXRjaGVzWzhdO1xuICAgICAgICAgICAgLy9maXggcG9ydCBudW1iZXJcbiAgICAgICAgICAgIGlmIChpc05hTihjb21wb25lbnRzLnBvcnQpKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50cy5wb3J0ID0gbWF0Y2hlc1s1XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vSUUgRklYIGZvciBpbXByb3BlciBSZWdFeHAgbWF0Y2hpbmdcbiAgICAgICAgICAgIC8vc3RvcmUgZWFjaCBjb21wb25lbnRcbiAgICAgICAgICAgIGNvbXBvbmVudHMuc2NoZW1lID0gbWF0Y2hlc1sxXSB8fCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb21wb25lbnRzLnVzZXJpbmZvID0gdXJpU3RyaW5nLmluZGV4T2YoXCJAXCIpICE9PSAtMSA/IG1hdGNoZXNbM10gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb21wb25lbnRzLmhvc3QgPSB1cmlTdHJpbmcuaW5kZXhPZihcIi8vXCIpICE9PSAtMSA/IG1hdGNoZXNbNF0gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb21wb25lbnRzLnBvcnQgPSBwYXJzZUludChtYXRjaGVzWzVdLCAxMCk7XG4gICAgICAgICAgICBjb21wb25lbnRzLnBhdGggPSBtYXRjaGVzWzZdIHx8IFwiXCI7XG4gICAgICAgICAgICBjb21wb25lbnRzLnF1ZXJ5ID0gdXJpU3RyaW5nLmluZGV4T2YoXCI/XCIpICE9PSAtMSA/IG1hdGNoZXNbN10gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb21wb25lbnRzLmZyYWdtZW50ID0gdXJpU3RyaW5nLmluZGV4T2YoXCIjXCIpICE9PSAtMSA/IG1hdGNoZXNbOF0gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAvL2ZpeCBwb3J0IG51bWJlclxuICAgICAgICAgICAgaWYgKGlzTmFOKGNvbXBvbmVudHMucG9ydCkpIHtcbiAgICAgICAgICAgICAgICBjb21wb25lbnRzLnBvcnQgPSB1cmlTdHJpbmcubWF0Y2goL1xcL1xcLyg/Oi58XFxuKSpcXDooPzpcXC98XFw/fFxcI3wkKS8pID8gbWF0Y2hlc1s0XSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY29tcG9uZW50cy5ob3N0KSB7XG4gICAgICAgICAgICAvL25vcm1hbGl6ZSBJUCBob3N0c1xuICAgICAgICAgICAgY29tcG9uZW50cy5ob3N0ID0gX25vcm1hbGl6ZUlQdjYoX25vcm1hbGl6ZUlQdjQoY29tcG9uZW50cy5ob3N0LCBwcm90b2NvbCksIHByb3RvY29sKTtcbiAgICAgICAgfVxuICAgICAgICAvL2RldGVybWluZSByZWZlcmVuY2UgdHlwZVxuICAgICAgICBpZiAoY29tcG9uZW50cy5zY2hlbWUgPT09IHVuZGVmaW5lZCAmJiBjb21wb25lbnRzLnVzZXJpbmZvID09PSB1bmRlZmluZWQgJiYgY29tcG9uZW50cy5ob3N0ID09PSB1bmRlZmluZWQgJiYgY29tcG9uZW50cy5wb3J0ID09PSB1bmRlZmluZWQgJiYgIWNvbXBvbmVudHMucGF0aCAmJiBjb21wb25lbnRzLnF1ZXJ5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucmVmZXJlbmNlID0gXCJzYW1lLWRvY3VtZW50XCI7XG4gICAgICAgIH0gZWxzZSBpZiAoY29tcG9uZW50cy5zY2hlbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29tcG9uZW50cy5yZWZlcmVuY2UgPSBcInJlbGF0aXZlXCI7XG4gICAgICAgIH0gZWxzZSBpZiAoY29tcG9uZW50cy5mcmFnbWVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb21wb25lbnRzLnJlZmVyZW5jZSA9IFwiYWJzb2x1dGVcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucmVmZXJlbmNlID0gXCJ1cmlcIjtcbiAgICAgICAgfVxuICAgICAgICAvL2NoZWNrIGZvciByZWZlcmVuY2UgZXJyb3JzXG4gICAgICAgIGlmIChvcHRpb25zLnJlZmVyZW5jZSAmJiBvcHRpb25zLnJlZmVyZW5jZSAhPT0gXCJzdWZmaXhcIiAmJiBvcHRpb25zLnJlZmVyZW5jZSAhPT0gY29tcG9uZW50cy5yZWZlcmVuY2UpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMuZXJyb3IgPSBjb21wb25lbnRzLmVycm9yIHx8IFwiVVJJIGlzIG5vdCBhIFwiICsgb3B0aW9ucy5yZWZlcmVuY2UgKyBcIiByZWZlcmVuY2UuXCI7XG4gICAgICAgIH1cbiAgICAgICAgLy9maW5kIHNjaGVtZSBoYW5kbGVyXG4gICAgICAgIHZhciBzY2hlbWVIYW5kbGVyID0gU0NIRU1FU1sob3B0aW9ucy5zY2hlbWUgfHwgY29tcG9uZW50cy5zY2hlbWUgfHwgXCJcIikudG9Mb3dlckNhc2UoKV07XG4gICAgICAgIC8vY2hlY2sgaWYgc2NoZW1lIGNhbid0IGhhbmRsZSBJUklzXG4gICAgICAgIGlmICghb3B0aW9ucy51bmljb2RlU3VwcG9ydCAmJiAoIXNjaGVtZUhhbmRsZXIgfHwgIXNjaGVtZUhhbmRsZXIudW5pY29kZVN1cHBvcnQpKSB7XG4gICAgICAgICAgICAvL2lmIGhvc3QgY29tcG9uZW50IGlzIGEgZG9tYWluIG5hbWVcbiAgICAgICAgICAgIGlmIChjb21wb25lbnRzLmhvc3QgJiYgKG9wdGlvbnMuZG9tYWluSG9zdCB8fCBzY2hlbWVIYW5kbGVyICYmIHNjaGVtZUhhbmRsZXIuZG9tYWluSG9zdCkpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnZlcnQgVW5pY29kZSBJRE4gLT4gQVNDSUkgSUROXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50cy5ob3N0ID0gcHVueWNvZGUudG9BU0NJSShjb21wb25lbnRzLmhvc3QucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgcGN0RGVjQ2hhcnMpLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50cy5lcnJvciA9IGNvbXBvbmVudHMuZXJyb3IgfHwgXCJIb3N0J3MgZG9tYWluIG5hbWUgY2FuIG5vdCBiZSBjb252ZXJ0ZWQgdG8gQVNDSUkgdmlhIHB1bnljb2RlOiBcIiArIGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9jb252ZXJ0IElSSSAtPiBVUklcbiAgICAgICAgICAgIF9ub3JtYWxpemVDb21wb25lbnRFbmNvZGluZyhjb21wb25lbnRzLCBVUklfUFJPVE9DT0wpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9ub3JtYWxpemUgZW5jb2RpbmdzXG4gICAgICAgICAgICBfbm9ybWFsaXplQ29tcG9uZW50RW5jb2RpbmcoY29tcG9uZW50cywgcHJvdG9jb2wpO1xuICAgICAgICB9XG4gICAgICAgIC8vcGVyZm9ybSBzY2hlbWUgc3BlY2lmaWMgcGFyc2luZ1xuICAgICAgICBpZiAoc2NoZW1lSGFuZGxlciAmJiBzY2hlbWVIYW5kbGVyLnBhcnNlKSB7XG4gICAgICAgICAgICBzY2hlbWVIYW5kbGVyLnBhcnNlKGNvbXBvbmVudHMsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29tcG9uZW50cy5lcnJvciA9IGNvbXBvbmVudHMuZXJyb3IgfHwgXCJVUkkgY2FuIG5vdCBiZSBwYXJzZWQuXCI7XG4gICAgfVxuICAgIHJldHVybiBjb21wb25lbnRzO1xufVxuXG5mdW5jdGlvbiBfcmVjb21wb3NlQXV0aG9yaXR5KGNvbXBvbmVudHMsIG9wdGlvbnMpIHtcbiAgICB2YXIgcHJvdG9jb2wgPSBvcHRpb25zLmlyaSAhPT0gZmFsc2UgPyBJUklfUFJPVE9DT0wgOiBVUklfUFJPVE9DT0w7XG4gICAgdmFyIHVyaVRva2VucyA9IFtdO1xuICAgIGlmIChjb21wb25lbnRzLnVzZXJpbmZvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdXJpVG9rZW5zLnB1c2goY29tcG9uZW50cy51c2VyaW5mbyk7XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKFwiQFwiKTtcbiAgICB9XG4gICAgaWYgKGNvbXBvbmVudHMuaG9zdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vbm9ybWFsaXplIElQIGhvc3RzLCBhZGQgYnJhY2tldHMgYW5kIGVzY2FwZSB6b25lIHNlcGFyYXRvciBmb3IgSVB2NlxuICAgICAgICB1cmlUb2tlbnMucHVzaChfbm9ybWFsaXplSVB2Nihfbm9ybWFsaXplSVB2NChTdHJpbmcoY29tcG9uZW50cy5ob3N0KSwgcHJvdG9jb2wpLCBwcm90b2NvbCkucmVwbGFjZShwcm90b2NvbC5JUFY2QUREUkVTUywgZnVuY3Rpb24gKF8sICQxLCAkMikge1xuICAgICAgICAgICAgcmV0dXJuIFwiW1wiICsgJDEgKyAoJDIgPyBcIiUyNVwiICsgJDIgOiBcIlwiKSArIFwiXVwiO1xuICAgICAgICB9KSk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgY29tcG9uZW50cy5wb3J0ID09PSBcIm51bWJlclwiIHx8IHR5cGVvZiBjb21wb25lbnRzLnBvcnQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgdXJpVG9rZW5zLnB1c2goXCI6XCIpO1xuICAgICAgICB1cmlUb2tlbnMucHVzaChTdHJpbmcoY29tcG9uZW50cy5wb3J0KSk7XG4gICAgfVxuICAgIHJldHVybiB1cmlUb2tlbnMubGVuZ3RoID8gdXJpVG9rZW5zLmpvaW4oXCJcIikgOiB1bmRlZmluZWQ7XG59XG5cbnZhciBSRFMxID0gL15cXC5cXC4/XFwvLztcbnZhciBSRFMyID0gL15cXC9cXC4oXFwvfCQpLztcbnZhciBSRFMzID0gL15cXC9cXC5cXC4oXFwvfCQpLztcbnZhciBSRFM1ID0gL15cXC8/KD86LnxcXG4pKj8oPz1cXC98JCkvO1xuZnVuY3Rpb24gcmVtb3ZlRG90U2VnbWVudHMoaW5wdXQpIHtcbiAgICB2YXIgb3V0cHV0ID0gW107XG4gICAgd2hpbGUgKGlucHV0Lmxlbmd0aCkge1xuICAgICAgICBpZiAoaW5wdXQubWF0Y2goUkRTMSkpIHtcbiAgICAgICAgICAgIGlucHV0ID0gaW5wdXQucmVwbGFjZShSRFMxLCBcIlwiKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbnB1dC5tYXRjaChSRFMyKSkge1xuICAgICAgICAgICAgaW5wdXQgPSBpbnB1dC5yZXBsYWNlKFJEUzIsIFwiL1wiKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbnB1dC5tYXRjaChSRFMzKSkge1xuICAgICAgICAgICAgaW5wdXQgPSBpbnB1dC5yZXBsYWNlKFJEUzMsIFwiL1wiKTtcbiAgICAgICAgICAgIG91dHB1dC5wb3AoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbnB1dCA9PT0gXCIuXCIgfHwgaW5wdXQgPT09IFwiLi5cIikge1xuICAgICAgICAgICAgaW5wdXQgPSBcIlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGltID0gaW5wdXQubWF0Y2goUkRTNSk7XG4gICAgICAgICAgICBpZiAoaW0pIHtcbiAgICAgICAgICAgICAgICB2YXIgcyA9IGltWzBdO1xuICAgICAgICAgICAgICAgIGlucHV0ID0gaW5wdXQuc2xpY2Uocy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKHMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmV4cGVjdGVkIGRvdCBzZWdtZW50IGNvbmRpdGlvblwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0LmpvaW4oXCJcIik7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZShjb21wb25lbnRzKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IHt9O1xuXG4gICAgdmFyIHByb3RvY29sID0gb3B0aW9ucy5pcmkgPyBJUklfUFJPVE9DT0wgOiBVUklfUFJPVE9DT0w7XG4gICAgdmFyIHVyaVRva2VucyA9IFtdO1xuICAgIC8vZmluZCBzY2hlbWUgaGFuZGxlclxuICAgIHZhciBzY2hlbWVIYW5kbGVyID0gU0NIRU1FU1sob3B0aW9ucy5zY2hlbWUgfHwgY29tcG9uZW50cy5zY2hlbWUgfHwgXCJcIikudG9Mb3dlckNhc2UoKV07XG4gICAgLy9wZXJmb3JtIHNjaGVtZSBzcGVjaWZpYyBzZXJpYWxpemF0aW9uXG4gICAgaWYgKHNjaGVtZUhhbmRsZXIgJiYgc2NoZW1lSGFuZGxlci5zZXJpYWxpemUpIHNjaGVtZUhhbmRsZXIuc2VyaWFsaXplKGNvbXBvbmVudHMsIG9wdGlvbnMpO1xuICAgIGlmIChjb21wb25lbnRzLmhvc3QpIHtcbiAgICAgICAgLy9pZiBob3N0IGNvbXBvbmVudCBpcyBhbiBJUHY2IGFkZHJlc3NcbiAgICAgICAgaWYgKHByb3RvY29sLklQVjZBRERSRVNTLnRlc3QoY29tcG9uZW50cy5ob3N0KSkge31cbiAgICAgICAgLy9UT0RPOiBub3JtYWxpemUgSVB2NiBhZGRyZXNzIGFzIHBlciBSRkMgNTk1MlxuXG4gICAgICAgIC8vaWYgaG9zdCBjb21wb25lbnQgaXMgYSBkb21haW4gbmFtZVxuICAgICAgICBlbHNlIGlmIChvcHRpb25zLmRvbWFpbkhvc3QgfHwgc2NoZW1lSGFuZGxlciAmJiBzY2hlbWVIYW5kbGVyLmRvbWFpbkhvc3QpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnZlcnQgSUROIHZpYSBwdW55Y29kZVxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHMuaG9zdCA9ICFvcHRpb25zLmlyaSA/IHB1bnljb2RlLnRvQVNDSUkoY29tcG9uZW50cy5ob3N0LnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIHBjdERlY0NoYXJzKS50b0xvd2VyQ2FzZSgpKSA6IHB1bnljb2RlLnRvVW5pY29kZShjb21wb25lbnRzLmhvc3QpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50cy5lcnJvciA9IGNvbXBvbmVudHMuZXJyb3IgfHwgXCJIb3N0J3MgZG9tYWluIG5hbWUgY2FuIG5vdCBiZSBjb252ZXJ0ZWQgdG8gXCIgKyAoIW9wdGlvbnMuaXJpID8gXCJBU0NJSVwiIDogXCJVbmljb2RlXCIpICsgXCIgdmlhIHB1bnljb2RlOiBcIiArIGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgIH1cbiAgICAvL25vcm1hbGl6ZSBlbmNvZGluZ1xuICAgIF9ub3JtYWxpemVDb21wb25lbnRFbmNvZGluZyhjb21wb25lbnRzLCBwcm90b2NvbCk7XG4gICAgaWYgKG9wdGlvbnMucmVmZXJlbmNlICE9PSBcInN1ZmZpeFwiICYmIGNvbXBvbmVudHMuc2NoZW1lKSB7XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKGNvbXBvbmVudHMuc2NoZW1lKTtcbiAgICAgICAgdXJpVG9rZW5zLnB1c2goXCI6XCIpO1xuICAgIH1cbiAgICB2YXIgYXV0aG9yaXR5ID0gX3JlY29tcG9zZUF1dGhvcml0eShjb21wb25lbnRzLCBvcHRpb25zKTtcbiAgICBpZiAoYXV0aG9yaXR5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMucmVmZXJlbmNlICE9PSBcInN1ZmZpeFwiKSB7XG4gICAgICAgICAgICB1cmlUb2tlbnMucHVzaChcIi8vXCIpO1xuICAgICAgICB9XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKGF1dGhvcml0eSk7XG4gICAgICAgIGlmIChjb21wb25lbnRzLnBhdGggJiYgY29tcG9uZW50cy5wYXRoLmNoYXJBdCgwKSAhPT0gXCIvXCIpIHtcbiAgICAgICAgICAgIHVyaVRva2Vucy5wdXNoKFwiL1wiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoY29tcG9uZW50cy5wYXRoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmFyIHMgPSBjb21wb25lbnRzLnBhdGg7XG4gICAgICAgIGlmICghb3B0aW9ucy5hYnNvbHV0ZVBhdGggJiYgKCFzY2hlbWVIYW5kbGVyIHx8ICFzY2hlbWVIYW5kbGVyLmFic29sdXRlUGF0aCkpIHtcbiAgICAgICAgICAgIHMgPSByZW1vdmVEb3RTZWdtZW50cyhzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXV0aG9yaXR5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHMgPSBzLnJlcGxhY2UoL15cXC9cXC8vLCBcIi8lMkZcIik7IC8vZG9uJ3QgYWxsb3cgdGhlIHBhdGggdG8gc3RhcnQgd2l0aCBcIi8vXCJcbiAgICAgICAgfVxuICAgICAgICB1cmlUb2tlbnMucHVzaChzKTtcbiAgICB9XG4gICAgaWYgKGNvbXBvbmVudHMucXVlcnkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB1cmlUb2tlbnMucHVzaChcIj9cIik7XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKGNvbXBvbmVudHMucXVlcnkpO1xuICAgIH1cbiAgICBpZiAoY29tcG9uZW50cy5mcmFnbWVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKFwiI1wiKTtcbiAgICAgICAgdXJpVG9rZW5zLnB1c2goY29tcG9uZW50cy5mcmFnbWVudCk7XG4gICAgfVxuICAgIHJldHVybiB1cmlUb2tlbnMuam9pbihcIlwiKTsgLy9tZXJnZSB0b2tlbnMgaW50byBhIHN0cmluZ1xufVxuXG5mdW5jdGlvbiByZXNvbHZlQ29tcG9uZW50cyhiYXNlLCByZWxhdGl2ZSkge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiB7fTtcbiAgICB2YXIgc2tpcE5vcm1hbGl6YXRpb24gPSBhcmd1bWVudHNbM107XG5cbiAgICB2YXIgdGFyZ2V0ID0ge307XG4gICAgaWYgKCFza2lwTm9ybWFsaXphdGlvbikge1xuICAgICAgICBiYXNlID0gcGFyc2Uoc2VyaWFsaXplKGJhc2UsIG9wdGlvbnMpLCBvcHRpb25zKTsgLy9ub3JtYWxpemUgYmFzZSBjb21wb25lbnRzXG4gICAgICAgIHJlbGF0aXZlID0gcGFyc2Uoc2VyaWFsaXplKHJlbGF0aXZlLCBvcHRpb25zKSwgb3B0aW9ucyk7IC8vbm9ybWFsaXplIHJlbGF0aXZlIGNvbXBvbmVudHNcbiAgICB9XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgaWYgKCFvcHRpb25zLnRvbGVyYW50ICYmIHJlbGF0aXZlLnNjaGVtZSkge1xuICAgICAgICB0YXJnZXQuc2NoZW1lID0gcmVsYXRpdmUuc2NoZW1lO1xuICAgICAgICAvL3RhcmdldC5hdXRob3JpdHkgPSByZWxhdGl2ZS5hdXRob3JpdHk7XG4gICAgICAgIHRhcmdldC51c2VyaW5mbyA9IHJlbGF0aXZlLnVzZXJpbmZvO1xuICAgICAgICB0YXJnZXQuaG9zdCA9IHJlbGF0aXZlLmhvc3Q7XG4gICAgICAgIHRhcmdldC5wb3J0ID0gcmVsYXRpdmUucG9ydDtcbiAgICAgICAgdGFyZ2V0LnBhdGggPSByZW1vdmVEb3RTZWdtZW50cyhyZWxhdGl2ZS5wYXRoIHx8IFwiXCIpO1xuICAgICAgICB0YXJnZXQucXVlcnkgPSByZWxhdGl2ZS5xdWVyeTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocmVsYXRpdmUudXNlcmluZm8gIT09IHVuZGVmaW5lZCB8fCByZWxhdGl2ZS5ob3N0ICE9PSB1bmRlZmluZWQgfHwgcmVsYXRpdmUucG9ydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvL3RhcmdldC5hdXRob3JpdHkgPSByZWxhdGl2ZS5hdXRob3JpdHk7XG4gICAgICAgICAgICB0YXJnZXQudXNlcmluZm8gPSByZWxhdGl2ZS51c2VyaW5mbztcbiAgICAgICAgICAgIHRhcmdldC5ob3N0ID0gcmVsYXRpdmUuaG9zdDtcbiAgICAgICAgICAgIHRhcmdldC5wb3J0ID0gcmVsYXRpdmUucG9ydDtcbiAgICAgICAgICAgIHRhcmdldC5wYXRoID0gcmVtb3ZlRG90U2VnbWVudHMocmVsYXRpdmUucGF0aCB8fCBcIlwiKTtcbiAgICAgICAgICAgIHRhcmdldC5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFyZWxhdGl2ZS5wYXRoKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0LnBhdGggPSBiYXNlLnBhdGg7XG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlLnF1ZXJ5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnF1ZXJ5ID0gYmFzZS5xdWVyeTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChyZWxhdGl2ZS5wYXRoLmNoYXJBdCgwKSA9PT0gXCIvXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnBhdGggPSByZW1vdmVEb3RTZWdtZW50cyhyZWxhdGl2ZS5wYXRoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGJhc2UudXNlcmluZm8gIT09IHVuZGVmaW5lZCB8fCBiYXNlLmhvc3QgIT09IHVuZGVmaW5lZCB8fCBiYXNlLnBvcnQgIT09IHVuZGVmaW5lZCkgJiYgIWJhc2UucGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnBhdGggPSBcIi9cIiArIHJlbGF0aXZlLnBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWJhc2UucGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnBhdGggPSByZWxhdGl2ZS5wYXRoO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnBhdGggPSBiYXNlLnBhdGguc2xpY2UoMCwgYmFzZS5wYXRoLmxhc3RJbmRleE9mKFwiL1wiKSArIDEpICsgcmVsYXRpdmUucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0YXJnZXQucGF0aCA9IHJlbW92ZURvdFNlZ21lbnRzKHRhcmdldC5wYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGFyZ2V0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL3RhcmdldC5hdXRob3JpdHkgPSBiYXNlLmF1dGhvcml0eTtcbiAgICAgICAgICAgIHRhcmdldC51c2VyaW5mbyA9IGJhc2UudXNlcmluZm87XG4gICAgICAgICAgICB0YXJnZXQuaG9zdCA9IGJhc2UuaG9zdDtcbiAgICAgICAgICAgIHRhcmdldC5wb3J0ID0gYmFzZS5wb3J0O1xuICAgICAgICB9XG4gICAgICAgIHRhcmdldC5zY2hlbWUgPSBiYXNlLnNjaGVtZTtcbiAgICB9XG4gICAgdGFyZ2V0LmZyYWdtZW50ID0gcmVsYXRpdmUuZnJhZ21lbnQ7XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZShiYXNlVVJJLCByZWxhdGl2ZVVSSSwgb3B0aW9ucykge1xuICAgIHZhciBzY2hlbWVsZXNzT3B0aW9ucyA9IGFzc2lnbih7IHNjaGVtZTogJ251bGwnIH0sIG9wdGlvbnMpO1xuICAgIHJldHVybiBzZXJpYWxpemUocmVzb2x2ZUNvbXBvbmVudHMocGFyc2UoYmFzZVVSSSwgc2NoZW1lbGVzc09wdGlvbnMpLCBwYXJzZShyZWxhdGl2ZVVSSSwgc2NoZW1lbGVzc09wdGlvbnMpLCBzY2hlbWVsZXNzT3B0aW9ucywgdHJ1ZSksIHNjaGVtZWxlc3NPcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplKHVyaSwgb3B0aW9ucykge1xuICAgIGlmICh0eXBlb2YgdXJpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHVyaSA9IHNlcmlhbGl6ZShwYXJzZSh1cmksIG9wdGlvbnMpLCBvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVPZih1cmkpID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHVyaSA9IHBhcnNlKHNlcmlhbGl6ZSh1cmksIG9wdGlvbnMpLCBvcHRpb25zKTtcbiAgICB9XG4gICAgcmV0dXJuIHVyaTtcbn1cblxuZnVuY3Rpb24gZXF1YWwodXJpQSwgdXJpQiwgb3B0aW9ucykge1xuICAgIGlmICh0eXBlb2YgdXJpQSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICB1cmlBID0gc2VyaWFsaXplKHBhcnNlKHVyaUEsIG9wdGlvbnMpLCBvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVPZih1cmlBKSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICB1cmlBID0gc2VyaWFsaXplKHVyaUEsIG9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHVyaUIgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgdXJpQiA9IHNlcmlhbGl6ZShwYXJzZSh1cmlCLCBvcHRpb25zKSwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmICh0eXBlT2YodXJpQikgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgdXJpQiA9IHNlcmlhbGl6ZSh1cmlCLCBvcHRpb25zKTtcbiAgICB9XG4gICAgcmV0dXJuIHVyaUEgPT09IHVyaUI7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZUNvbXBvbmVudChzdHIsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gc3RyICYmIHN0ci50b1N0cmluZygpLnJlcGxhY2UoIW9wdGlvbnMgfHwgIW9wdGlvbnMuaXJpID8gVVJJX1BST1RPQ09MLkVTQ0FQRSA6IElSSV9QUk9UT0NPTC5FU0NBUEUsIHBjdEVuY0NoYXIpO1xufVxuXG5mdW5jdGlvbiB1bmVzY2FwZUNvbXBvbmVudChzdHIsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gc3RyICYmIHN0ci50b1N0cmluZygpLnJlcGxhY2UoIW9wdGlvbnMgfHwgIW9wdGlvbnMuaXJpID8gVVJJX1BST1RPQ09MLlBDVF9FTkNPREVEIDogSVJJX1BST1RPQ09MLlBDVF9FTkNPREVELCBwY3REZWNDaGFycyk7XG59XG5cbnZhciBoYW5kbGVyID0ge1xuICAgIHNjaGVtZTogXCJodHRwXCIsXG4gICAgZG9tYWluSG9zdDogdHJ1ZSxcbiAgICBwYXJzZTogZnVuY3Rpb24gcGFyc2UoY29tcG9uZW50cywgb3B0aW9ucykge1xuICAgICAgICAvL3JlcG9ydCBtaXNzaW5nIGhvc3RcbiAgICAgICAgaWYgKCFjb21wb25lbnRzLmhvc3QpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMuZXJyb3IgPSBjb21wb25lbnRzLmVycm9yIHx8IFwiSFRUUCBVUklzIG11c3QgaGF2ZSBhIGhvc3QuXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbXBvbmVudHM7XG4gICAgfSxcbiAgICBzZXJpYWxpemU6IGZ1bmN0aW9uIHNlcmlhbGl6ZShjb21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBzZWN1cmUgPSBTdHJpbmcoY29tcG9uZW50cy5zY2hlbWUpLnRvTG93ZXJDYXNlKCkgPT09IFwiaHR0cHNcIjtcbiAgICAgICAgLy9ub3JtYWxpemUgdGhlIGRlZmF1bHQgcG9ydFxuICAgICAgICBpZiAoY29tcG9uZW50cy5wb3J0ID09PSAoc2VjdXJlID8gNDQzIDogODApIHx8IGNvbXBvbmVudHMucG9ydCA9PT0gXCJcIikge1xuICAgICAgICAgICAgY29tcG9uZW50cy5wb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIC8vbm9ybWFsaXplIHRoZSBlbXB0eSBwYXRoXG4gICAgICAgIGlmICghY29tcG9uZW50cy5wYXRoKSB7XG4gICAgICAgICAgICBjb21wb25lbnRzLnBhdGggPSBcIi9cIjtcbiAgICAgICAgfVxuICAgICAgICAvL05PVEU6IFdlIGRvIG5vdCBwYXJzZSBxdWVyeSBzdHJpbmdzIGZvciBIVFRQIFVSSXNcbiAgICAgICAgLy9hcyBXV1cgRm9ybSBVcmwgRW5jb2RlZCBxdWVyeSBzdHJpbmdzIGFyZSBwYXJ0IG9mIHRoZSBIVE1MNCsgc3BlYyxcbiAgICAgICAgLy9hbmQgbm90IHRoZSBIVFRQIHNwZWMuXG4gICAgICAgIHJldHVybiBjb21wb25lbnRzO1xuICAgIH1cbn07XG5cbnZhciBoYW5kbGVyJDEgPSB7XG4gICAgc2NoZW1lOiBcImh0dHBzXCIsXG4gICAgZG9tYWluSG9zdDogaGFuZGxlci5kb21haW5Ib3N0LFxuICAgIHBhcnNlOiBoYW5kbGVyLnBhcnNlLFxuICAgIHNlcmlhbGl6ZTogaGFuZGxlci5zZXJpYWxpemVcbn07XG5cbmZ1bmN0aW9uIGlzU2VjdXJlKHdzQ29tcG9uZW50cykge1xuICAgIHJldHVybiB0eXBlb2Ygd3NDb21wb25lbnRzLnNlY3VyZSA9PT0gJ2Jvb2xlYW4nID8gd3NDb21wb25lbnRzLnNlY3VyZSA6IFN0cmluZyh3c0NvbXBvbmVudHMuc2NoZW1lKS50b0xvd2VyQ2FzZSgpID09PSBcIndzc1wiO1xufVxuLy9SRkMgNjQ1NVxudmFyIGhhbmRsZXIkMiA9IHtcbiAgICBzY2hlbWU6IFwid3NcIixcbiAgICBkb21haW5Ib3N0OiB0cnVlLFxuICAgIHBhcnNlOiBmdW5jdGlvbiBwYXJzZShjb21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciB3c0NvbXBvbmVudHMgPSBjb21wb25lbnRzO1xuICAgICAgICAvL2luZGljYXRlIGlmIHRoZSBzZWN1cmUgZmxhZyBpcyBzZXRcbiAgICAgICAgd3NDb21wb25lbnRzLnNlY3VyZSA9IGlzU2VjdXJlKHdzQ29tcG9uZW50cyk7XG4gICAgICAgIC8vY29uc3RydWN0IHJlc291Y2UgbmFtZVxuICAgICAgICB3c0NvbXBvbmVudHMucmVzb3VyY2VOYW1lID0gKHdzQ29tcG9uZW50cy5wYXRoIHx8ICcvJykgKyAod3NDb21wb25lbnRzLnF1ZXJ5ID8gJz8nICsgd3NDb21wb25lbnRzLnF1ZXJ5IDogJycpO1xuICAgICAgICB3c0NvbXBvbmVudHMucGF0aCA9IHVuZGVmaW5lZDtcbiAgICAgICAgd3NDb21wb25lbnRzLnF1ZXJ5ID0gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gd3NDb21wb25lbnRzO1xuICAgIH0sXG4gICAgc2VyaWFsaXplOiBmdW5jdGlvbiBzZXJpYWxpemUod3NDb21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgICAgIC8vbm9ybWFsaXplIHRoZSBkZWZhdWx0IHBvcnRcbiAgICAgICAgaWYgKHdzQ29tcG9uZW50cy5wb3J0ID09PSAoaXNTZWN1cmUod3NDb21wb25lbnRzKSA/IDQ0MyA6IDgwKSB8fCB3c0NvbXBvbmVudHMucG9ydCA9PT0gXCJcIikge1xuICAgICAgICAgICAgd3NDb21wb25lbnRzLnBvcnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy9lbnN1cmUgc2NoZW1lIG1hdGNoZXMgc2VjdXJlIGZsYWdcbiAgICAgICAgaWYgKHR5cGVvZiB3c0NvbXBvbmVudHMuc2VjdXJlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHdzQ29tcG9uZW50cy5zY2hlbWUgPSB3c0NvbXBvbmVudHMuc2VjdXJlID8gJ3dzcycgOiAnd3MnO1xuICAgICAgICAgICAgd3NDb21wb25lbnRzLnNlY3VyZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICAvL3JlY29uc3RydWN0IHBhdGggZnJvbSByZXNvdXJjZSBuYW1lXG4gICAgICAgIGlmICh3c0NvbXBvbmVudHMucmVzb3VyY2VOYW1lKSB7XG4gICAgICAgICAgICB2YXIgX3dzQ29tcG9uZW50cyRyZXNvdXJjID0gd3NDb21wb25lbnRzLnJlc291cmNlTmFtZS5zcGxpdCgnPycpLFxuICAgICAgICAgICAgICAgIF93c0NvbXBvbmVudHMkcmVzb3VyYzIgPSBzbGljZWRUb0FycmF5KF93c0NvbXBvbmVudHMkcmVzb3VyYywgMiksXG4gICAgICAgICAgICAgICAgcGF0aCA9IF93c0NvbXBvbmVudHMkcmVzb3VyYzJbMF0sXG4gICAgICAgICAgICAgICAgcXVlcnkgPSBfd3NDb21wb25lbnRzJHJlc291cmMyWzFdO1xuXG4gICAgICAgICAgICB3c0NvbXBvbmVudHMucGF0aCA9IHBhdGggJiYgcGF0aCAhPT0gJy8nID8gcGF0aCA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHdzQ29tcG9uZW50cy5xdWVyeSA9IHF1ZXJ5O1xuICAgICAgICAgICAgd3NDb21wb25lbnRzLnJlc291cmNlTmFtZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICAvL2ZvcmJpZCBmcmFnbWVudCBjb21wb25lbnRcbiAgICAgICAgd3NDb21wb25lbnRzLmZyYWdtZW50ID0gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gd3NDb21wb25lbnRzO1xuICAgIH1cbn07XG5cbnZhciBoYW5kbGVyJDMgPSB7XG4gICAgc2NoZW1lOiBcIndzc1wiLFxuICAgIGRvbWFpbkhvc3Q6IGhhbmRsZXIkMi5kb21haW5Ib3N0LFxuICAgIHBhcnNlOiBoYW5kbGVyJDIucGFyc2UsXG4gICAgc2VyaWFsaXplOiBoYW5kbGVyJDIuc2VyaWFsaXplXG59O1xuXG52YXIgTyA9IHt9O1xudmFyIGlzSVJJID0gdHJ1ZTtcbi8vUkZDIDM5ODZcbnZhciBVTlJFU0VSVkVEJCQgPSBcIltBLVphLXowLTlcXFxcLVxcXFwuXFxcXF9cXFxcflwiICsgKGlzSVJJID8gXCJcXFxceEEwLVxcXFx1MjAwRFxcXFx1MjAxMC1cXFxcdTIwMjlcXFxcdTIwMkYtXFxcXHVEN0ZGXFxcXHVGOTAwLVxcXFx1RkRDRlxcXFx1RkRGMC1cXFxcdUZGRUZcIiA6IFwiXCIpICsgXCJdXCI7XG52YXIgSEVYRElHJCQgPSBcIlswLTlBLUZhLWZdXCI7IC8vY2FzZS1pbnNlbnNpdGl2ZVxudmFyIFBDVF9FTkNPREVEJCA9IHN1YmV4cChzdWJleHAoXCIlW0VGZWZdXCIgKyBIRVhESUckJCArIFwiJVwiICsgSEVYRElHJCQgKyBIRVhESUckJCArIFwiJVwiICsgSEVYRElHJCQgKyBIRVhESUckJCkgKyBcInxcIiArIHN1YmV4cChcIiVbODlBLUZhLWZdXCIgKyBIRVhESUckJCArIFwiJVwiICsgSEVYRElHJCQgKyBIRVhESUckJCkgKyBcInxcIiArIHN1YmV4cChcIiVcIiArIEhFWERJRyQkICsgSEVYRElHJCQpKTsgLy9leHBhbmRlZFxuLy9SRkMgNTMyMiwgZXhjZXB0IHRoZXNlIHN5bWJvbHMgYXMgcGVyIFJGQyA2MDY4OiBAIDogLyA/ICMgWyBdICYgOyA9XG4vL2NvbnN0IEFURVhUJCQgPSBcIltBLVphLXowLTlcXFxcIVxcXFwjXFxcXCRcXFxcJVxcXFwmXFxcXCdcXFxcKlxcXFwrXFxcXC1cXFxcL1xcXFw9XFxcXD9cXFxcXlxcXFxfXFxcXGBcXFxce1xcXFx8XFxcXH1cXFxcfl1cIjtcbi8vY29uc3QgV1NQJCQgPSBcIltcXFxceDIwXFxcXHgwOV1cIjtcbi8vY29uc3QgT0JTX1FURVhUJCQgPSBcIltcXFxceDAxLVxcXFx4MDhcXFxceDBCXFxcXHgwQ1xcXFx4MEUtXFxcXHgxRlxcXFx4N0ZdXCI7ICAvLyglZDEtOCAvICVkMTEtMTIgLyAlZDE0LTMxIC8gJWQxMjcpXG4vL2NvbnN0IFFURVhUJCQgPSBtZXJnZShcIltcXFxceDIxXFxcXHgyMy1cXFxceDVCXFxcXHg1RC1cXFxceDdFXVwiLCBPQlNfUVRFWFQkJCk7ICAvLyVkMzMgLyAlZDM1LTkxIC8gJWQ5My0xMjYgLyBvYnMtcXRleHRcbi8vY29uc3QgVkNIQVIkJCA9IFwiW1xcXFx4MjEtXFxcXHg3RV1cIjtcbi8vY29uc3QgV1NQJCQgPSBcIltcXFxceDIwXFxcXHgwOV1cIjtcbi8vY29uc3QgT0JTX1FQJCA9IHN1YmV4cChcIlxcXFxcXFxcXCIgKyBtZXJnZShcIltcXFxceDAwXFxcXHgwRFxcXFx4MEFdXCIsIE9CU19RVEVYVCQkKSk7ICAvLyVkMCAvIENSIC8gTEYgLyBvYnMtcXRleHRcbi8vY29uc3QgRldTJCA9IHN1YmV4cChzdWJleHAoV1NQJCQgKyBcIipcIiArIFwiXFxcXHgwRFxcXFx4MEFcIikgKyBcIj9cIiArIFdTUCQkICsgXCIrXCIpO1xuLy9jb25zdCBRVU9URURfUEFJUiQgPSBzdWJleHAoc3ViZXhwKFwiXFxcXFxcXFxcIiArIHN1YmV4cChWQ0hBUiQkICsgXCJ8XCIgKyBXU1AkJCkpICsgXCJ8XCIgKyBPQlNfUVAkKTtcbi8vY29uc3QgUVVPVEVEX1NUUklORyQgPSBzdWJleHAoJ1xcXFxcIicgKyBzdWJleHAoRldTJCArIFwiP1wiICsgUUNPTlRFTlQkKSArIFwiKlwiICsgRldTJCArIFwiP1wiICsgJ1xcXFxcIicpO1xudmFyIEFURVhUJCQgPSBcIltBLVphLXowLTlcXFxcIVxcXFwkXFxcXCVcXFxcJ1xcXFwqXFxcXCtcXFxcLVxcXFxeXFxcXF9cXFxcYFxcXFx7XFxcXHxcXFxcfVxcXFx+XVwiO1xudmFyIFFURVhUJCQgPSBcIltcXFxcIVxcXFwkXFxcXCVcXFxcJ1xcXFwoXFxcXClcXFxcKlxcXFwrXFxcXCxcXFxcLVxcXFwuMC05XFxcXDxcXFxcPkEtWlxcXFx4NUUtXFxcXHg3RV1cIjtcbnZhciBWQ0hBUiQkID0gbWVyZ2UoUVRFWFQkJCwgXCJbXFxcXFxcXCJcXFxcXFxcXF1cIik7XG52YXIgU09NRV9ERUxJTVMkJCA9IFwiW1xcXFwhXFxcXCRcXFxcJ1xcXFwoXFxcXClcXFxcKlxcXFwrXFxcXCxcXFxcO1xcXFw6XFxcXEBdXCI7XG52YXIgVU5SRVNFUlZFRCA9IG5ldyBSZWdFeHAoVU5SRVNFUlZFRCQkLCBcImdcIik7XG52YXIgUENUX0VOQ09ERUQgPSBuZXcgUmVnRXhwKFBDVF9FTkNPREVEJCwgXCJnXCIpO1xudmFyIE5PVF9MT0NBTF9QQVJUID0gbmV3IFJlZ0V4cChtZXJnZShcIlteXVwiLCBBVEVYVCQkLCBcIltcXFxcLl1cIiwgJ1tcXFxcXCJdJywgVkNIQVIkJCksIFwiZ1wiKTtcbnZhciBOT1RfSEZOQU1FID0gbmV3IFJlZ0V4cChtZXJnZShcIlteXVwiLCBVTlJFU0VSVkVEJCQsIFNPTUVfREVMSU1TJCQpLCBcImdcIik7XG52YXIgTk9UX0hGVkFMVUUgPSBOT1RfSEZOQU1FO1xuZnVuY3Rpb24gZGVjb2RlVW5yZXNlcnZlZChzdHIpIHtcbiAgICB2YXIgZGVjU3RyID0gcGN0RGVjQ2hhcnMoc3RyKTtcbiAgICByZXR1cm4gIWRlY1N0ci5tYXRjaChVTlJFU0VSVkVEKSA/IHN0ciA6IGRlY1N0cjtcbn1cbnZhciBoYW5kbGVyJDQgPSB7XG4gICAgc2NoZW1lOiBcIm1haWx0b1wiLFxuICAgIHBhcnNlOiBmdW5jdGlvbiBwYXJzZSQkMShjb21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBtYWlsdG9Db21wb25lbnRzID0gY29tcG9uZW50cztcbiAgICAgICAgdmFyIHRvID0gbWFpbHRvQ29tcG9uZW50cy50byA9IG1haWx0b0NvbXBvbmVudHMucGF0aCA/IG1haWx0b0NvbXBvbmVudHMucGF0aC5zcGxpdChcIixcIikgOiBbXTtcbiAgICAgICAgbWFpbHRvQ29tcG9uZW50cy5wYXRoID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAobWFpbHRvQ29tcG9uZW50cy5xdWVyeSkge1xuICAgICAgICAgICAgdmFyIHVua25vd25IZWFkZXJzID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgaGVhZGVycyA9IHt9O1xuICAgICAgICAgICAgdmFyIGhmaWVsZHMgPSBtYWlsdG9Db21wb25lbnRzLnF1ZXJ5LnNwbGl0KFwiJlwiKTtcbiAgICAgICAgICAgIGZvciAodmFyIHggPSAwLCB4bCA9IGhmaWVsZHMubGVuZ3RoOyB4IDwgeGw7ICsreCkge1xuICAgICAgICAgICAgICAgIHZhciBoZmllbGQgPSBoZmllbGRzW3hdLnNwbGl0KFwiPVwiKTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGhmaWVsZFswXSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwidG9cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0b0FkZHJzID0gaGZpZWxkWzFdLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIF94ID0gMCwgX3hsID0gdG9BZGRycy5sZW5ndGg7IF94IDwgX3hsOyArK194KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG8ucHVzaCh0b0FkZHJzW194XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInN1YmplY3RcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWx0b0NvbXBvbmVudHMuc3ViamVjdCA9IHVuZXNjYXBlQ29tcG9uZW50KGhmaWVsZFsxXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImJvZHlcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWx0b0NvbXBvbmVudHMuYm9keSA9IHVuZXNjYXBlQ29tcG9uZW50KGhmaWVsZFsxXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHVua25vd25IZWFkZXJzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlcnNbdW5lc2NhcGVDb21wb25lbnQoaGZpZWxkWzBdLCBvcHRpb25zKV0gPSB1bmVzY2FwZUNvbXBvbmVudChoZmllbGRbMV0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHVua25vd25IZWFkZXJzKSBtYWlsdG9Db21wb25lbnRzLmhlYWRlcnMgPSBoZWFkZXJzO1xuICAgICAgICB9XG4gICAgICAgIG1haWx0b0NvbXBvbmVudHMucXVlcnkgPSB1bmRlZmluZWQ7XG4gICAgICAgIGZvciAodmFyIF94MiA9IDAsIF94bDIgPSB0by5sZW5ndGg7IF94MiA8IF94bDI7ICsrX3gyKSB7XG4gICAgICAgICAgICB2YXIgYWRkciA9IHRvW194Ml0uc3BsaXQoXCJAXCIpO1xuICAgICAgICAgICAgYWRkclswXSA9IHVuZXNjYXBlQ29tcG9uZW50KGFkZHJbMF0pO1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zLnVuaWNvZGVTdXBwb3J0KSB7XG4gICAgICAgICAgICAgICAgLy9jb252ZXJ0IFVuaWNvZGUgSUROIC0+IEFTQ0lJIElETlxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZHJbMV0gPSBwdW55Y29kZS50b0FTQ0lJKHVuZXNjYXBlQ29tcG9uZW50KGFkZHJbMV0sIG9wdGlvbnMpLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFpbHRvQ29tcG9uZW50cy5lcnJvciA9IG1haWx0b0NvbXBvbmVudHMuZXJyb3IgfHwgXCJFbWFpbCBhZGRyZXNzJ3MgZG9tYWluIG5hbWUgY2FuIG5vdCBiZSBjb252ZXJ0ZWQgdG8gQVNDSUkgdmlhIHB1bnljb2RlOiBcIiArIGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhZGRyWzFdID0gdW5lc2NhcGVDb21wb25lbnQoYWRkclsxXSwgb3B0aW9ucykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRvW194Ml0gPSBhZGRyLmpvaW4oXCJAXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYWlsdG9Db21wb25lbnRzO1xuICAgIH0sXG4gICAgc2VyaWFsaXplOiBmdW5jdGlvbiBzZXJpYWxpemUkJDEobWFpbHRvQ29tcG9uZW50cywgb3B0aW9ucykge1xuICAgICAgICB2YXIgY29tcG9uZW50cyA9IG1haWx0b0NvbXBvbmVudHM7XG4gICAgICAgIHZhciB0byA9IHRvQXJyYXkobWFpbHRvQ29tcG9uZW50cy50byk7XG4gICAgICAgIGlmICh0bykge1xuICAgICAgICAgICAgZm9yICh2YXIgeCA9IDAsIHhsID0gdG8ubGVuZ3RoOyB4IDwgeGw7ICsreCkge1xuICAgICAgICAgICAgICAgIHZhciB0b0FkZHIgPSBTdHJpbmcodG9beF0pO1xuICAgICAgICAgICAgICAgIHZhciBhdElkeCA9IHRvQWRkci5sYXN0SW5kZXhPZihcIkBcIik7XG4gICAgICAgICAgICAgICAgdmFyIGxvY2FsUGFydCA9IHRvQWRkci5zbGljZSgwLCBhdElkeCkucmVwbGFjZShQQ1RfRU5DT0RFRCwgZGVjb2RlVW5yZXNlcnZlZCkucmVwbGFjZShQQ1RfRU5DT0RFRCwgdG9VcHBlckNhc2UpLnJlcGxhY2UoTk9UX0xPQ0FMX1BBUlQsIHBjdEVuY0NoYXIpO1xuICAgICAgICAgICAgICAgIHZhciBkb21haW4gPSB0b0FkZHIuc2xpY2UoYXRJZHggKyAxKTtcbiAgICAgICAgICAgICAgICAvL2NvbnZlcnQgSUROIHZpYSBwdW55Y29kZVxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbWFpbiA9ICFvcHRpb25zLmlyaSA/IHB1bnljb2RlLnRvQVNDSUkodW5lc2NhcGVDb21wb25lbnQoZG9tYWluLCBvcHRpb25zKS50b0xvd2VyQ2FzZSgpKSA6IHB1bnljb2RlLnRvVW5pY29kZShkb21haW4pO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50cy5lcnJvciA9IGNvbXBvbmVudHMuZXJyb3IgfHwgXCJFbWFpbCBhZGRyZXNzJ3MgZG9tYWluIG5hbWUgY2FuIG5vdCBiZSBjb252ZXJ0ZWQgdG8gXCIgKyAoIW9wdGlvbnMuaXJpID8gXCJBU0NJSVwiIDogXCJVbmljb2RlXCIpICsgXCIgdmlhIHB1bnljb2RlOiBcIiArIGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRvW3hdID0gbG9jYWxQYXJ0ICsgXCJAXCIgKyBkb21haW47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21wb25lbnRzLnBhdGggPSB0by5qb2luKFwiLFwiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaGVhZGVycyA9IG1haWx0b0NvbXBvbmVudHMuaGVhZGVycyA9IG1haWx0b0NvbXBvbmVudHMuaGVhZGVycyB8fCB7fTtcbiAgICAgICAgaWYgKG1haWx0b0NvbXBvbmVudHMuc3ViamVjdCkgaGVhZGVyc1tcInN1YmplY3RcIl0gPSBtYWlsdG9Db21wb25lbnRzLnN1YmplY3Q7XG4gICAgICAgIGlmIChtYWlsdG9Db21wb25lbnRzLmJvZHkpIGhlYWRlcnNbXCJib2R5XCJdID0gbWFpbHRvQ29tcG9uZW50cy5ib2R5O1xuICAgICAgICB2YXIgZmllbGRzID0gW107XG4gICAgICAgIGZvciAodmFyIG5hbWUgaW4gaGVhZGVycykge1xuICAgICAgICAgICAgaWYgKGhlYWRlcnNbbmFtZV0gIT09IE9bbmFtZV0pIHtcbiAgICAgICAgICAgICAgICBmaWVsZHMucHVzaChuYW1lLnJlcGxhY2UoUENUX0VOQ09ERUQsIGRlY29kZVVucmVzZXJ2ZWQpLnJlcGxhY2UoUENUX0VOQ09ERUQsIHRvVXBwZXJDYXNlKS5yZXBsYWNlKE5PVF9IRk5BTUUsIHBjdEVuY0NoYXIpICsgXCI9XCIgKyBoZWFkZXJzW25hbWVdLnJlcGxhY2UoUENUX0VOQ09ERUQsIGRlY29kZVVucmVzZXJ2ZWQpLnJlcGxhY2UoUENUX0VOQ09ERUQsIHRvVXBwZXJDYXNlKS5yZXBsYWNlKE5PVF9IRlZBTFVFLCBwY3RFbmNDaGFyKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpZWxkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucXVlcnkgPSBmaWVsZHMuam9pbihcIiZcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbXBvbmVudHM7XG4gICAgfVxufTtcblxudmFyIFVSTl9QQVJTRSA9IC9eKFteXFw6XSspXFw6KC4qKS87XG4vL1JGQyAyMTQxXG52YXIgaGFuZGxlciQ1ID0ge1xuICAgIHNjaGVtZTogXCJ1cm5cIixcbiAgICBwYXJzZTogZnVuY3Rpb24gcGFyc2UkJDEoY29tcG9uZW50cywgb3B0aW9ucykge1xuICAgICAgICB2YXIgbWF0Y2hlcyA9IGNvbXBvbmVudHMucGF0aCAmJiBjb21wb25lbnRzLnBhdGgubWF0Y2goVVJOX1BBUlNFKTtcbiAgICAgICAgdmFyIHVybkNvbXBvbmVudHMgPSBjb21wb25lbnRzO1xuICAgICAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICAgICAgdmFyIHNjaGVtZSA9IG9wdGlvbnMuc2NoZW1lIHx8IHVybkNvbXBvbmVudHMuc2NoZW1lIHx8IFwidXJuXCI7XG4gICAgICAgICAgICB2YXIgbmlkID0gbWF0Y2hlc1sxXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgdmFyIG5zcyA9IG1hdGNoZXNbMl07XG4gICAgICAgICAgICB2YXIgdXJuU2NoZW1lID0gc2NoZW1lICsgXCI6XCIgKyAob3B0aW9ucy5uaWQgfHwgbmlkKTtcbiAgICAgICAgICAgIHZhciBzY2hlbWVIYW5kbGVyID0gU0NIRU1FU1t1cm5TY2hlbWVdO1xuICAgICAgICAgICAgdXJuQ29tcG9uZW50cy5uaWQgPSBuaWQ7XG4gICAgICAgICAgICB1cm5Db21wb25lbnRzLm5zcyA9IG5zcztcbiAgICAgICAgICAgIHVybkNvbXBvbmVudHMucGF0aCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChzY2hlbWVIYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgdXJuQ29tcG9uZW50cyA9IHNjaGVtZUhhbmRsZXIucGFyc2UodXJuQ29tcG9uZW50cywgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1cm5Db21wb25lbnRzLmVycm9yID0gdXJuQ29tcG9uZW50cy5lcnJvciB8fCBcIlVSTiBjYW4gbm90IGJlIHBhcnNlZC5cIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJuQ29tcG9uZW50cztcbiAgICB9LFxuICAgIHNlcmlhbGl6ZTogZnVuY3Rpb24gc2VyaWFsaXplJCQxKHVybkNvbXBvbmVudHMsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHNjaGVtZSA9IG9wdGlvbnMuc2NoZW1lIHx8IHVybkNvbXBvbmVudHMuc2NoZW1lIHx8IFwidXJuXCI7XG4gICAgICAgIHZhciBuaWQgPSB1cm5Db21wb25lbnRzLm5pZDtcbiAgICAgICAgdmFyIHVyblNjaGVtZSA9IHNjaGVtZSArIFwiOlwiICsgKG9wdGlvbnMubmlkIHx8IG5pZCk7XG4gICAgICAgIHZhciBzY2hlbWVIYW5kbGVyID0gU0NIRU1FU1t1cm5TY2hlbWVdO1xuICAgICAgICBpZiAoc2NoZW1lSGFuZGxlcikge1xuICAgICAgICAgICAgdXJuQ29tcG9uZW50cyA9IHNjaGVtZUhhbmRsZXIuc2VyaWFsaXplKHVybkNvbXBvbmVudHMsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB1cmlDb21wb25lbnRzID0gdXJuQ29tcG9uZW50cztcbiAgICAgICAgdmFyIG5zcyA9IHVybkNvbXBvbmVudHMubnNzO1xuICAgICAgICB1cmlDb21wb25lbnRzLnBhdGggPSAobmlkIHx8IG9wdGlvbnMubmlkKSArIFwiOlwiICsgbnNzO1xuICAgICAgICByZXR1cm4gdXJpQ29tcG9uZW50cztcbiAgICB9XG59O1xuXG52YXIgVVVJRCA9IC9eWzAtOUEtRmEtZl17OH0oPzpcXC1bMC05QS1GYS1mXXs0fSl7M31cXC1bMC05QS1GYS1mXXsxMn0kLztcbi8vUkZDIDQxMjJcbnZhciBoYW5kbGVyJDYgPSB7XG4gICAgc2NoZW1lOiBcInVybjp1dWlkXCIsXG4gICAgcGFyc2U6IGZ1bmN0aW9uIHBhcnNlKHVybkNvbXBvbmVudHMsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHV1aWRDb21wb25lbnRzID0gdXJuQ29tcG9uZW50cztcbiAgICAgICAgdXVpZENvbXBvbmVudHMudXVpZCA9IHV1aWRDb21wb25lbnRzLm5zcztcbiAgICAgICAgdXVpZENvbXBvbmVudHMubnNzID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAoIW9wdGlvbnMudG9sZXJhbnQgJiYgKCF1dWlkQ29tcG9uZW50cy51dWlkIHx8ICF1dWlkQ29tcG9uZW50cy51dWlkLm1hdGNoKFVVSUQpKSkge1xuICAgICAgICAgICAgdXVpZENvbXBvbmVudHMuZXJyb3IgPSB1dWlkQ29tcG9uZW50cy5lcnJvciB8fCBcIlVVSUQgaXMgbm90IHZhbGlkLlwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1dWlkQ29tcG9uZW50cztcbiAgICB9LFxuICAgIHNlcmlhbGl6ZTogZnVuY3Rpb24gc2VyaWFsaXplKHV1aWRDb21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciB1cm5Db21wb25lbnRzID0gdXVpZENvbXBvbmVudHM7XG4gICAgICAgIC8vbm9ybWFsaXplIFVVSURcbiAgICAgICAgdXJuQ29tcG9uZW50cy5uc3MgPSAodXVpZENvbXBvbmVudHMudXVpZCB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICByZXR1cm4gdXJuQ29tcG9uZW50cztcbiAgICB9XG59O1xuXG5TQ0hFTUVTW2hhbmRsZXIuc2NoZW1lXSA9IGhhbmRsZXI7XG5TQ0hFTUVTW2hhbmRsZXIkMS5zY2hlbWVdID0gaGFuZGxlciQxO1xuU0NIRU1FU1toYW5kbGVyJDIuc2NoZW1lXSA9IGhhbmRsZXIkMjtcblNDSEVNRVNbaGFuZGxlciQzLnNjaGVtZV0gPSBoYW5kbGVyJDM7XG5TQ0hFTUVTW2hhbmRsZXIkNC5zY2hlbWVdID0gaGFuZGxlciQ0O1xuU0NIRU1FU1toYW5kbGVyJDUuc2NoZW1lXSA9IGhhbmRsZXIkNTtcblNDSEVNRVNbaGFuZGxlciQ2LnNjaGVtZV0gPSBoYW5kbGVyJDY7XG5cbmV4cG9ydHMuU0NIRU1FUyA9IFNDSEVNRVM7XG5leHBvcnRzLnBjdEVuY0NoYXIgPSBwY3RFbmNDaGFyO1xuZXhwb3J0cy5wY3REZWNDaGFycyA9IHBjdERlY0NoYXJzO1xuZXhwb3J0cy5wYXJzZSA9IHBhcnNlO1xuZXhwb3J0cy5yZW1vdmVEb3RTZWdtZW50cyA9IHJlbW92ZURvdFNlZ21lbnRzO1xuZXhwb3J0cy5zZXJpYWxpemUgPSBzZXJpYWxpemU7XG5leHBvcnRzLnJlc29sdmVDb21wb25lbnRzID0gcmVzb2x2ZUNvbXBvbmVudHM7XG5leHBvcnRzLnJlc29sdmUgPSByZXNvbHZlO1xuZXhwb3J0cy5ub3JtYWxpemUgPSBub3JtYWxpemU7XG5leHBvcnRzLmVxdWFsID0gZXF1YWw7XG5leHBvcnRzLmVzY2FwZUNvbXBvbmVudCA9IGVzY2FwZUNvbXBvbmVudDtcbmV4cG9ydHMudW5lc2NhcGVDb21wb25lbnQgPSB1bmVzY2FwZUNvbXBvbmVudDtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXVyaS5hbGwuanMubWFwXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL3VyaS1qcy9kaXN0L2VzNS91cmkuYWxsLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL3VyaS1qcy9kaXN0L2VzNVwiKSJdfQ==
