(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
window.schedule = require('../lib/schedule');
}).call(this,require("pBGvAp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_4755ed93.js","/")
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
 * @returns {string} String with summary
 */
module.exports.summary = (schedule) => {
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
 * @param {*} options A locale string or array of locale (see Date.toLocaleString)
 * @param {*} locale An object that contains one or more properties that specify comparison options (see Date.toLocaleString)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9saWIvZmFrZV80NzU1ZWQ5My5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL2xpYi9tb2RlbHMuanNvbiIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL2xpYi9zY2hlZHVsZS5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL2xpYi90b29scy5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2Fqdi5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2NhY2hlLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS9hc3luYy5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvZXJyb3JfY2xhc3Nlcy5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvZm9ybWF0cy5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvaW5kZXguanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL3Jlc29sdmUuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL3J1bGVzLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS9zY2hlbWFfb2JqLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS91Y3MybGVuZ3RoLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS91dGlsLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZGF0YS5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RlZmluaXRpb25fc2NoZW1hLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvX2xpbWl0LmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvX2xpbWl0SXRlbXMuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9fbGltaXRMZW5ndGguanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9fbGltaXRQcm9wZXJ0aWVzLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvYWxsT2YuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9hbnlPZi5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2NvbW1lbnQuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9jb25zdC5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2NvbnRhaW5zLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvY3VzdG9tLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvZGVwZW5kZW5jaWVzLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvZW51bS5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2Zvcm1hdC5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2lmLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvaW5kZXguanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9pdGVtcy5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL211bHRpcGxlT2YuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9ub3QuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9vbmVPZi5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL3BhdHRlcm4uanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9wcm9wZXJ0aWVzLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvcHJvcGVydHlOYW1lcy5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL3JlZi5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL3JlcXVpcmVkLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvdW5pcXVlSXRlbXMuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy92YWxpZGF0ZS5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL2tleXdvcmQuanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvYWp2L2xpYi9yZWZzL2RhdGEuanNvbiIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9hanYvbGliL3JlZnMvanNvbi1zY2hlbWEtZHJhZnQtMDcuanNvbiIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIi9ob21lL21ham9yL19jb2RlL3NjaGVkdWxhdG9yL25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvZmFzdC1kZWVwLWVxdWFsL2luZGV4LmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2Zhc3QtanNvbi1zdGFibGUtc3RyaW5naWZ5L2luZGV4LmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvanNvbi1zY2hlbWEtdHJhdmVyc2UvaW5kZXguanMiLCIvaG9tZS9tYWpvci9fY29kZS9zY2hlZHVsYXRvci9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL2hvbWUvbWFqb3IvX2NvZGUvc2NoZWR1bGF0b3Ivbm9kZV9tb2R1bGVzL3VyaS1qcy9kaXN0L2VzNS91cmkuYWxsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcllBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmxDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG53aW5kb3cuc2NoZWR1bGUgPSByZXF1aXJlKCcuLi9saWIvc2NoZWR1bGUnKTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvZmFrZV80NzU1ZWQ5My5qc1wiLFwiL1wiKSIsIm1vZHVsZS5leHBvcnRzPXtcbiAgICBcInNjaGVkdWxlU2NoZW1hXCI6IHtcbiAgICAgICAgXCIkaWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vc2NoZWR1bGVcIixcbiAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9vbmVUaW1lXCJ9LFxuICAgICAgICAgICAge1wiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvZGFpbHlcIn0sXG4gICAgICAgICAgICB7XCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy93ZWVrbHlcIn0sXG4gICAgICAgICAgICB7XCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9tb250aGx5XCJ9XG4gICAgICAgIF0sXG4gICAgICAgIFwiZGVmaW5pdGlvbnNcIjoge1xuICAgICAgICAgICAgXCJvbmVUaW1lXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgICAgICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjoge1widHlwZVwiOiBcInN0cmluZ1wifSxcbiAgICAgICAgICAgICAgICAgICAgXCJlbmFibGVkXCI6IHtcInR5cGVcIjogXCJib29sZWFuXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcIm9uZVRpbWVcIjoge1widHlwZVwiOiBcInN0cmluZ1wiLCBcImZvcm1hdFwiOiBcImRhdGUtdGltZVwifVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXCJhZGRpdGlvbmFsUHJvcGVydGllc1wiOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBcInJlcXVpcmVkXCI6IFtcIm9uZVRpbWVcIl0gIFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZGFpbHlcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcImVuYWJsZWRcIjoge1widHlwZVwiOiBcImJvb2xlYW5cIn0sXG4gICAgICAgICAgICAgICAgICAgIFwic3RhcnREYXRlVGltZVwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCIsIFwiZm9ybWF0XCI6IFwiZGF0ZS10aW1lXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcImVuZERhdGVUaW1lXCI6IHtcInR5cGVcIjogXCJzdHJpbmdcIiwgXCJmb3JtYXRcIjogXCJkYXRlLXRpbWVcIn0sXG4gICAgICAgICAgICAgICAgICAgIFwiZWFjaE5EYXlcIjoge1widHlwZVwiOiBcImludGVnZXJcIiwgXCJtaW5pbXVtXCI6IDF9LFxuICAgICAgICAgICAgICAgICAgICBcImRhaWx5RnJlcXVlbmN5XCI6IHtcIiRyZWZcIjogXCJkYWlseSMvXCJ9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIFwicmVxdWlyZWRcIjogW1wic3RhcnREYXRlVGltZVwiLCBcImVhY2hORGF5XCIsIFwiZGFpbHlGcmVxdWVuY3lcIl1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIndlZWtseVwiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IHtcInR5cGVcIjogXCJzdHJpbmdcIn0sXG4gICAgICAgICAgICAgICAgICAgIFwiZW5hYmxlZFwiOiB7XCJ0eXBlXCI6IFwiYm9vbGVhblwifSxcbiAgICAgICAgICAgICAgICAgICAgXCJzdGFydERhdGVUaW1lXCI6IHtcInR5cGVcIjogXCJzdHJpbmdcIiwgXCJmb3JtYXRcIjogXCJkYXRlLXRpbWVcIn0sXG4gICAgICAgICAgICAgICAgICAgIFwiZW5kRGF0ZVRpbWVcIjoge1widHlwZVwiOiBcInN0cmluZ1wiLCBcImZvcm1hdFwiOiBcImRhdGUtdGltZVwifSxcbiAgICAgICAgICAgICAgICAgICAgXCJlYWNoTldlZWtcIjoge1widHlwZVwiOiBcImludGVnZXJcIiwgXCJtaW5pbXVtXCI6IDF9LFxuICAgICAgICAgICAgICAgICAgICBcImRheU9mV2Vla1wiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ1bmlxdWVJdGVtc1wiOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7IFwiZW51bVwiOiBbXCJzdW5cIiwgXCJtb25cIiwgXCJ0dWVcIiwgXCJ3ZWRcIiwgXCJ0aHVcIiwgXCJmcmlcIiwgXCJzYXRcIl0gfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYWRkaXRpb25hbEl0ZW1zXCI6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIFwiZGFpbHlGcmVxdWVuY3lcIjoge1wiJHJlZlwiOiBcImRhaWx5Iy9cIn1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFwiYWRkaXRpb25hbFByb3BlcnRpZXNcIjogZmFsc2UsXG4gICAgICAgICAgICAgICAgXCJyZXF1aXJlZFwiOiBbXCJzdGFydERhdGVUaW1lXCIsIFwiZWFjaE5XZWVrXCIsIFwiZGF5T2ZXZWVrXCIsIFwiZGFpbHlGcmVxdWVuY3lcIl1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIm1vbnRobHlcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcImVuYWJsZWRcIjoge1widHlwZVwiOiBcImJvb2xlYW5cIn0sXG4gICAgICAgICAgICAgICAgICAgIFwic3RhcnREYXRlVGltZVwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCIsIFwiZm9ybWF0XCI6IFwiZGF0ZS10aW1lXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcImVuZERhdGVUaW1lXCI6IHtcInR5cGVcIjogXCJzdHJpbmdcIiwgXCJmb3JtYXRcIjogXCJkYXRlLXRpbWVcIn0sXG4gICAgICAgICAgICAgICAgICAgIFwibW9udGhcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSXRlbXNcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiaXRlbXNcIjogeyBcImVudW1cIjogW1wiamFuXCIsIFwiZmViXCIsIFwibWFyXCIsIFwiYXByXCIsIFwibWF5XCIsIFwianVuXCIsIFwianVsXCIsIFwiYXVnXCIsIFwic2VwXCIsIFwib2N0XCIsIFwibm92XCIsIFwiZGVjXCJdIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxJdGVtc1wiOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcImRheVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ1bmlxdWVJdGVtc1wiOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XCJ0eXBlXCI6IFwiaW50ZWdlclwiLCBcIm1pbmltdW1cIjogMSwgXCJtYXhpbXVtXCI6IDMxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYWRkaXRpb25hbEl0ZW1zXCI6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIFwiZGFpbHlGcmVxdWVuY3lcIjoge1wiJHJlZlwiOiBcImRhaWx5Iy9cIn1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFwiYWRkaXRpb25hbFByb3BlcnRpZXNcIjogZmFsc2UsXG4gICAgICAgICAgICAgICAgXCJyZXF1aXJlZFwiOiBbXCJzdGFydERhdGVUaW1lXCIsIFwibW9udGhcIiwgXCJkYXlcIiwgXCJkYWlseUZyZXF1ZW5jeVwiXVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuLFxuICBcInNjaGVkdWxlU2NoZW1hRGFpbHlcIjoge1xuICAgICAgICBcIiRpZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9kYWlseVwiLFxuICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL29uY2VcIn0sXG4gICAgICAgICAgICB7XCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9ldmVyeVwifVxuICAgICAgICBdLFxuICAgICAgICBcImRlZmluaXRpb25zXCI6IHtcbiAgICAgICAgICAgIFwib25jZVwiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsIFxuICAgICAgICAgICAgICAgIFwicHJvcGVydGllc1wiOiB7IFwib2NjdXJzT25jZUF0XCI6IHtcInR5cGVcIjogXCJzdHJpbmdcIiwgXCJmb3JtYXRcIjogXCJ0aW1lXCJ9fSxcbiAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIFwicmVxdWlyZWRcIjogW1wib2NjdXJzT25jZUF0XCJdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJldmVyeVwiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsIFxuICAgICAgICAgICAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwic3RhcnRcIjoge1widHlwZVwiOiBcInN0cmluZ1wiLCBcImZvcm1hdFwiOiBcInRpbWVcIn0sXG4gICAgICAgICAgICAgICAgICAgIFwiZW5kXCI6IHtcInR5cGVcIjogXCJzdHJpbmdcIiwgXCJmb3JtYXRcIjogXCJ0aW1lXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcIm9jY3Vyc0V2ZXJ5XCI6IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJvYmplY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgICAgICBcInByb3BlcnRpZXNcIjogeyAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImludGVydmFsVmFsdWVcIjoge1widHlwZVwiOiBcImludGVnZXJcIiwgXCJtaW5pbXVtXCI6IDF9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiaW50ZXJ2YWxUeXBlXCI6IHsgXCJ0eXBlXCI6IFwic3RyaW5nXCIsIFwiZW51bVwiOiBbXCJtaW51dGVcIiwgXCJob3VyXCJdIH0gICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJyZXF1aXJlZFwiOiBbXCJpbnRlcnZhbFZhbHVlXCIsIFwiaW50ZXJ2YWxUeXBlXCJdXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFwiYWRkaXRpb25hbFByb3BlcnRpZXNcIjogZmFsc2UsXG4gICAgICAgICAgICAgICAgXCJyZXF1aXJlZFwiOiBbXCJzdGFydFwiLCBcIm9jY3Vyc0V2ZXJ5XCJdXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59IiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyogZXNsaW50LWRpc2FibGUgbm8tcHJvdG90eXBlLWJ1aWx0aW5zICovXG4vL1NjaGVkdWxlIG1haW4gZW5naW5lXG5sZXQgZ2V0RGF0ZVRpbWUgPSByZXF1aXJlKFwiLi90b29sc1wiKS5nZXREYXRlVGltZTtcbmxldCBhZGREYXRlID0gcmVxdWlyZShcIi4vdG9vbHNcIikuYWRkRGF0ZTtcbmxldCBwYXJzZURhdGVUaW1lID0gcmVxdWlyZShcIi4vdG9vbHNcIikucGFyc2VEYXRlVGltZTtcbmxldCBmb3JtYXREYXRlVGltZSA9IHJlcXVpcmUoXCIuL3Rvb2xzXCIpLmZvcm1hdERhdGVUaW1lO1xubGV0IG1vbnRoTGlzdCA9IHJlcXVpcmUoXCIuL3Rvb2xzXCIpLm1vbnRoTGlzdDtcbmxldCB3ZWVrRGF5TGlzdCA9IHJlcXVpcmUoXCIuL3Rvb2xzXCIpLndlZWtEYXlMaXN0O1xubGV0IHNjaGVkdWxlTW9kZWwgPSByZXF1aXJlKFwiLi9tb2RlbHMuanNvblwiKTtcbnZhciBBanYgPSByZXF1aXJlKFwiYWp2XCIpO1xubGV0IGFqdiA9IG5ldyBBanYoKTtcbmFqdi5hZGRTY2hlbWEoc2NoZWR1bGVNb2RlbC5zY2hlZHVsZVNjaGVtYURhaWx5KTtcblxuLyoqXG4gKiBDYWxjdWxhdGVzIG5leHQgcnVuIHRpbWUgZm9yIGFscmVhZHkgY2FsY3VsYXRlZCBkYXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY2hlZHVsZSBTY2hlZHVsZSBmb3Igd2hpY2ggbmV4dCBydW4gdGltZSBzaG91bGQgYmUgY2FsY3VsYXRlZFxuICogQHBhcmFtIHtPYmplY3R9IHJ1bkRhdGUgRGF5IG9mIG5leHQgcnVuIHdpdGggMDA6MDAgdGltZVxuICogQHJldHVybnMge09iamVjdH0gTmV4dCBydW4gZGF0ZSBhbmQgdGltZSBvciBudWxsIGluIGNhc2UgaWYgbmV4dCBydW4gdGltZSBpcyBvdXQgb2YgcnVuRGF0ZSByYW5nZSAoZS5nLiBhdHRlbXB0IHRvIGNhbGN1bGF0ZSAnZWFjaCAxMyBob3VycycgYXQgMTk6MDApIFxuICogb3IgYWxyZWFkeSBpbiBwYXN0IChlLmcuIGF0dGVtcHQgdG8gY2FsY3VsYXRlICcxMTowMCcgYXQgMTE6MDUpXG4gKi9cbmZ1bmN0aW9uIGNhbGN1bGF0ZVRpbWVPZlJ1bihzY2hlZHVsZSwgcnVuRGF0ZSkgeyAgXG4gIC8vYXMgd2l0aCBzaW1wbGUgPSByZWYgd2lsbCBiZSBjcmVhdGVkIHdlIG5lZWQgdG8gY2xvbmUgRGF0ZSBvYmplY3RcbiAgbGV0IHJ1bkRhdGVUaW1lID0gbmV3IERhdGUocnVuRGF0ZSk7ICAgIFxuXG4gIGlmKHNjaGVkdWxlLmRhaWx5RnJlcXVlbmN5Lmhhc093blByb3BlcnR5KFwib2NjdXJzT25jZUF0XCIpKSB7XG4gICAgbGV0IHRpbWUgPSBzY2hlZHVsZS5kYWlseUZyZXF1ZW5jeS5vY2N1cnNPbmNlQXQuc3BsaXQoXCI6XCIpO1xuICAgIHJ1bkRhdGVUaW1lLnNldFVUQ0hvdXJzKHRpbWVbMF0sIHRpbWVbMV0sIHRpbWVbMl0pOyAvL2l0IHNob3VsZCBwdXQgdGltZSBpbiBVVEMsIGJ1dCBpdCBwdXRzIGl0IGluIGxvY2FsICAgICAgICBcbiAgICBpZihydW5EYXRlVGltZSA+IGdldERhdGVUaW1lKCkgJiYgcnVuRGF0ZVRpbWUgPj0gcGFyc2VEYXRlVGltZShzY2hlZHVsZS5zdGFydERhdGVUaW1lKSlcbiAgICAgIHJldHVybiBydW5EYXRlVGltZTtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gbnVsbDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICB9XG5cbiAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgICovXG4gIGlmKHNjaGVkdWxlLmRhaWx5RnJlcXVlbmN5Lmhhc093blByb3BlcnR5KFwib2NjdXJzRXZlcnlcIikpIHtcblxuICAgIGxldCB0aW1lID0gc2NoZWR1bGUuZGFpbHlGcmVxdWVuY3kuc3RhcnQuc3BsaXQoXCI6XCIpO1xuICAgIC8vbWlsbGlzZWNvbmRzIHNob3VsZCBiZSByZW1vdmVkP1xuICAgIHJ1bkRhdGVUaW1lLnNldFVUQ0hvdXJzKHRpbWVbMF0sIHRpbWVbMV0sIHRpbWVbMl0sIDApO1xuICAgIHdoaWxlKHJ1bkRhdGVUaW1lIDwgZ2V0RGF0ZVRpbWUoKSkge1xuICAgICAgLy9UT0RPIG5pY2UgdG8gaGF2ZSBpbnRlcnZhbCBsaWtlIDAzOjMwIChib3RoIGhvdXIgYW5kIG1pbnV0ZXMpXG4gICAgICBzd2l0Y2goc2NoZWR1bGUuZGFpbHlGcmVxdWVuY3kub2NjdXJzRXZlcnkuaW50ZXJ2YWxUeXBlKSB7XG4gICAgICBjYXNlIFwibWludXRlXCI6XG4gICAgICAgIHJ1bkRhdGVUaW1lID0gYWRkRGF0ZShydW5EYXRlVGltZSwgMCwgMCwgMCwgMCwgc2NoZWR1bGUuZGFpbHlGcmVxdWVuY3kub2NjdXJzRXZlcnkuaW50ZXJ2YWxWYWx1ZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImhvdXJcIjpcbiAgICAgICAgcnVuRGF0ZVRpbWUgPSBhZGREYXRlKHJ1bkRhdGVUaW1lLCAwLCAwLCAwLCBzY2hlZHVsZS5kYWlseUZyZXF1ZW5jeS5vY2N1cnNFdmVyeS5pbnRlcnZhbFZhbHVlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYoc2NoZWR1bGUuZGFpbHlGcmVxdWVuY3kuaGFzT3duUHJvcGVydHkoXCJlbmRcIikpIHtcbiAgICAgIGxldCBzdGFydFRpbWUgPSBzY2hlZHVsZS5kYWlseUZyZXF1ZW5jeS5zdGFydC5zcGxpdChcIjpcIik7XG4gICAgICBsZXQgZW5kVGltZSA9IHNjaGVkdWxlLmRhaWx5RnJlcXVlbmN5LmVuZC5zcGxpdChcIjpcIik7XG4gICAgICBsZXQgZGFpbHlTdGFydERhdGVUaW1lID0gYWRkRGF0ZShydW5EYXRlLCAwLCAwLCAwLCBzdGFydFRpbWVbMF0sIHN0YXJ0VGltZVsxXSwgc3RhcnRUaW1lWzJdLCAwKTtcbiAgICAgIGxldCBkYWlseUVuZERhdGVUaW1lID0gYWRkRGF0ZShydW5EYXRlLCAwLCAwLCAwLCBlbmRUaW1lWzBdLCBlbmRUaW1lWzFdLCBlbmRUaW1lWzJdLCAwKTtcbiAgICAgICAgICAgIFxuICAgICAgLy9kYWlseSBzY2hlZHVsZSBzdGFydCB0aW1lIGlzIGxhdGUgb3Igc2FtZSBhcyBlbmQgdGltZSBPUiBjYWxjdWxhdGVkIHRpbWUgb2YgcnVuIGlzIGxhdGVyIHRoYW4gZGFpbHkgc2NoZWR1bGUgZW5kIHRpbWVcbiAgICAgIGlmKGRhaWx5U3RhcnREYXRlVGltZSA+PSBkYWlseUVuZERhdGVUaW1lIHx8IHJ1bkRhdGVUaW1lID49IGRhaWx5RW5kRGF0ZVRpbWUpXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmKHJ1bkRhdGUuZ2V0VVRDRGF0ZSgpID09IHJ1bkRhdGVUaW1lLmdldFVUQ0RhdGUoKSkgICAgICAgIFxuICAgICAgcmV0dXJuIHJ1bkRhdGVUaW1lOyAgIFxuICAgIGVsc2VcbiAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgfVxufVxuLyoqXG4gKiBTY2FucyB3ZWVrIHdoaWNoIHN0YXJ0cyB3aXRoIHdlZWtTdGFydCBhbmQgdHJpZXMgdG8gZmluZCBkYXRlIGZvciBydW5cbiAqIEBwYXJhbSB7T2JqZWN0fSBzY2hlZHVsZSBTY2hlZHVsZSBmb3Igd2hpY2ggbmV4dCBydW4gdGltZSBzaG91bGQgYmUgY2FsY3VsYXRlZFxuICogQHBhcmFtIHtPYmplY3R9IHdlZWtTdGFydCBEYXRlIG9mIHN1bmRheSAoMCBkYXkgb2Ygd2VlaylcbiAqIEByZXR1cm5zIHtPYmplY3R9IERhdGUgb3IgbmV4dCBydW4gb3IgbnVsbCBpbiBjYXNlIGlmIGRhdGUgd2FzIG5vdCBjYWxjdWxhdGVkXG4gKi9cbmZ1bmN0aW9uIGNhbGN1bGF0ZVdlZWtEYXlPZlJ1bihzY2hlZHVsZSwgd2Vla1N0YXJ0KSB7XG4gIGxldCBjdXJyZW50RGF5ID0gd2Vla1N0YXJ0O1xuICBsZXQgd2Vla0RheUxhc3RJbmRleCA9IDA7XG4gIC8vc29ydCBsaXN0IG9mIHdlZWsgZGF5cyBpbiBjb3JyZWN0IG9yZGVyXG4gIHNjaGVkdWxlLmRheU9mV2VlayA9IHNjaGVkdWxlLmRheU9mV2Vlay5zb3J0KChhLCBiKSA9PiB3ZWVrRGF5TGlzdC5pbmRleE9mKGEpIC0gd2Vla0RheUxpc3QuaW5kZXhPZihiKSk7ICAgXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2NoZWR1bGUuZGF5T2ZXZWVrLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IHdlZWtEYXlJbmRleCA9IHdlZWtEYXlMaXN0LmluZGV4T2Yoc2NoZWR1bGUuZGF5T2ZXZWVrW2ldKTtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAgKi9cbiAgICBpZih3ZWVrRGF5SW5kZXggIT0gLTEpIHtcbiAgICAgIGN1cnJlbnREYXkgPSBhZGREYXRlKGN1cnJlbnREYXksIDAsIDAsIHdlZWtEYXlJbmRleCAtIHdlZWtEYXlMYXN0SW5kZXgpO1xuICAgICAgd2Vla0RheUxhc3RJbmRleCA9IHdlZWtEYXlJbmRleDtcbiAgICAgIC8vZGF5IGNhbGN1bGF0aW5nIHRpbWUgZm91bmQgLSBkb24ndCBnbyBuZXh0XG4gICAgICBsZXQgY2FsY3VsYXRpb25SZXN1bHQgPSBjYWxjdWxhdGVUaW1lT2ZSdW4oc2NoZWR1bGUsIGN1cnJlbnREYXkpO1xuICAgICAgaWYoY2FsY3VsYXRpb25SZXN1bHQpIHsgICAgICAgICBcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi8gICBcbiAgICAgICAgaWYoY2FsY3VsYXRpb25SZXN1bHQgPiBwYXJzZURhdGVUaW1lKHNjaGVkdWxlLnN0YXJ0RGF0ZVRpbWUpKVxuICAgICAgICAgIHJldHVybiBjYWxjdWxhdGlvblJlc3VsdDtcbiAgICAgICAgY3VycmVudERheSA9IGNhbGN1bGF0aW9uUmVzdWx0O1xuICAgICAgfVxuICAgIH0gICAgICAgIFxuICB9ICAgXG4gIHJldHVybiBudWxsO1xufVxuLyoqXG4gKiBAdHlwZWRlZiB7T2JqZWN0fSBuZXh0T2NjdXJyZW5jZVJlc3VsdFxuICogQHByb3BlcnR5IHtPYmplY3R9IHJlc3VsdCBDYWxjdWxhdGlvbiByZXN1bHQuIFVUQyBkYXRlIGFuZCB0aW1lIG9mIG5lYXJlc3QgbmV4dCBvY2N1cnJlbmNlIG9mIHNjaGVkdWxlT2JqZWN0IGluIElTTyBmb3JtYXQgKGUuZy4gMjAxOS0wMS0wMVQwMTowMDowMC4wMDBaKVxuICogQHByb3BlcnR5IHtzdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UgaW4gY2FzZSBuZXh0IG9jY3VycmVuY2UgY2FsY3VsYXRpb24gZmFpbGVkXG4gKi9cbi8qKlxuICogQ2FsY3VsYXRlcyBuZXh0IHJ1biBkYXRlIGFuZCB0aW1lIFxuICogQHBhcmFtIHtPYmplY3R9IHNjaGVkdWxlIFNjaGVkdWxlIGZvciB3aGljaCBuZXh0IHJ1biBkYXRlIGFuZCB0aW1lIHNob3VsZCBiZSBjYWxjdWxhdGVkXG4gKiBAcmV0dXJucyB7bmV4dE9jY3VycmVuY2VSZXN1bHR9IFJlc3VsdCBvZiBuZXh0IG9jY3VycmVuY2UgY2FsY3VsYXRpb25cbiAqLyBcbm1vZHVsZS5leHBvcnRzLm5leHRPY2N1cnJlbmNlID0gKHNjaGVkdWxlKSA9PiB7ICAgICBcbiAgLy9jaGVjayBpZiBzY2hlZHVsZSBpcyBhIHZhbGlkIEpTT04gb2JqZWN0ICAgIFxuICBsZXQgdmFsaWRhdGUgPSBhanYuY29tcGlsZShzY2hlZHVsZU1vZGVsLnNjaGVkdWxlU2NoZW1hKTtcbiAgbGV0IHZhbGlkID0gdmFsaWRhdGUoc2NoZWR1bGUpO1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgaWYoIXZhbGlkKVxuICAgIHJldHVybiB7XCJyZXN1bHRcIjogbnVsbCwgXCJlcnJvclwiOiBcInNjaGVtYSBpcyBpbmNvcnJlY3Q6IFwiICsgYWp2LmVycm9yc1RleHQodmFsaWRhdGUuZXJyb3JzKX07XG5cbiAgaWYoc2NoZWR1bGUuaGFzT3duUHJvcGVydHkoXCJlbmFibGVkXCIpKVxuICAgIGlmKCFzY2hlZHVsZS5lbmFibGVkKVxuICAgICAgcmV0dXJuIHtcInJlc3VsdFwiOiBudWxsLCBcImVycm9yXCI6IFwic2NoZWR1bGUgaXMgZGlzYWJsZWRcIn07XG5cbiAgbGV0IHJlc3VsdCA9IG51bGw7ICAgICBcbiAgLy9vbmVUaW1lXG4gIGlmKHNjaGVkdWxlLmhhc093blByb3BlcnR5KFwib25lVGltZVwiKSkgeyAgICAgICAgXG4gICAgbGV0IG9uZVRpbWUgPSBzY2hlZHVsZS5vbmVUaW1lOyAgICAgICAgXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgICovXG4gICAgaWYocGFyc2VEYXRlVGltZShvbmVUaW1lKSA+IGdldERhdGVUaW1lKCkpXG4gICAgICByZXN1bHQgPSBvbmVUaW1lO1xuICB9XG4gIC8vZWFjaE5EYXkgXG4gIGlmKHNjaGVkdWxlLmhhc093blByb3BlcnR5KFwiZWFjaE5EYXlcIikpIHsgICAgICAgIFxuICAgIC8vc2VhcmNoaW5nIGZvciBhIGRheSBvZiBydW4gICAgICAgIFxuICAgIGxldCBjdXJyZW50RGF0ZSA9IG5ldyBEYXRlKGdldERhdGVUaW1lKCkuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCkpO1xuICAgIC8vZHVlIHRvIHNhdmUgbWlsbGlzZWNvbmRzIGFuZCBub3QgbGluayBuZXdEYXRlVGltZSBvYmplY3Qgd2l0aCBzY2hlZHVsZS5zdGFydERhdGVUaW1lXG4gICAgbGV0IG5ld0RhdGVUaW1lID0gcGFyc2VEYXRlVGltZShzY2hlZHVsZS5zdGFydERhdGVUaW1lKTtcbiAgICBuZXdEYXRlVGltZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbiAgICB3aGlsZShuZXdEYXRlVGltZSA8IGN1cnJlbnREYXRlKSB7XG4gICAgICBuZXdEYXRlVGltZSA9IGFkZERhdGUobmV3RGF0ZVRpbWUsIDAsIDAsIHNjaGVkdWxlLmVhY2hORGF5KTtcbiAgICB9ICAgICAgICBcbiAgICAvL2FzIGZhciBhcyBkYXkgd2FzIGZvdW5kIC0gc3RhcnQgdG8gc2VhcmNoIG1vbWVudCBpbiBhIGRheSBmb3IgcnVuXG4gICAgcmVzdWx0ID0gY2FsY3VsYXRlVGltZU9mUnVuKHNjaGVkdWxlLCBuZXdEYXRlVGltZSk7XG4gICAgICAgIFxuICAgIC8vZGF5IG92ZXJ3aGVsbWluZyBhZnRlciBhZGRpbmcgaW50ZXJ2YWwgb3IgYWxyZWFkeSBoYXBwZW5kLCBnbyB0byBmdXR1cmUsIHRvIG5leHQgTiBkYXlcbiAgICBpZihyZXN1bHQgPT0gbnVsbCkge1xuICAgICAgbmV3RGF0ZVRpbWUgPSBhZGREYXRlKG5ld0RhdGVUaW1lLCAwLCAwLCBzY2hlZHVsZS5lYWNoTkRheSk7XG4gICAgICBuZXdEYXRlVGltZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbiAgICAgIHJlc3VsdCA9IGNhbGN1bGF0ZVRpbWVPZlJ1bihzY2hlZHVsZSwgbmV3RGF0ZVRpbWUpO1xuICAgIH1cbiAgfSAgICBcbiAgLy9lYWNoTldlZWtcbiAgaWYoc2NoZWR1bGUuaGFzT3duUHJvcGVydHkoXCJlYWNoTldlZWtcIikpIHsgICAgICAgICAgICAgICBcbiAgICAvL2R1ZSB0byBzYXZlIG1pbGxpc2Vjb25kcyBhbmQgbm90IGxpbmsgbmV3RGF0ZVRpbWUgb2JqZWN0IHdpdGggc2NoZWR1bGUuc3RhcnREYXRlVGltZVxuICAgIGxldCBuZXdEYXRlVGltZSA9IG5ldyBEYXRlKHBhcnNlRGF0ZVRpbWUoc2NoZWR1bGUuc3RhcnREYXRlVGltZSkpO1xuICAgIG5ld0RhdGVUaW1lLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xuICAgIC8vZmluZCBTdW5kYXkgb2Ygc3RhcnQgd2VlayBcbiAgICBuZXdEYXRlVGltZSA9IGFkZERhdGUobmV3RGF0ZVRpbWUsIDAsIDAsIC1uZXdEYXRlVGltZS5nZXRVVENEYXkoKSk7XG4gICAgLy9tYWtlIHN0YXJ0IHBvaW50IGFzIFN1bmRheSBvZiBzdGFydCB3ZWVrICsgKGVhY2hOV2Vlay0xKSB3ZWVrcyBkdWUgdG8gZmluZCBmaXJzdCBzdW5kYXkgZm9yIGNoZWNraW5nICAgICAgICAgICAgXG4gICAgbmV3RGF0ZVRpbWUgPSBhZGREYXRlKG5ld0RhdGVUaW1lLCAwLCAwLCA3KihzY2hlZHVsZS5lYWNoTldlZWsgLSAxKSk7XG4gICAgLy9maW5kIFN1bmRheSBvZiBjdXJyZW50IHdlZWsgICAgXG4gICAgbGV0IGN1cnJlbnREYXRlID0gbmV3IERhdGUoKG5ldyBEYXRlKCkpLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApKTtcbiAgICBsZXQgY3VycmVudFdlZWtTdW5kYXkgPSBhZGREYXRlKGN1cnJlbnREYXRlLCAwLCAwLCAtY3VycmVudERhdGUuZ2V0VVRDRGF5KCkpOyAgICAgICAgICAgIFxuICAgIC8vZmluZCBTdW5kYXkgb2Ygd2VlayB3aGVyZSBuZXh0IHJ1biBkYXkocykgYXJlICAgICAgICBcbiAgICB3aGlsZShuZXdEYXRlVGltZSA8IGN1cnJlbnRXZWVrU3VuZGF5KSB7XG4gICAgICBuZXdEYXRlVGltZSA9IGFkZERhdGUobmV3RGF0ZVRpbWUsIDAsIDAsIDcqc2NoZWR1bGUuZWFjaE5XZWVrKTtcbiAgICB9ICAgICAgICAgIFxuICAgICAgICBcbiAgICBsZXQgY2FsY3VsYXRpb25SZXN1bHQgPSBjYWxjdWxhdGVXZWVrRGF5T2ZSdW4oc2NoZWR1bGUsIG5ld0RhdGVUaW1lKTtcbiAgICBpZihjYWxjdWxhdGlvblJlc3VsdClcbiAgICAgIG5ld0RhdGVUaW1lID0gY2FsY3VsYXRpb25SZXN1bHQ7XG5cbiAgICAvL2FzIGZhciBhcyBiZWdpbmluZyBvZiB0aGUgd2VlayB3YXMgZm91bmQgLSBzdGFydCB0byBzZWFyY2ggZGF5IGZvciBleGVjdXRpb25cbiAgICB3aGlsZShuZXdEYXRlVGltZSA8IHBhcnNlRGF0ZVRpbWUoc2NoZWR1bGUuc3RhcnREYXRlVGltZSkgfHwgbmV3RGF0ZVRpbWUgPCBnZXREYXRlVGltZSgpKSB7XG4gICAgICBuZXdEYXRlVGltZSA9IGFkZERhdGUobmV3RGF0ZVRpbWUsIDAsIDAsIDcqc2NoZWR1bGUuZWFjaE5XZWVrKTsgICBcbiAgICAgIGNhbGN1bGF0aW9uUmVzdWx0ID0gY2FsY3VsYXRlV2Vla0RheU9mUnVuKHNjaGVkdWxlLCBuZXdEYXRlVGltZSk7ICAgICAgIFxuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgICovXG4gICAgICBpZihjYWxjdWxhdGlvblJlc3VsdClcbiAgICAgICAgbmV3RGF0ZVRpbWUgPSBjYWxjdWxhdGlvblJlc3VsdDtcbiAgICB9ICAgICAgICBcblxuICAgIHJlc3VsdCA9IG5ld0RhdGVUaW1lOyAgICAgIFxuICB9ICBcbiAgLy9tb250aFxuICBpZihzY2hlZHVsZS5oYXNPd25Qcm9wZXJ0eShcIm1vbnRoXCIpKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIGxldCBuZXdEYXRlVGltZSA9IG5ldyBEYXRlKHBhcnNlRGF0ZVRpbWUoc2NoZWR1bGUuc3RhcnREYXRlVGltZSkpO1xuICAgIGxldCBjdXJyZW50RGF0ZXRpbWUgPSBnZXREYXRlVGltZSgpO1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICAqL1xuICAgIGlmKG5ld0RhdGVUaW1lIDwgY3VycmVudERhdGV0aW1lKSAgICAgICAgICAgICBcbiAgICAgIG5ld0RhdGVUaW1lID0gY3VycmVudERhdGV0aW1lO1xuICAgICAgICAgICAgXG4gICAgbGV0IGRheUxpc3QgPSBzY2hlZHVsZS5kYXkuc29ydCgoYSwgYikgPT4gYSAtIGIpOyAgIFxuXG4gICAgbmV3RGF0ZVRpbWUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG4gICAgbGV0IG1vbnRoSW5kZXggPSBnZXREYXRlVGltZSgpLmdldE1vbnRoKCk7XG4gICAgLy9tYWtlIDEgeWVhciByb3VuZC4gSWYgZGF0ZSBpcyBub3QgZm91bmQgd2l0aGluIDEgeWVhciAtIG5leHQgcnVuIGNhbiBub3QgYmUgY2FsY3VsYXRlZFxuICAgIG1vbnRoTG9vcDpcbiAgICBmb3IobGV0IGk9MDsgaTwxMzsgaSsrKSB7XG4gICAgICBpZihzY2hlZHVsZS5tb250aC5pbmNsdWRlcyhtb250aExpc3RbbW9udGhJbmRleF0pKSB7XG4gICAgICAgIC8vbW9udGggZm91bmQsIHN0YXJ0IHRvIGNoZWNrIGRheSBsaXN0ICAgICAgICAgXG4gICAgICAgIGZvcihsZXQgaT0wOyBpPGRheUxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBuZXdEYXRlVGltZS5zZXRNb250aChtb250aEluZGV4LCBkYXlMaXN0W2ldKTtcbiAgICAgICAgICAvL2FzIGZhciBhcyBkYXkgd2FzIGZvdW5kIC0gc3RhcnQgdG8gc2VhcmNoIG1vbWVudCBpbiBhIGRheSBmb3IgcnVuXG4gICAgICAgICAgbGV0IGNhbGN1bGF0aW9uUmVzdWx0ID0gY2FsY3VsYXRlVGltZU9mUnVuKHNjaGVkdWxlLCBuZXdEYXRlVGltZSk7XG4gICAgICAgICAgaWYoY2FsY3VsYXRpb25SZXN1bHQgJiYgY2FsY3VsYXRpb25SZXN1bHQgPiBnZXREYXRlVGltZSgpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBjYWxjdWxhdGlvblJlc3VsdDtcbiAgICAgICAgICAgIGJyZWFrIG1vbnRoTG9vcDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG1vbnRoSW5kZXgrKztcbiAgICAgIGlmKG1vbnRoSW5kZXggPT0gMTIpIHtcbiAgICAgICAgbW9udGhJbmRleCA9IDA7XG4gICAgICAgIG5ld0RhdGVUaW1lID0gYWRkRGF0ZShuZXdEYXRlVGltZSwgMSk7XG4gICAgICB9XG4gICAgfSAgICAgICAgICAgICAgICAgXG4gIH0gICAgIFxuICAvL2NoZWNrIGZvciBlbmQgZGF0ZS10aW1lIHJlc3RyaWN0aW9uXG4gIGlmKHNjaGVkdWxlLmVuZERhdGVUaW1lICYmIHJlc3VsdCkge1xuICAgIGlmKHJlc3VsdCA+IHBhcnNlRGF0ZVRpbWUoc2NoZWR1bGUuZW5kRGF0ZVRpbWUpKSBcbiAgICAgIHJldHVybiB7XCJyZXN1bHRcIjogbnVsbCwgXCJlcnJvclwiOiBcImNhbGN1bGF0ZWQgZGF0ZS10aW1lIGVhcmxpZXIgdGhhbiBlbmREYXRlVGltZVwifTtcbiAgICBlbHNlXG4gICAgICByZXR1cm4ge1wicmVzdWx0XCI6IHJlc3VsdCwgXCJlcnJvclwiOiBudWxsfTsgICAgICAgICAgIFxuICB9XG4gIGVsc2Uge1xuICAgIGlmKHJlc3VsdCAhPSBudWxsKVxuICAgICAgcmV0dXJuIHtcInJlc3VsdFwiOiBwYXJzZURhdGVUaW1lKHJlc3VsdCksIFwiZXJyb3JcIjogbnVsbH07XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIHtcInJlc3VsdFwiOiBudWxsLCBcImVycm9yXCI6IFwibm90IGFibGUgdG8gY2FsY3VsYXRlIG5leHQgcnVuIGRhdGUtdGltZVwifTtcbiAgfVxufTtcbi8qKlxuICogUHJpbnRzIHN1bW1hcnkgb2Ygc2NoZWR1bGUgb2JqZWN0IGluIGh1bWFuIHJlYWRhYmxlIGZvcm1hdC4gRS5nLiBcIkVhY2ggMiBkYXkocykgYXQgMTE6MzA6MDBcIlxuICogQHBhcmFtIHtPYmplY3R9IHNjaGVkdWxlIFNjaGVkdWxlIGZvciB3aGljaCBzdW1tYXJ5IHNob3VsZCBiZSBwcmludGVkXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBTdHJpbmcgd2l0aCBzdW1tYXJ5XG4gKi9cbm1vZHVsZS5leHBvcnRzLnN1bW1hcnkgPSAoc2NoZWR1bGUpID0+IHtcbiAgbGV0IHJlc3VsdCA9ICcnO1xuXHRcbiAgaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNjaGVkdWxlLCAnb25lVGltZScpKSB7XG4gICAgcmVzdWx0ID0gYE9uY2UgYXQgJHtmb3JtYXREYXRlVGltZShzY2hlZHVsZS5vbmVUaW1lKX1gO1xuICB9XG5cdFxuICBpZihPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc2NoZWR1bGUsICdlYWNoTkRheScpKSB7XG4gICAgcmVzdWx0ID0gYEVhY2ggJHtzY2hlZHVsZS5lYWNoTkRheX0gZGF5KHMpLCAke2dldERhaWx5RnJlcXVlbmN5KHNjaGVkdWxlLmRhaWx5RnJlcXVlbmN5KX0sICR7Z2V0U3RhcnRFbmQoc2NoZWR1bGUpfWA7XG4gIH1cblx0XG4gIGlmKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzY2hlZHVsZSwgJ2VhY2hOV2VlaycpKSB7XG4gICAgcmVzdWx0ID0gYEVhY2ggJHtzY2hlZHVsZS5lYWNoTldlZWt9IHdlZWsocykgb24gJHtnZXRXZWVrRGF5cyhzY2hlZHVsZS5kYXlPZldlZWspfSwgJHtnZXREYWlseUZyZXF1ZW5jeShzY2hlZHVsZS5kYWlseUZyZXF1ZW5jeSl9LCAke2dldFN0YXJ0RW5kKHNjaGVkdWxlKX1gO1xuICB9XG5cdFxuICBpZihPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc2NoZWR1bGUsICdtb250aCcpKSB7XG4gICAgcmVzdWx0ID0gYEluICR7Z2V0TW9udGhzKHNjaGVkdWxlLm1vbnRoKX0gZWFjaCAke2dldE1vbnRoRGF5cyhzY2hlZHVsZS5kYXkpfSBkYXksICR7Z2V0RGFpbHlGcmVxdWVuY3koc2NoZWR1bGUuZGFpbHlGcmVxdWVuY3kpfSwgJHtnZXRTdGFydEVuZChzY2hlZHVsZSl9YDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG4vKipcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IGRhaWx5RnJlcXVlbmN5IERhaWx5IGZyZXF1ZW5jeSBvYmplY3RcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEh1bWFuIHJlYWRhYmxlIHZhbHVlIG9mIGRhaWx5IGZyZXF1ZW5jeVxuICovXG5mdW5jdGlvbiBnZXREYWlseUZyZXF1ZW5jeShkYWlseUZyZXF1ZW5jeSkge1xuICBpZihkYWlseUZyZXF1ZW5jeS5oYXNPd25Qcm9wZXJ0eSgnb2NjdXJzT25jZUF0JykpIHtcbiAgICByZXR1cm4gYGF0ICR7ZGFpbHlGcmVxdWVuY3kub2NjdXJzT25jZUF0fWA7XG4gIH0gZWxzZSB7XG4gICAgbGV0IGRhaWx5RW5kID0gZGFpbHlGcmVxdWVuY3kuZW5kID09PSB1bmRlZmluZWQgPyAnMjM6NTk6NTknIDogZGFpbHlGcmVxdWVuY3kuZW5kO1xuICAgIHJldHVybiBgZXZlcnkgJHtkYWlseUZyZXF1ZW5jeS5vY2N1cnNFdmVyeS5pbnRlcnZhbFZhbHVlfSAke2RhaWx5RnJlcXVlbmN5Lm9jY3Vyc0V2ZXJ5LmludGVydmFsVHlwZX0ocykgYmV0d2VlbiAke2RhaWx5RnJlcXVlbmN5LnN0YXJ0fSBhbmQgJHtkYWlseUVuZH1gO1xuICB9XG59XG4vKipcbiAqIENhbGxiYWNrIGZvciBhcnJheS5yZWR1Y2UuIFJldHVybnMgaHVtYW4gcmVhZGFibGUgYW5kIGJlYXV0aWZ1bCBlbnVtZXJhdGlvbiBvZiBsaXN0IGxpa2UgXCJ4LCB5LCB6IGFuZCBhXCJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFN0cmluZyB3aGljaCByZXByZXNlbnRzIGxpc3QgaW4gYSBmb3JtYXQgXCJ4LCB5LCB6IGFuZCBhXCJcbiAqL1xuZnVuY3Rpb24gbGlzdFJlZHVjZXIoYWNjLCBjdXIsIGluZCwgYXJyKSB7XG4gIGxldCByZXN1bHQgPSBgJHthY2N9JHtjdXJ9YDtcbiAgaWYoYXJyLmxlbmd0aCA+IDIgJiYgaW5kIDwgYXJyLmxlbmd0aCAtIDIpXG4gICAgcmVzdWx0ID0gYCR7cmVzdWx0fSwgYDtcbiAgaWYoaW5kID09PSBhcnIubGVuZ3RoIC0gMilcbiAgICByZXN1bHQgPSBgJHtyZXN1bHR9IGFuZCBgO1xuXG4gIHJldHVybiByZXN1bHQ7XG59XG4vKipcbiAqIEZvcm1hdHMgd2Vla2RheSBsaXN0IGluIGEgZm9ybWF0IFwieCwgeSwgeiBhbmQgYVwiXG4gKiBAcGFyYW0ge0FycmF5fSB3ZWVrRGF5cyBBcnJheSB3aXRoIHdlZWsgZGF5c1xuICogQHJldHVybnMge3N0cmluZ30gSHVtYW4gcmVhZGFibGUgdmFsdWUgb2Ygd2VlayBkYXlzIGxpc3RcbiAqL1xuZnVuY3Rpb24gZ2V0V2Vla0RheXMod2Vla0RheXMpIHtcbiAgbGV0IHdlZWtEYXlMaXN0ID0ge1xuICAgIFwic3VuXCI6IFwiU3VuZGF5XCIsIFxuICAgIFwibW9uXCI6IFwiTW9uZGF5XCIsIFxuICAgIFwidHVlXCI6IFwiVHVlc2RheVwiLCBcbiAgICBcIndlZFwiOiBcIldlZG5lc2RheVwiLCBcbiAgICBcInRodVwiOiBcIlRodXJzZGF5XCIsIFxuICAgIFwiZnJpXCI6IFwiRnJpZGF5XCIsIFxuICAgIFwic2F0XCI6IFwiU2F0dXJkYXlcIlxuICB9O1xuXG4gIGxldCBjaG9vc2VuV2Vla0RheXMgPSB3ZWVrRGF5cy5tYXAoKHZhbCkgPT4gd2Vla0RheUxpc3RbdmFsXSk7XG5cdFxuICByZXR1cm4gY2hvb3NlbldlZWtEYXlzLnJlZHVjZShsaXN0UmVkdWNlciwgJycpO1xufVxuLyoqXG4gKiBGb3JtYXRzIG1vbnRocyBsaXN0IGluIGEgZm9ybWF0IFwieCwgeSwgeiBhbmQgYVwiXG4gKiBAcGFyYW0ge0FycmF5fSB3ZWVrRGF5cyBBcnJheSB3aXRoIG1vbnRoc1xuICogQHJldHVybnMge3N0cmluZ30gSHVtYW4gcmVhZGFibGUgdmFsdWUgb2YgbW9udGhzIGxpc3RcbiAqL1xuZnVuY3Rpb24gZ2V0TW9udGhzKG1vbnRocykge1xuICBsZXQgbW9udGhMaXN0ID0ge1xuICAgIFwiamFuXCI6IFwiSmFudWFyeVwiLCBcbiAgICBcImZlYlwiOiBcIkZlYnJ1YXJ5XCIsIFxuICAgIFwibWFyXCI6IFwiTWFyY2hcIiwgXG4gICAgXCJhcHJcIjogXCJBcHJpbFwiLCBcbiAgICBcIm1heVwiOiBcIk1heVwiLCBcbiAgICBcImp1blwiOiBcIkp1bmVcIiwgXG4gICAgXCJqdWxcIjogXCJKdWx5XCIsIFxuICAgIFwiYXVnXCI6IFwiQXVndXN0XCIsIFxuICAgIFwic2VwXCI6IFwiU2VwdGVtYmVyXCIsIFxuICAgIFwib2N0XCI6IFwiT2N0b2JlclwiLCBcbiAgICBcIm5vdlwiOiBcIk5vdmVtYmVyXCIsIFxuICAgIFwiZGVjXCI6IFwiRGVjZW1iZXJcIlxuICB9O1xuXHRcbiAgbGV0IGNob29zZW5Nb250aHMgPSBtb250aHMubWFwKCh2YWwpID0+IG1vbnRoTGlzdFt2YWxdKTtcbiAgcmV0dXJuIGNob29zZW5Nb250aHMucmVkdWNlKGxpc3RSZWR1Y2VyLCAnJyk7XG59XG4vKipcbiAqIEZvcm1hdHMgbW9udGggZGF5cyBsaXN0IGluIGEgZm9ybWF0IFwieCwgeSwgeiBhbmQgYVwiXG4gKiBAcGFyYW0ge0FycmF5fSB3ZWVrRGF5cyBBcnJheSB3aXRoIG1vbnRoIGRheXNcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEh1bWFuIHJlYWRhYmxlIHZhbHVlIG9mIG1vbnRoIGRheXMgbGlzdFxuICovXG5mdW5jdGlvbiBnZXRNb250aERheXMobW9udGhEYXlzKSB7XG4gIHJldHVybiBtb250aERheXMucmVkdWNlKGxpc3RSZWR1Y2VyLCAnJyk7XG59XG4vKipcbiAqIFJldHVybnMgaHVtYW4gcmVhZGFibGUgc3RyaW5nIHdpdGggaW5mb3JtYXRpb24gYWJvdXQgc3RhciBhbmQgZW5kIGRhdGUtdGltZVxuICogQHBhcmFtIHtPYmplY3R9IHNjaGVkdWxlIFNjaGVkdWxlIG9iamVjdFxuICogQHJldHVybnMge3N0cmluZ30gSHVtYW4gcmVhZGFibGUgc3RyaW5nXG4gKi9cbmZ1bmN0aW9uIGdldFN0YXJ0RW5kKHNjaGVkdWxlKSB7XG4gIGxldCByZXN1bHQgPSAnJztcblx0XG4gIGlmKHNjaGVkdWxlLmhhc093blByb3BlcnR5KCdzdGFydERhdGVUaW1lJykpIHtcbiAgICByZXN1bHQgPSBgc3RhcnRpbmcgJHtmb3JtYXREYXRlVGltZShzY2hlZHVsZS5zdGFydERhdGVUaW1lKX1gOyBcbiAgfVxuICBpZihzY2hlZHVsZS5oYXNPd25Qcm9wZXJ0eSgnZW5kRGF0ZVRpbWUnKSkge1xuICAgIHJlc3VsdCA9IGAke3Jlc3VsdH0gYW5kIHRpbGwgJHtmb3JtYXREYXRlVGltZShzY2hlZHVsZS5lbmREYXRlVGltZSl9YDsgXG4gIH1cblx0XG4gIHJldHVybiByZXN1bHQ7XG59XG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL3NjaGVkdWxlLmpzXCIsXCIvXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xubGV0IEFqdiA9IHJlcXVpcmUoXCJhanZcIik7XG4vL0RhdGUtdGltZSBmdW5jdGlvbnMgYW5kIGhlbHBlcnNcbm1vZHVsZS5leHBvcnRzLm1vbnRoTGlzdCA9IFtcImphblwiLCBcImZlYlwiLCBcIm1hclwiLCBcImFwclwiLCBcIm1heVwiLCBcImp1blwiLCBcImp1bFwiLCBcImF1Z1wiLCBcInNlcFwiLCBcIm9jdFwiLCBcIm5vdlwiLCBcImRlY1wiXTtcbm1vZHVsZS5leHBvcnRzLndlZWtEYXlMaXN0ID0gW1wic3VuXCIsIFwibW9uXCIsIFwidHVlXCIsIFwid2VkXCIsIFwidGh1XCIsIFwiZnJpXCIsIFwic2F0XCJdO1xuLyoqXG4gKiBBZGRzIHplcm8gYmVmb3JlIG51bWJlciBpZiBudW1iZXIgaXMgbGVzcyB0aGFuIDEwXG4gKiBAcGFyYW0ge2ludGVnZXJ9IG51bSBOdW1iZXIgdG8gd2hpY2ggbGVhZGluZyB6ZXJvcyBzaG91bGQgYmUgYWRkZWRcbiAqL1xuZnVuY3Rpb24gbGVhZFplcm8obnVtKSB7XG4gIHJldHVybiAobnVtIDwgMTAgPyBcIjBcIiA6IFwiXCIpICsgbnVtO1xufVxubW9kdWxlLmV4cG9ydHMubGVhZFplcm8gPSBsZWFkWmVybztcblxuLyoqXG4gKiBSZXR1cm5zIHJlc3VsdCBvZiBvYmplY3QgdmFsaWRhdGlvbiBhY3Jvc3Mgb25lIG9yIHNldmVyYWwgbmVzdGVkIHNjaGVtYXNcbiAqIEBwYXJhbSB7b2JqZWN0fSB0ZXN0RGF0YSBPYmplY3QgdG8gYmUgdmFsaWRhdGVkXG4gKiBAcGFyYW0ge29iamVjdH0gc2NoZW1hIFNjaGVtYSBhY3Jvc3Mgd2hpY2ggb2JqZWN0IHNob3VsZCBiZSB2YWxpZGF0ZWRcbiAqIEBwYXJhbSB7b2JqZWN0W109fSBleHRyYVNjaGVtYUxpc3QgQW55IGV4dHJhIHNjaGVtYSBsaXN0IHdoaWNoIHNob3VsZCBiZSB1c2VkIGZvciB2YWxpZGF0aW9uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmVzdWx0IG9mIG9iamVjdCB2YWxpZGF0aW9uXG4gKi9cbmZ1bmN0aW9uIERhdGFWc1NjaGVtYVJlc3VsdCh0ZXN0RGF0YSwgc2NoZW1hLCBleHRyYVNjaGVtYUxpc3QpIHtcbiAgLy9UT0RPOiB0byBiZSBvcHRpbWl6ZWQgd2l0aCByZW1vdmVTY2hlbWEoLy4qLylcbiAgdmFyIGFqdiA9IG5ldyBBanYoKTtcbiAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgICovXG4gIGlmKGV4dHJhU2NoZW1hTGlzdClcbiAgICBleHRyYVNjaGVtYUxpc3QuZm9yRWFjaChmdW5jdGlvbihlKSB7IGFqdi5hZGRTY2hlbWEoZSk7IH0pOyBcbiAgbGV0IHZhbGlkYXRlID0gYWp2LmNvbXBpbGUoc2NoZW1hKTtcbiAgcmV0dXJuIHZhbGlkYXRlKHRlc3REYXRhKTtcbn1cbm1vZHVsZS5leHBvcnRzLkRhdGFWc1NjaGVtYVJlc3VsdCA9IERhdGFWc1NjaGVtYVJlc3VsdDtcblxuLyoqXG4gKiBSZXR1cm5zIHJlc3VsdCBvZiBvYmplY3QgdmFsaWRhdGlvbiBhY3Jvc3Mgb25lIG9yIHNldmVyYWwgbmVzdGVkIHNjaGVtYXNcbiAqIEBwYXJhbSB7b2JqZWN0fSB0ZXN0RGF0YSBPYmplY3QgdG8gYmUgdmFsaWRhdGVkXG4gKiBAcGFyYW0ge29iamVjdH0gc2NoZW1hIFNjaGVtYSBhY3Jvc3Mgd2hpY2ggb2JqZWN0IHNob3VsZCBiZSB2YWxpZGF0ZWRcbiAqIEBwYXJhbSB7b2JqZWN0W109fSBleHRyYVNjaGVtYUxpc3QgQW55IGV4dHJhIHNjaGVtYSBsaXN0IHdoaWNoIHNob3VsZCBiZSB1c2VkIGZvciB2YWxpZGF0aW9uXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBMaXN0IG9mIGVycm9yc1xuICovXG5mdW5jdGlvbiBEYXRhVnNTY2hlbWFFcnJvcnModGVzdERhdGEsIHNjaGVtYSwgZXh0cmFTY2hlbWEpIHtcbiAgLy9UT0RPOiB0byBiZSBvcHRpbWl6ZWQgd2l0aCByZW1vdmVTY2hlbWEoLy4qLylcbiAgdmFyIGFqdiA9IG5ldyBBanYoKTtcbiAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgICovXG4gIGlmKGV4dHJhU2NoZW1hKVxuICAgIGV4dHJhU2NoZW1hLmZvckVhY2goZnVuY3Rpb24oZSkgeyBhanYuYWRkU2NoZW1hKGUpOyB9KTsgXG4gIGxldCB2YWxpZGF0ZSA9IGFqdi5jb21waWxlKHNjaGVtYSk7XG4gIHZhbGlkYXRlKHRlc3REYXRhKTtcbiAgcmV0dXJuIGFqdi5lcnJvcnNUZXh0KHZhbGlkYXRlLmVycm9ycyk7XG59XG5tb2R1bGUuZXhwb3J0cy5EYXRhVnNTY2hlbWFFcnJvcnMgPSBEYXRhVnNTY2hlbWFFcnJvcnM7XG4vKipcbiAqIFJldHVybiBkYXRlLXRpbWUgaW4gYSBwcm9wZXIgZm9ybWF0XG4gKiBAcmV0dXJucyB7b2JqZWN0fSBEYXRlLXRpbWVcbiAqL1xuZnVuY3Rpb24gZ2V0RGF0ZVRpbWUoKSB7IFxuICByZXR1cm4gbmV3IERhdGUoKTtcbn1cbm1vZHVsZS5leHBvcnRzLmdldERhdGVUaW1lID0gZ2V0RGF0ZVRpbWU7XG4vKipcbiAqIEV4dHJhY3QgZnJvbSBkYXRlIGFuZCB0aW1lIGFuZCByZXR1cm4gdGltZSBpbiBhIGZvcm1hdCBISDpNTTpTUy4gQ3VycmVudCBkYXRlIHRpbWUgd2lsbCBiZSB0YWtlbiBpbiBjYXNlIGlmIGRhdGVUaW1lIGlzIG5vdCBwcm92aWRlZFxuICogQHBhcmFtIHtvYmplY3R9IGRhdGVUaW1lIERhdGUgYW5kIHRpbWUgb2JqZWN0IHdoaWNoIHNob3VsZCBiZSB1c2VkIGZvciB0aW1lIGV4dHJhY3Rpb25cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRpbWUgaW4gYSBmb3JtYXQgSEg6TU06U1NcbiAqL1xuZnVuY3Rpb24gZ2V0VGltZWZyb21EYXRlVGltZShkYXRlVGltZSkgeyBcbiAgbGV0IGN1cnJlbnREYXRlVGltZTtcbiAgaWYoZGF0ZVRpbWUgJiYgZGF0ZVRpbWUgaW5zdGFuY2VvZiBEYXRlKVxuICAgIGN1cnJlbnREYXRlVGltZSA9IGRhdGVUaW1lO1xuICBlbHNlXG4gICAgY3VycmVudERhdGVUaW1lID0gZ2V0RGF0ZVRpbWUoKTtcbiAgbGV0IGhvdXJzID0gbGVhZFplcm8oY3VycmVudERhdGVUaW1lLmdldFVUQ0hvdXJzKCkpO1xuICBsZXQgbWludXRlcyA9IGxlYWRaZXJvKGN1cnJlbnREYXRlVGltZS5nZXRVVENNaW51dGVzKCkpO1xuICBsZXQgc2Vjb25kcyA9IGxlYWRaZXJvKGN1cnJlbnREYXRlVGltZS5nZXRVVENTZWNvbmRzKCkpOyAgIFxuICByZXR1cm4gaG91cnMgKyBcIjpcIiArIG1pbnV0ZXMgKyBcIjpcIiArIHNlY29uZHM7XG59XG5tb2R1bGUuZXhwb3J0cy5nZXRUaW1lZnJvbURhdGVUaW1lID0gZ2V0VGltZWZyb21EYXRlVGltZTtcbi8qKlxuICogUmV0dXJucyBuZXcgZGF0ZSBiYXNlZCBvbiBkYXRlIGFuZCBhZGRlZCBudW1iZXIgb2YgeWVhcnMsIG1vbnRocywgZGF5cywgaG91cnMsIG1pbnV0ZXMgb3Igc2Vjb25kc1xuICogQHBhcmFtIHtvYmplY3R9IGRhdGUgRGF0ZSB2YWx1ZSB0byB3aGljaCBkYXRlLXRpbWUgaW50ZXJ2YWxzIHNob3VsZCBiZSBhZGRlZFxuICogQHBhcmFtIHtudW1iZXJ9IHllYXJzIE51bWJlciBvZiB5ZWFycyB0byBhZGRcbiAqIEBwYXJhbSB7bnVtYmVyfSBtb250aHMgTnVtYmVyIG9mIG1vbnRocyB0byBhZGRcbiAqIEBwYXJhbSB7bnVtYmVyfSBkYXlzIE51bWJlciBvZiBkYXlzIHRvIGFkZFxuICogQHBhcmFtIHtudW1iZXJ9IGhvdXJzIE51bWJlciBvZiBob3VycyB0byBhZGRcbiAqIEBwYXJhbSB7bnVtYmVyfSBtaW51dGVzIE51bWJlciBvZiBtaW51dGVzIHRvIGFkZFxuICogQHBhcmFtIHtudW1iZXJ9IHNlY29uZHMgTnVtYmVyIG9mIHNlY29uZHMgdG8gYWRkXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBOZXcgZGF0ZSB3aXRoIGFkZGVkIG51bWJlciBvZiBkYXlzXG4gKi9cbmZ1bmN0aW9uIGFkZERhdGUoZGF0ZSwgeWVhcnMsIG1vbnRocyA9IDAsIGRheXMgPSAwLCBob3VycyA9IDAsIG1pbnV0ZXMgPSAwLCBzZWNvbmRzID0gMCkgeyAgXG4gIGxldCByZXN1bHQgPSBwYXJzZURhdGVUaW1lKFwiMjAwMC0wMS0wMVQwMDowMDowMC4wMDBaXCIpO1xuICAgIFxuICByZXN1bHQuc2V0VVRDRnVsbFllYXIoZGF0ZS5nZXRVVENGdWxsWWVhcigpICsgeWVhcnMpO1xuICByZXN1bHQuc2V0VVRDTW9udGgoZGF0ZS5nZXRVVENNb250aCgpICsgbW9udGhzKTtcbiAgcmVzdWx0LnNldFVUQ0RhdGUoZGF0ZS5nZXRVVENEYXRlKCkgKyBkYXlzKTsgICAgXG4gIHJlc3VsdC5zZXRVVENIb3VycyhkYXRlLmdldFVUQ0hvdXJzKCkgKyBob3Vycyk7ICAgICAgICAgXG4gIHJlc3VsdC5zZXRVVENNaW51dGVzKGRhdGUuZ2V0VVRDTWludXRlcygpICsgbWludXRlcyk7ICAgIFxuICByZXN1bHQuc2V0VVRDU2Vjb25kcyhkYXRlLmdldFVUQ1NlY29uZHMoKSArIHNlY29uZHMpOyAgICBcbiAgcmVzdWx0LnNldFVUQ01pbGxpc2Vjb25kcyhkYXRlLmdldFVUQ01pbGxpc2Vjb25kcygpKTtcbiAgIFxuICByZXR1cm4gbmV3IERhdGUocmVzdWx0KTtcbn1cbm1vZHVsZS5leHBvcnRzLmFkZERhdGUgPSBhZGREYXRlO1xuLyoqXG4gKiBDb252ZXJ0IHN0cmluZyByZXByZXNlbnRlZCBkYXRlIGFuZCB0aW1lIHRvIG5hdGl2ZSBkYXRlLXRpbWUgZm9ybWF0XG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nRGF0ZVRpbWUgVVRDIGRhdGUgYW5kIHRpbWUgcmVwcmVzZW50ZWQgYXMgYSBzdGluZy4gRXhhbXBsZTogJzIwMTgtMDEtMzFUMjA6NTQ6MjMuMDcxWidcbiAqIEByZXR1cm5zIHtkYXRldGltZX0gRGF0ZSBhbmQgdGltZSBvYmplY3RcbiAqL1xuZnVuY3Rpb24gcGFyc2VEYXRlVGltZShzdHJpbmdEYXRlVGltZSkge1xuICBsZXQgcHJlRGF0ZSA9IERhdGUucGFyc2Uoc3RyaW5nRGF0ZVRpbWUpO1xuICBpZighaXNOYU4ocHJlRGF0ZSkpIFxuICAgIHJldHVybiBuZXcgRGF0ZShwcmVEYXRlKTsgICAgICAgICAgICBcbiAgZWxzZVxuICAgIHJldHVybiBudWxsO1xufVxubW9kdWxlLmV4cG9ydHMucGFyc2VEYXRlVGltZSA9IHBhcnNlRGF0ZVRpbWU7XG5cbi8qKlxuICogXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgRGF0ZS10aW1lIHZhbHVlXG4gKiBAcGFyYW0geyp9IG9wdGlvbnMgQSBsb2NhbGUgc3RyaW5nIG9yIGFycmF5IG9mIGxvY2FsZSAoc2VlIERhdGUudG9Mb2NhbGVTdHJpbmcpXG4gKiBAcGFyYW0geyp9IGxvY2FsZSBBbiBvYmplY3QgdGhhdCBjb250YWlucyBvbmUgb3IgbW9yZSBwcm9wZXJ0aWVzIHRoYXQgc3BlY2lmeSBjb21wYXJpc29uIG9wdGlvbnMgKHNlZSBEYXRlLnRvTG9jYWxlU3RyaW5nKVxuICogQHJldHVybnMge3N0cmluZ30gRm9ybWF0ZWQgZGF0ZSBhbmQgdGltZVxuICovXG5mdW5jdGlvbiBmb3JtYXREYXRlVGltZSh2YWx1ZSwgb3B0aW9ucywgbG9jYWxlKSB7ICBcbiAgbGV0IGRhdGVUaW1lID0gbmV3IERhdGUodmFsdWUpO1xuICByZXR1cm4gdmFsdWUgPT09IG51bGwgPyAnJyA6IGRhdGVUaW1lLnRvTG9jYWxlU3RyaW5nKGxvY2FsZSwgb3B0aW9ucyk7ICBcbn1cbm1vZHVsZS5leHBvcnRzLmZvcm1hdERhdGVUaW1lID0gZm9ybWF0RGF0ZVRpbWU7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL3Rvb2xzLmpzXCIsXCIvXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29tcGlsZVNjaGVtYSA9IHJlcXVpcmUoJy4vY29tcGlsZScpXG4gICwgcmVzb2x2ZSA9IHJlcXVpcmUoJy4vY29tcGlsZS9yZXNvbHZlJylcbiAgLCBDYWNoZSA9IHJlcXVpcmUoJy4vY2FjaGUnKVxuICAsIFNjaGVtYU9iamVjdCA9IHJlcXVpcmUoJy4vY29tcGlsZS9zY2hlbWFfb2JqJylcbiAgLCBzdGFibGVTdHJpbmdpZnkgPSByZXF1aXJlKCdmYXN0LWpzb24tc3RhYmxlLXN0cmluZ2lmeScpXG4gICwgZm9ybWF0cyA9IHJlcXVpcmUoJy4vY29tcGlsZS9mb3JtYXRzJylcbiAgLCBydWxlcyA9IHJlcXVpcmUoJy4vY29tcGlsZS9ydWxlcycpXG4gICwgJGRhdGFNZXRhU2NoZW1hID0gcmVxdWlyZSgnLi9kYXRhJylcbiAgLCB1dGlsID0gcmVxdWlyZSgnLi9jb21waWxlL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBBanY7XG5cbkFqdi5wcm90b3R5cGUudmFsaWRhdGUgPSB2YWxpZGF0ZTtcbkFqdi5wcm90b3R5cGUuY29tcGlsZSA9IGNvbXBpbGU7XG5BanYucHJvdG90eXBlLmFkZFNjaGVtYSA9IGFkZFNjaGVtYTtcbkFqdi5wcm90b3R5cGUuYWRkTWV0YVNjaGVtYSA9IGFkZE1ldGFTY2hlbWE7XG5BanYucHJvdG90eXBlLnZhbGlkYXRlU2NoZW1hID0gdmFsaWRhdGVTY2hlbWE7XG5BanYucHJvdG90eXBlLmdldFNjaGVtYSA9IGdldFNjaGVtYTtcbkFqdi5wcm90b3R5cGUucmVtb3ZlU2NoZW1hID0gcmVtb3ZlU2NoZW1hO1xuQWp2LnByb3RvdHlwZS5hZGRGb3JtYXQgPSBhZGRGb3JtYXQ7XG5BanYucHJvdG90eXBlLmVycm9yc1RleHQgPSBlcnJvcnNUZXh0O1xuXG5BanYucHJvdG90eXBlLl9hZGRTY2hlbWEgPSBfYWRkU2NoZW1hO1xuQWp2LnByb3RvdHlwZS5fY29tcGlsZSA9IF9jb21waWxlO1xuXG5BanYucHJvdG90eXBlLmNvbXBpbGVBc3luYyA9IHJlcXVpcmUoJy4vY29tcGlsZS9hc3luYycpO1xudmFyIGN1c3RvbUtleXdvcmQgPSByZXF1aXJlKCcuL2tleXdvcmQnKTtcbkFqdi5wcm90b3R5cGUuYWRkS2V5d29yZCA9IGN1c3RvbUtleXdvcmQuYWRkO1xuQWp2LnByb3RvdHlwZS5nZXRLZXl3b3JkID0gY3VzdG9tS2V5d29yZC5nZXQ7XG5BanYucHJvdG90eXBlLnJlbW92ZUtleXdvcmQgPSBjdXN0b21LZXl3b3JkLnJlbW92ZTtcbkFqdi5wcm90b3R5cGUudmFsaWRhdGVLZXl3b3JkID0gY3VzdG9tS2V5d29yZC52YWxpZGF0ZTtcblxudmFyIGVycm9yQ2xhc3NlcyA9IHJlcXVpcmUoJy4vY29tcGlsZS9lcnJvcl9jbGFzc2VzJyk7XG5BanYuVmFsaWRhdGlvbkVycm9yID0gZXJyb3JDbGFzc2VzLlZhbGlkYXRpb247XG5BanYuTWlzc2luZ1JlZkVycm9yID0gZXJyb3JDbGFzc2VzLk1pc3NpbmdSZWY7XG5BanYuJGRhdGFNZXRhU2NoZW1hID0gJGRhdGFNZXRhU2NoZW1hO1xuXG52YXIgTUVUQV9TQ0hFTUFfSUQgPSAnaHR0cDovL2pzb24tc2NoZW1hLm9yZy9kcmFmdC0wNy9zY2hlbWEnO1xuXG52YXIgTUVUQV9JR05PUkVfT1BUSU9OUyA9IFsgJ3JlbW92ZUFkZGl0aW9uYWwnLCAndXNlRGVmYXVsdHMnLCAnY29lcmNlVHlwZXMnLCAnc3RyaWN0RGVmYXVsdHMnIF07XG52YXIgTUVUQV9TVVBQT1JUX0RBVEEgPSBbJy9wcm9wZXJ0aWVzJ107XG5cbi8qKlxuICogQ3JlYXRlcyB2YWxpZGF0b3IgaW5zdGFuY2UuXG4gKiBVc2FnZTogYEFqdihvcHRzKWBcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIG9wdGlvbmFsIG9wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH0gYWp2IGluc3RhbmNlXG4gKi9cbmZ1bmN0aW9uIEFqdihvcHRzKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBBanYpKSByZXR1cm4gbmV3IEFqdihvcHRzKTtcbiAgb3B0cyA9IHRoaXMuX29wdHMgPSB1dGlsLmNvcHkob3B0cykgfHwge307XG4gIHNldExvZ2dlcih0aGlzKTtcbiAgdGhpcy5fc2NoZW1hcyA9IHt9O1xuICB0aGlzLl9yZWZzID0ge307XG4gIHRoaXMuX2ZyYWdtZW50cyA9IHt9O1xuICB0aGlzLl9mb3JtYXRzID0gZm9ybWF0cyhvcHRzLmZvcm1hdCk7XG5cbiAgdGhpcy5fY2FjaGUgPSBvcHRzLmNhY2hlIHx8IG5ldyBDYWNoZTtcbiAgdGhpcy5fbG9hZGluZ1NjaGVtYXMgPSB7fTtcbiAgdGhpcy5fY29tcGlsYXRpb25zID0gW107XG4gIHRoaXMuUlVMRVMgPSBydWxlcygpO1xuICB0aGlzLl9nZXRJZCA9IGNob29zZUdldElkKG9wdHMpO1xuXG4gIG9wdHMubG9vcFJlcXVpcmVkID0gb3B0cy5sb29wUmVxdWlyZWQgfHwgSW5maW5pdHk7XG4gIGlmIChvcHRzLmVycm9yRGF0YVBhdGggPT0gJ3Byb3BlcnR5Jykgb3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5ID0gdHJ1ZTtcbiAgaWYgKG9wdHMuc2VyaWFsaXplID09PSB1bmRlZmluZWQpIG9wdHMuc2VyaWFsaXplID0gc3RhYmxlU3RyaW5naWZ5O1xuICB0aGlzLl9tZXRhT3B0cyA9IGdldE1ldGFTY2hlbWFPcHRpb25zKHRoaXMpO1xuXG4gIGlmIChvcHRzLmZvcm1hdHMpIGFkZEluaXRpYWxGb3JtYXRzKHRoaXMpO1xuICBpZiAob3B0cy5rZXl3b3JkcykgYWRkSW5pdGlhbEtleXdvcmRzKHRoaXMpO1xuICBhZGREZWZhdWx0TWV0YVNjaGVtYSh0aGlzKTtcbiAgaWYgKHR5cGVvZiBvcHRzLm1ldGEgPT0gJ29iamVjdCcpIHRoaXMuYWRkTWV0YVNjaGVtYShvcHRzLm1ldGEpO1xuICBpZiAob3B0cy5udWxsYWJsZSkgdGhpcy5hZGRLZXl3b3JkKCdudWxsYWJsZScsIHttZXRhU2NoZW1hOiB7dHlwZTogJ2Jvb2xlYW4nfX0pO1xuICBhZGRJbml0aWFsU2NoZW1hcyh0aGlzKTtcbn1cblxuXG5cbi8qKlxuICogVmFsaWRhdGUgZGF0YSB1c2luZyBzY2hlbWFcbiAqIFNjaGVtYSB3aWxsIGJlIGNvbXBpbGVkIGFuZCBjYWNoZWQgKHVzaW5nIHNlcmlhbGl6ZWQgSlNPTiBhcyBrZXkuIFtmYXN0LWpzb24tc3RhYmxlLXN0cmluZ2lmeV0oaHR0cHM6Ly9naXRodWIuY29tL2Vwb2JlcmV6a2luL2Zhc3QtanNvbi1zdGFibGUtc3RyaW5naWZ5KSBpcyB1c2VkIHRvIHNlcmlhbGl6ZS5cbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0gIHtTdHJpbmd8T2JqZWN0fSBzY2hlbWFLZXlSZWYga2V5LCByZWYgb3Igc2NoZW1hIG9iamVjdFxuICogQHBhcmFtICB7QW55fSBkYXRhIHRvIGJlIHZhbGlkYXRlZFxuICogQHJldHVybiB7Qm9vbGVhbn0gdmFsaWRhdGlvbiByZXN1bHQuIEVycm9ycyBmcm9tIHRoZSBsYXN0IHZhbGlkYXRpb24gd2lsbCBiZSBhdmFpbGFibGUgaW4gYGFqdi5lcnJvcnNgIChhbmQgYWxzbyBpbiBjb21waWxlZCBzY2hlbWE6IGBzY2hlbWEuZXJyb3JzYCkuXG4gKi9cbmZ1bmN0aW9uIHZhbGlkYXRlKHNjaGVtYUtleVJlZiwgZGF0YSkge1xuICB2YXIgdjtcbiAgaWYgKHR5cGVvZiBzY2hlbWFLZXlSZWYgPT0gJ3N0cmluZycpIHtcbiAgICB2ID0gdGhpcy5nZXRTY2hlbWEoc2NoZW1hS2V5UmVmKTtcbiAgICBpZiAoIXYpIHRocm93IG5ldyBFcnJvcignbm8gc2NoZW1hIHdpdGgga2V5IG9yIHJlZiBcIicgKyBzY2hlbWFLZXlSZWYgKyAnXCInKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2NoZW1hT2JqID0gdGhpcy5fYWRkU2NoZW1hKHNjaGVtYUtleVJlZik7XG4gICAgdiA9IHNjaGVtYU9iai52YWxpZGF0ZSB8fCB0aGlzLl9jb21waWxlKHNjaGVtYU9iaik7XG4gIH1cblxuICB2YXIgdmFsaWQgPSB2KGRhdGEpO1xuICBpZiAodi4kYXN5bmMgIT09IHRydWUpIHRoaXMuZXJyb3JzID0gdi5lcnJvcnM7XG4gIHJldHVybiB2YWxpZDtcbn1cblxuXG4vKipcbiAqIENyZWF0ZSB2YWxpZGF0aW5nIGZ1bmN0aW9uIGZvciBwYXNzZWQgc2NoZW1hLlxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSAge09iamVjdH0gc2NoZW1hIHNjaGVtYSBvYmplY3RcbiAqIEBwYXJhbSAge0Jvb2xlYW59IF9tZXRhIHRydWUgaWYgc2NoZW1hIGlzIGEgbWV0YS1zY2hlbWEuIFVzZWQgaW50ZXJuYWxseSB0byBjb21waWxlIG1ldGEgc2NoZW1hcyBvZiBjdXN0b20ga2V5d29yZHMuXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gdmFsaWRhdGluZyBmdW5jdGlvblxuICovXG5mdW5jdGlvbiBjb21waWxlKHNjaGVtYSwgX21ldGEpIHtcbiAgdmFyIHNjaGVtYU9iaiA9IHRoaXMuX2FkZFNjaGVtYShzY2hlbWEsIHVuZGVmaW5lZCwgX21ldGEpO1xuICByZXR1cm4gc2NoZW1hT2JqLnZhbGlkYXRlIHx8IHRoaXMuX2NvbXBpbGUoc2NoZW1hT2JqKTtcbn1cblxuXG4vKipcbiAqIEFkZHMgc2NoZW1hIHRvIHRoZSBpbnN0YW5jZS5cbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0ge09iamVjdHxBcnJheX0gc2NoZW1hIHNjaGVtYSBvciBhcnJheSBvZiBzY2hlbWFzLiBJZiBhcnJheSBpcyBwYXNzZWQsIGBrZXlgIGFuZCBvdGhlciBwYXJhbWV0ZXJzIHdpbGwgYmUgaWdub3JlZC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgT3B0aW9uYWwgc2NoZW1hIGtleS4gQ2FuIGJlIHBhc3NlZCB0byBgdmFsaWRhdGVgIG1ldGhvZCBpbnN0ZWFkIG9mIHNjaGVtYSBvYmplY3Qgb3IgaWQvcmVmLiBPbmUgc2NoZW1hIHBlciBpbnN0YW5jZSBjYW4gaGF2ZSBlbXB0eSBgaWRgIGFuZCBga2V5YC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gX3NraXBWYWxpZGF0aW9uIHRydWUgdG8gc2tpcCBzY2hlbWEgdmFsaWRhdGlvbi4gVXNlZCBpbnRlcm5hbGx5LCBvcHRpb24gdmFsaWRhdGVTY2hlbWEgc2hvdWxkIGJlIHVzZWQgaW5zdGVhZC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gX21ldGEgdHJ1ZSBpZiBzY2hlbWEgaXMgYSBtZXRhLXNjaGVtYS4gVXNlZCBpbnRlcm5hbGx5LCBhZGRNZXRhU2NoZW1hIHNob3VsZCBiZSB1c2VkIGluc3RlYWQuXG4gKiBAcmV0dXJuIHtBanZ9IHRoaXMgZm9yIG1ldGhvZCBjaGFpbmluZ1xuICovXG5mdW5jdGlvbiBhZGRTY2hlbWEoc2NoZW1hLCBrZXksIF9za2lwVmFsaWRhdGlvbiwgX21ldGEpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoc2NoZW1hKSl7XG4gICAgZm9yICh2YXIgaT0wOyBpPHNjaGVtYS5sZW5ndGg7IGkrKykgdGhpcy5hZGRTY2hlbWEoc2NoZW1hW2ldLCB1bmRlZmluZWQsIF9za2lwVmFsaWRhdGlvbiwgX21ldGEpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHZhciBpZCA9IHRoaXMuX2dldElkKHNjaGVtYSk7XG4gIGlmIChpZCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBpZCAhPSAnc3RyaW5nJylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NjaGVtYSBpZCBtdXN0IGJlIHN0cmluZycpO1xuICBrZXkgPSByZXNvbHZlLm5vcm1hbGl6ZUlkKGtleSB8fCBpZCk7XG4gIGNoZWNrVW5pcXVlKHRoaXMsIGtleSk7XG4gIHRoaXMuX3NjaGVtYXNba2V5XSA9IHRoaXMuX2FkZFNjaGVtYShzY2hlbWEsIF9za2lwVmFsaWRhdGlvbiwgX21ldGEsIHRydWUpO1xuICByZXR1cm4gdGhpcztcbn1cblxuXG4vKipcbiAqIEFkZCBzY2hlbWEgdGhhdCB3aWxsIGJlIHVzZWQgdG8gdmFsaWRhdGUgb3RoZXIgc2NoZW1hc1xuICogb3B0aW9ucyBpbiBNRVRBX0lHTk9SRV9PUFRJT05TIGFyZSBhbHdheSBzZXQgdG8gZmFsc2VcbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0ge09iamVjdH0gc2NoZW1hIHNjaGVtYSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgb3B0aW9uYWwgc2NoZW1hIGtleVxuICogQHBhcmFtIHtCb29sZWFufSBza2lwVmFsaWRhdGlvbiB0cnVlIHRvIHNraXAgc2NoZW1hIHZhbGlkYXRpb24sIGNhbiBiZSB1c2VkIHRvIG92ZXJyaWRlIHZhbGlkYXRlU2NoZW1hIG9wdGlvbiBmb3IgbWV0YS1zY2hlbWFcbiAqIEByZXR1cm4ge0Fqdn0gdGhpcyBmb3IgbWV0aG9kIGNoYWluaW5nXG4gKi9cbmZ1bmN0aW9uIGFkZE1ldGFTY2hlbWEoc2NoZW1hLCBrZXksIHNraXBWYWxpZGF0aW9uKSB7XG4gIHRoaXMuYWRkU2NoZW1hKHNjaGVtYSwga2V5LCBza2lwVmFsaWRhdGlvbiwgdHJ1ZSk7XG4gIHJldHVybiB0aGlzO1xufVxuXG5cbi8qKlxuICogVmFsaWRhdGUgc2NoZW1hXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtIHtPYmplY3R9IHNjaGVtYSBzY2hlbWEgdG8gdmFsaWRhdGVcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gdGhyb3dPckxvZ0Vycm9yIHBhc3MgdHJ1ZSB0byB0aHJvdyAob3IgbG9nKSBhbiBlcnJvciBpZiBpbnZhbGlkXG4gKiBAcmV0dXJuIHtCb29sZWFufSB0cnVlIGlmIHNjaGVtYSBpcyB2YWxpZFxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZVNjaGVtYShzY2hlbWEsIHRocm93T3JMb2dFcnJvcikge1xuICB2YXIgJHNjaGVtYSA9IHNjaGVtYS4kc2NoZW1hO1xuICBpZiAoJHNjaGVtYSAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAkc2NoZW1hICE9ICdzdHJpbmcnKVxuICAgIHRocm93IG5ldyBFcnJvcignJHNjaGVtYSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICRzY2hlbWEgPSAkc2NoZW1hIHx8IHRoaXMuX29wdHMuZGVmYXVsdE1ldGEgfHwgZGVmYXVsdE1ldGEodGhpcyk7XG4gIGlmICghJHNjaGVtYSkge1xuICAgIHRoaXMubG9nZ2VyLndhcm4oJ21ldGEtc2NoZW1hIG5vdCBhdmFpbGFibGUnKTtcbiAgICB0aGlzLmVycm9ycyA9IG51bGw7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgdmFyIHZhbGlkID0gdGhpcy52YWxpZGF0ZSgkc2NoZW1hLCBzY2hlbWEpO1xuICBpZiAoIXZhbGlkICYmIHRocm93T3JMb2dFcnJvcikge1xuICAgIHZhciBtZXNzYWdlID0gJ3NjaGVtYSBpcyBpbnZhbGlkOiAnICsgdGhpcy5lcnJvcnNUZXh0KCk7XG4gICAgaWYgKHRoaXMuX29wdHMudmFsaWRhdGVTY2hlbWEgPT0gJ2xvZycpIHRoaXMubG9nZ2VyLmVycm9yKG1lc3NhZ2UpO1xuICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICB9XG4gIHJldHVybiB2YWxpZDtcbn1cblxuXG5mdW5jdGlvbiBkZWZhdWx0TWV0YShzZWxmKSB7XG4gIHZhciBtZXRhID0gc2VsZi5fb3B0cy5tZXRhO1xuICBzZWxmLl9vcHRzLmRlZmF1bHRNZXRhID0gdHlwZW9mIG1ldGEgPT0gJ29iamVjdCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IHNlbGYuX2dldElkKG1ldGEpIHx8IG1ldGFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHNlbGYuZ2V0U2NoZW1hKE1FVEFfU0NIRU1BX0lEKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBNRVRBX1NDSEVNQV9JRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB1bmRlZmluZWQ7XG4gIHJldHVybiBzZWxmLl9vcHRzLmRlZmF1bHRNZXRhO1xufVxuXG5cbi8qKlxuICogR2V0IGNvbXBpbGVkIHNjaGVtYSBmcm9tIHRoZSBpbnN0YW5jZSBieSBga2V5YCBvciBgcmVmYC5cbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0gIHtTdHJpbmd9IGtleVJlZiBga2V5YCB0aGF0IHdhcyBwYXNzZWQgdG8gYGFkZFNjaGVtYWAgb3IgZnVsbCBzY2hlbWEgcmVmZXJlbmNlIChgc2NoZW1hLmlkYCBvciByZXNvbHZlZCBpZCkuXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gc2NoZW1hIHZhbGlkYXRpbmcgZnVuY3Rpb24gKHdpdGggcHJvcGVydHkgYHNjaGVtYWApLlxuICovXG5mdW5jdGlvbiBnZXRTY2hlbWEoa2V5UmVmKSB7XG4gIHZhciBzY2hlbWFPYmogPSBfZ2V0U2NoZW1hT2JqKHRoaXMsIGtleVJlZik7XG4gIHN3aXRjaCAodHlwZW9mIHNjaGVtYU9iaikge1xuICAgIGNhc2UgJ29iamVjdCc6IHJldHVybiBzY2hlbWFPYmoudmFsaWRhdGUgfHwgdGhpcy5fY29tcGlsZShzY2hlbWFPYmopO1xuICAgIGNhc2UgJ3N0cmluZyc6IHJldHVybiB0aGlzLmdldFNjaGVtYShzY2hlbWFPYmopO1xuICAgIGNhc2UgJ3VuZGVmaW5lZCc6IHJldHVybiBfZ2V0U2NoZW1hRnJhZ21lbnQodGhpcywga2V5UmVmKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIF9nZXRTY2hlbWFGcmFnbWVudChzZWxmLCByZWYpIHtcbiAgdmFyIHJlcyA9IHJlc29sdmUuc2NoZW1hLmNhbGwoc2VsZiwgeyBzY2hlbWE6IHt9IH0sIHJlZik7XG4gIGlmIChyZXMpIHtcbiAgICB2YXIgc2NoZW1hID0gcmVzLnNjaGVtYVxuICAgICAgLCByb290ID0gcmVzLnJvb3RcbiAgICAgICwgYmFzZUlkID0gcmVzLmJhc2VJZDtcbiAgICB2YXIgdiA9IGNvbXBpbGVTY2hlbWEuY2FsbChzZWxmLCBzY2hlbWEsIHJvb3QsIHVuZGVmaW5lZCwgYmFzZUlkKTtcbiAgICBzZWxmLl9mcmFnbWVudHNbcmVmXSA9IG5ldyBTY2hlbWFPYmplY3Qoe1xuICAgICAgcmVmOiByZWYsXG4gICAgICBmcmFnbWVudDogdHJ1ZSxcbiAgICAgIHNjaGVtYTogc2NoZW1hLFxuICAgICAgcm9vdDogcm9vdCxcbiAgICAgIGJhc2VJZDogYmFzZUlkLFxuICAgICAgdmFsaWRhdGU6IHZcbiAgICB9KTtcbiAgICByZXR1cm4gdjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIF9nZXRTY2hlbWFPYmooc2VsZiwga2V5UmVmKSB7XG4gIGtleVJlZiA9IHJlc29sdmUubm9ybWFsaXplSWQoa2V5UmVmKTtcbiAgcmV0dXJuIHNlbGYuX3NjaGVtYXNba2V5UmVmXSB8fCBzZWxmLl9yZWZzW2tleVJlZl0gfHwgc2VsZi5fZnJhZ21lbnRzW2tleVJlZl07XG59XG5cblxuLyoqXG4gKiBSZW1vdmUgY2FjaGVkIHNjaGVtYShzKS5cbiAqIElmIG5vIHBhcmFtZXRlciBpcyBwYXNzZWQgYWxsIHNjaGVtYXMgYnV0IG1ldGEtc2NoZW1hcyBhcmUgcmVtb3ZlZC5cbiAqIElmIFJlZ0V4cCBpcyBwYXNzZWQgYWxsIHNjaGVtYXMgd2l0aCBrZXkvaWQgbWF0Y2hpbmcgcGF0dGVybiBidXQgbWV0YS1zY2hlbWFzIGFyZSByZW1vdmVkLlxuICogRXZlbiBpZiBzY2hlbWEgaXMgcmVmZXJlbmNlZCBieSBvdGhlciBzY2hlbWFzIGl0IHN0aWxsIGNhbiBiZSByZW1vdmVkIGFzIG90aGVyIHNjaGVtYXMgaGF2ZSBsb2NhbCByZWZlcmVuY2VzLlxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSAge1N0cmluZ3xPYmplY3R8UmVnRXhwfSBzY2hlbWFLZXlSZWYga2V5LCByZWYsIHBhdHRlcm4gdG8gbWF0Y2gga2V5L3JlZiBvciBzY2hlbWEgb2JqZWN0XG4gKiBAcmV0dXJuIHtBanZ9IHRoaXMgZm9yIG1ldGhvZCBjaGFpbmluZ1xuICovXG5mdW5jdGlvbiByZW1vdmVTY2hlbWEoc2NoZW1hS2V5UmVmKSB7XG4gIGlmIChzY2hlbWFLZXlSZWYgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICBfcmVtb3ZlQWxsU2NoZW1hcyh0aGlzLCB0aGlzLl9zY2hlbWFzLCBzY2hlbWFLZXlSZWYpO1xuICAgIF9yZW1vdmVBbGxTY2hlbWFzKHRoaXMsIHRoaXMuX3JlZnMsIHNjaGVtYUtleVJlZik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgc3dpdGNoICh0eXBlb2Ygc2NoZW1hS2V5UmVmKSB7XG4gICAgY2FzZSAndW5kZWZpbmVkJzpcbiAgICAgIF9yZW1vdmVBbGxTY2hlbWFzKHRoaXMsIHRoaXMuX3NjaGVtYXMpO1xuICAgICAgX3JlbW92ZUFsbFNjaGVtYXModGhpcywgdGhpcy5fcmVmcyk7XG4gICAgICB0aGlzLl9jYWNoZS5jbGVhcigpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgIHZhciBzY2hlbWFPYmogPSBfZ2V0U2NoZW1hT2JqKHRoaXMsIHNjaGVtYUtleVJlZik7XG4gICAgICBpZiAoc2NoZW1hT2JqKSB0aGlzLl9jYWNoZS5kZWwoc2NoZW1hT2JqLmNhY2hlS2V5KTtcbiAgICAgIGRlbGV0ZSB0aGlzLl9zY2hlbWFzW3NjaGVtYUtleVJlZl07XG4gICAgICBkZWxldGUgdGhpcy5fcmVmc1tzY2hlbWFLZXlSZWZdO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgIHZhciBzZXJpYWxpemUgPSB0aGlzLl9vcHRzLnNlcmlhbGl6ZTtcbiAgICAgIHZhciBjYWNoZUtleSA9IHNlcmlhbGl6ZSA/IHNlcmlhbGl6ZShzY2hlbWFLZXlSZWYpIDogc2NoZW1hS2V5UmVmO1xuICAgICAgdGhpcy5fY2FjaGUuZGVsKGNhY2hlS2V5KTtcbiAgICAgIHZhciBpZCA9IHRoaXMuX2dldElkKHNjaGVtYUtleVJlZik7XG4gICAgICBpZiAoaWQpIHtcbiAgICAgICAgaWQgPSByZXNvbHZlLm5vcm1hbGl6ZUlkKGlkKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3NjaGVtYXNbaWRdO1xuICAgICAgICBkZWxldGUgdGhpcy5fcmVmc1tpZF07XG4gICAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59XG5cblxuZnVuY3Rpb24gX3JlbW92ZUFsbFNjaGVtYXMoc2VsZiwgc2NoZW1hcywgcmVnZXgpIHtcbiAgZm9yICh2YXIga2V5UmVmIGluIHNjaGVtYXMpIHtcbiAgICB2YXIgc2NoZW1hT2JqID0gc2NoZW1hc1trZXlSZWZdO1xuICAgIGlmICghc2NoZW1hT2JqLm1ldGEgJiYgKCFyZWdleCB8fCByZWdleC50ZXN0KGtleVJlZikpKSB7XG4gICAgICBzZWxmLl9jYWNoZS5kZWwoc2NoZW1hT2JqLmNhY2hlS2V5KTtcbiAgICAgIGRlbGV0ZSBzY2hlbWFzW2tleVJlZl07XG4gICAgfVxuICB9XG59XG5cblxuLyogQHRoaXMgICBBanYgKi9cbmZ1bmN0aW9uIF9hZGRTY2hlbWEoc2NoZW1hLCBza2lwVmFsaWRhdGlvbiwgbWV0YSwgc2hvdWxkQWRkU2NoZW1hKSB7XG4gIGlmICh0eXBlb2Ygc2NoZW1hICE9ICdvYmplY3QnICYmIHR5cGVvZiBzY2hlbWEgIT0gJ2Jvb2xlYW4nKVxuICAgIHRocm93IG5ldyBFcnJvcignc2NoZW1hIHNob3VsZCBiZSBvYmplY3Qgb3IgYm9vbGVhbicpO1xuICB2YXIgc2VyaWFsaXplID0gdGhpcy5fb3B0cy5zZXJpYWxpemU7XG4gIHZhciBjYWNoZUtleSA9IHNlcmlhbGl6ZSA/IHNlcmlhbGl6ZShzY2hlbWEpIDogc2NoZW1hO1xuICB2YXIgY2FjaGVkID0gdGhpcy5fY2FjaGUuZ2V0KGNhY2hlS2V5KTtcbiAgaWYgKGNhY2hlZCkgcmV0dXJuIGNhY2hlZDtcblxuICBzaG91bGRBZGRTY2hlbWEgPSBzaG91bGRBZGRTY2hlbWEgfHwgdGhpcy5fb3B0cy5hZGRVc2VkU2NoZW1hICE9PSBmYWxzZTtcblxuICB2YXIgaWQgPSByZXNvbHZlLm5vcm1hbGl6ZUlkKHRoaXMuX2dldElkKHNjaGVtYSkpO1xuICBpZiAoaWQgJiYgc2hvdWxkQWRkU2NoZW1hKSBjaGVja1VuaXF1ZSh0aGlzLCBpZCk7XG5cbiAgdmFyIHdpbGxWYWxpZGF0ZSA9IHRoaXMuX29wdHMudmFsaWRhdGVTY2hlbWEgIT09IGZhbHNlICYmICFza2lwVmFsaWRhdGlvbjtcbiAgdmFyIHJlY3Vyc2l2ZU1ldGE7XG4gIGlmICh3aWxsVmFsaWRhdGUgJiYgIShyZWN1cnNpdmVNZXRhID0gaWQgJiYgaWQgPT0gcmVzb2x2ZS5ub3JtYWxpemVJZChzY2hlbWEuJHNjaGVtYSkpKVxuICAgIHRoaXMudmFsaWRhdGVTY2hlbWEoc2NoZW1hLCB0cnVlKTtcblxuICB2YXIgbG9jYWxSZWZzID0gcmVzb2x2ZS5pZHMuY2FsbCh0aGlzLCBzY2hlbWEpO1xuXG4gIHZhciBzY2hlbWFPYmogPSBuZXcgU2NoZW1hT2JqZWN0KHtcbiAgICBpZDogaWQsXG4gICAgc2NoZW1hOiBzY2hlbWEsXG4gICAgbG9jYWxSZWZzOiBsb2NhbFJlZnMsXG4gICAgY2FjaGVLZXk6IGNhY2hlS2V5LFxuICAgIG1ldGE6IG1ldGFcbiAgfSk7XG5cbiAgaWYgKGlkWzBdICE9ICcjJyAmJiBzaG91bGRBZGRTY2hlbWEpIHRoaXMuX3JlZnNbaWRdID0gc2NoZW1hT2JqO1xuICB0aGlzLl9jYWNoZS5wdXQoY2FjaGVLZXksIHNjaGVtYU9iaik7XG5cbiAgaWYgKHdpbGxWYWxpZGF0ZSAmJiByZWN1cnNpdmVNZXRhKSB0aGlzLnZhbGlkYXRlU2NoZW1hKHNjaGVtYSwgdHJ1ZSk7XG5cbiAgcmV0dXJuIHNjaGVtYU9iajtcbn1cblxuXG4vKiBAdGhpcyAgIEFqdiAqL1xuZnVuY3Rpb24gX2NvbXBpbGUoc2NoZW1hT2JqLCByb290KSB7XG4gIGlmIChzY2hlbWFPYmouY29tcGlsaW5nKSB7XG4gICAgc2NoZW1hT2JqLnZhbGlkYXRlID0gY2FsbFZhbGlkYXRlO1xuICAgIGNhbGxWYWxpZGF0ZS5zY2hlbWEgPSBzY2hlbWFPYmouc2NoZW1hO1xuICAgIGNhbGxWYWxpZGF0ZS5lcnJvcnMgPSBudWxsO1xuICAgIGNhbGxWYWxpZGF0ZS5yb290ID0gcm9vdCA/IHJvb3QgOiBjYWxsVmFsaWRhdGU7XG4gICAgaWYgKHNjaGVtYU9iai5zY2hlbWEuJGFzeW5jID09PSB0cnVlKVxuICAgICAgY2FsbFZhbGlkYXRlLiRhc3luYyA9IHRydWU7XG4gICAgcmV0dXJuIGNhbGxWYWxpZGF0ZTtcbiAgfVxuICBzY2hlbWFPYmouY29tcGlsaW5nID0gdHJ1ZTtcblxuICB2YXIgY3VycmVudE9wdHM7XG4gIGlmIChzY2hlbWFPYmoubWV0YSkge1xuICAgIGN1cnJlbnRPcHRzID0gdGhpcy5fb3B0cztcbiAgICB0aGlzLl9vcHRzID0gdGhpcy5fbWV0YU9wdHM7XG4gIH1cblxuICB2YXIgdjtcbiAgdHJ5IHsgdiA9IGNvbXBpbGVTY2hlbWEuY2FsbCh0aGlzLCBzY2hlbWFPYmouc2NoZW1hLCByb290LCBzY2hlbWFPYmoubG9jYWxSZWZzKTsgfVxuICBjYXRjaChlKSB7XG4gICAgZGVsZXRlIHNjaGVtYU9iai52YWxpZGF0ZTtcbiAgICB0aHJvdyBlO1xuICB9XG4gIGZpbmFsbHkge1xuICAgIHNjaGVtYU9iai5jb21waWxpbmcgPSBmYWxzZTtcbiAgICBpZiAoc2NoZW1hT2JqLm1ldGEpIHRoaXMuX29wdHMgPSBjdXJyZW50T3B0cztcbiAgfVxuXG4gIHNjaGVtYU9iai52YWxpZGF0ZSA9IHY7XG4gIHNjaGVtYU9iai5yZWZzID0gdi5yZWZzO1xuICBzY2hlbWFPYmoucmVmVmFsID0gdi5yZWZWYWw7XG4gIHNjaGVtYU9iai5yb290ID0gdi5yb290O1xuICByZXR1cm4gdjtcblxuXG4gIC8qIEB0aGlzICAgeyp9IC0gY3VzdG9tIGNvbnRleHQsIHNlZSBwYXNzQ29udGV4dCBvcHRpb24gKi9cbiAgZnVuY3Rpb24gY2FsbFZhbGlkYXRlKCkge1xuICAgIC8qIGpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB2YXIgX3ZhbGlkYXRlID0gc2NoZW1hT2JqLnZhbGlkYXRlO1xuICAgIHZhciByZXN1bHQgPSBfdmFsaWRhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBjYWxsVmFsaWRhdGUuZXJyb3JzID0gX3ZhbGlkYXRlLmVycm9ycztcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG5cblxuZnVuY3Rpb24gY2hvb3NlR2V0SWQob3B0cykge1xuICBzd2l0Y2ggKG9wdHMuc2NoZW1hSWQpIHtcbiAgICBjYXNlICdhdXRvJzogcmV0dXJuIF9nZXQkSWRPcklkO1xuICAgIGNhc2UgJ2lkJzogcmV0dXJuIF9nZXRJZDtcbiAgICBkZWZhdWx0OiByZXR1cm4gX2dldCRJZDtcbiAgfVxufVxuXG4vKiBAdGhpcyAgIEFqdiAqL1xuZnVuY3Rpb24gX2dldElkKHNjaGVtYSkge1xuICBpZiAoc2NoZW1hLiRpZCkgdGhpcy5sb2dnZXIud2Fybignc2NoZW1hICRpZCBpZ25vcmVkJywgc2NoZW1hLiRpZCk7XG4gIHJldHVybiBzY2hlbWEuaWQ7XG59XG5cbi8qIEB0aGlzICAgQWp2ICovXG5mdW5jdGlvbiBfZ2V0JElkKHNjaGVtYSkge1xuICBpZiAoc2NoZW1hLmlkKSB0aGlzLmxvZ2dlci53YXJuKCdzY2hlbWEgaWQgaWdub3JlZCcsIHNjaGVtYS5pZCk7XG4gIHJldHVybiBzY2hlbWEuJGlkO1xufVxuXG5cbmZ1bmN0aW9uIF9nZXQkSWRPcklkKHNjaGVtYSkge1xuICBpZiAoc2NoZW1hLiRpZCAmJiBzY2hlbWEuaWQgJiYgc2NoZW1hLiRpZCAhPSBzY2hlbWEuaWQpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdzY2hlbWEgJGlkIGlzIGRpZmZlcmVudCBmcm9tIGlkJyk7XG4gIHJldHVybiBzY2hlbWEuJGlkIHx8IHNjaGVtYS5pZDtcbn1cblxuXG4vKipcbiAqIENvbnZlcnQgYXJyYXkgb2YgZXJyb3IgbWVzc2FnZSBvYmplY3RzIHRvIHN0cmluZ1xuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSAge0FycmF5PE9iamVjdD59IGVycm9ycyBvcHRpb25hbCBhcnJheSBvZiB2YWxpZGF0aW9uIGVycm9ycywgaWYgbm90IHBhc3NlZCBlcnJvcnMgZnJvbSB0aGUgaW5zdGFuY2UgYXJlIHVzZWQuXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnMgb3B0aW9uYWwgb3B0aW9ucyB3aXRoIHByb3BlcnRpZXMgYHNlcGFyYXRvcmAgYW5kIGBkYXRhVmFyYC5cbiAqIEByZXR1cm4ge1N0cmluZ30gaHVtYW4gcmVhZGFibGUgc3RyaW5nIHdpdGggYWxsIGVycm9ycyBkZXNjcmlwdGlvbnNcbiAqL1xuZnVuY3Rpb24gZXJyb3JzVGV4dChlcnJvcnMsIG9wdGlvbnMpIHtcbiAgZXJyb3JzID0gZXJyb3JzIHx8IHRoaXMuZXJyb3JzO1xuICBpZiAoIWVycm9ycykgcmV0dXJuICdObyBlcnJvcnMnO1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIHNlcGFyYXRvciA9IG9wdGlvbnMuc2VwYXJhdG9yID09PSB1bmRlZmluZWQgPyAnLCAnIDogb3B0aW9ucy5zZXBhcmF0b3I7XG4gIHZhciBkYXRhVmFyID0gb3B0aW9ucy5kYXRhVmFyID09PSB1bmRlZmluZWQgPyAnZGF0YScgOiBvcHRpb25zLmRhdGFWYXI7XG5cbiAgdmFyIHRleHQgPSAnJztcbiAgZm9yICh2YXIgaT0wOyBpPGVycm9ycy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBlID0gZXJyb3JzW2ldO1xuICAgIGlmIChlKSB0ZXh0ICs9IGRhdGFWYXIgKyBlLmRhdGFQYXRoICsgJyAnICsgZS5tZXNzYWdlICsgc2VwYXJhdG9yO1xuICB9XG4gIHJldHVybiB0ZXh0LnNsaWNlKDAsIC1zZXBhcmF0b3IubGVuZ3RoKTtcbn1cblxuXG4vKipcbiAqIEFkZCBjdXN0b20gZm9ybWF0XG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgZm9ybWF0IG5hbWVcbiAqIEBwYXJhbSB7U3RyaW5nfFJlZ0V4cHxGdW5jdGlvbn0gZm9ybWF0IHN0cmluZyBpcyBjb252ZXJ0ZWQgdG8gUmVnRXhwOyBmdW5jdGlvbiBzaG91bGQgcmV0dXJuIGJvb2xlYW4gKHRydWUgd2hlbiB2YWxpZClcbiAqIEByZXR1cm4ge0Fqdn0gdGhpcyBmb3IgbWV0aG9kIGNoYWluaW5nXG4gKi9cbmZ1bmN0aW9uIGFkZEZvcm1hdChuYW1lLCBmb3JtYXQpIHtcbiAgaWYgKHR5cGVvZiBmb3JtYXQgPT0gJ3N0cmluZycpIGZvcm1hdCA9IG5ldyBSZWdFeHAoZm9ybWF0KTtcbiAgdGhpcy5fZm9ybWF0c1tuYW1lXSA9IGZvcm1hdDtcbiAgcmV0dXJuIHRoaXM7XG59XG5cblxuZnVuY3Rpb24gYWRkRGVmYXVsdE1ldGFTY2hlbWEoc2VsZikge1xuICB2YXIgJGRhdGFTY2hlbWE7XG4gIGlmIChzZWxmLl9vcHRzLiRkYXRhKSB7XG4gICAgJGRhdGFTY2hlbWEgPSByZXF1aXJlKCcuL3JlZnMvZGF0YS5qc29uJyk7XG4gICAgc2VsZi5hZGRNZXRhU2NoZW1hKCRkYXRhU2NoZW1hLCAkZGF0YVNjaGVtYS4kaWQsIHRydWUpO1xuICB9XG4gIGlmIChzZWxmLl9vcHRzLm1ldGEgPT09IGZhbHNlKSByZXR1cm47XG4gIHZhciBtZXRhU2NoZW1hID0gcmVxdWlyZSgnLi9yZWZzL2pzb24tc2NoZW1hLWRyYWZ0LTA3Lmpzb24nKTtcbiAgaWYgKHNlbGYuX29wdHMuJGRhdGEpIG1ldGFTY2hlbWEgPSAkZGF0YU1ldGFTY2hlbWEobWV0YVNjaGVtYSwgTUVUQV9TVVBQT1JUX0RBVEEpO1xuICBzZWxmLmFkZE1ldGFTY2hlbWEobWV0YVNjaGVtYSwgTUVUQV9TQ0hFTUFfSUQsIHRydWUpO1xuICBzZWxmLl9yZWZzWydodHRwOi8vanNvbi1zY2hlbWEub3JnL3NjaGVtYSddID0gTUVUQV9TQ0hFTUFfSUQ7XG59XG5cblxuZnVuY3Rpb24gYWRkSW5pdGlhbFNjaGVtYXMoc2VsZikge1xuICB2YXIgb3B0c1NjaGVtYXMgPSBzZWxmLl9vcHRzLnNjaGVtYXM7XG4gIGlmICghb3B0c1NjaGVtYXMpIHJldHVybjtcbiAgaWYgKEFycmF5LmlzQXJyYXkob3B0c1NjaGVtYXMpKSBzZWxmLmFkZFNjaGVtYShvcHRzU2NoZW1hcyk7XG4gIGVsc2UgZm9yICh2YXIga2V5IGluIG9wdHNTY2hlbWFzKSBzZWxmLmFkZFNjaGVtYShvcHRzU2NoZW1hc1trZXldLCBrZXkpO1xufVxuXG5cbmZ1bmN0aW9uIGFkZEluaXRpYWxGb3JtYXRzKHNlbGYpIHtcbiAgZm9yICh2YXIgbmFtZSBpbiBzZWxmLl9vcHRzLmZvcm1hdHMpIHtcbiAgICB2YXIgZm9ybWF0ID0gc2VsZi5fb3B0cy5mb3JtYXRzW25hbWVdO1xuICAgIHNlbGYuYWRkRm9ybWF0KG5hbWUsIGZvcm1hdCk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBhZGRJbml0aWFsS2V5d29yZHMoc2VsZikge1xuICBmb3IgKHZhciBuYW1lIGluIHNlbGYuX29wdHMua2V5d29yZHMpIHtcbiAgICB2YXIga2V5d29yZCA9IHNlbGYuX29wdHMua2V5d29yZHNbbmFtZV07XG4gICAgc2VsZi5hZGRLZXl3b3JkKG5hbWUsIGtleXdvcmQpO1xuICB9XG59XG5cblxuZnVuY3Rpb24gY2hlY2tVbmlxdWUoc2VsZiwgaWQpIHtcbiAgaWYgKHNlbGYuX3NjaGVtYXNbaWRdIHx8IHNlbGYuX3JlZnNbaWRdKVxuICAgIHRocm93IG5ldyBFcnJvcignc2NoZW1hIHdpdGgga2V5IG9yIGlkIFwiJyArIGlkICsgJ1wiIGFscmVhZHkgZXhpc3RzJyk7XG59XG5cblxuZnVuY3Rpb24gZ2V0TWV0YVNjaGVtYU9wdGlvbnMoc2VsZikge1xuICB2YXIgbWV0YU9wdHMgPSB1dGlsLmNvcHkoc2VsZi5fb3B0cyk7XG4gIGZvciAodmFyIGk9MDsgaTxNRVRBX0lHTk9SRV9PUFRJT05TLmxlbmd0aDsgaSsrKVxuICAgIGRlbGV0ZSBtZXRhT3B0c1tNRVRBX0lHTk9SRV9PUFRJT05TW2ldXTtcbiAgcmV0dXJuIG1ldGFPcHRzO1xufVxuXG5cbmZ1bmN0aW9uIHNldExvZ2dlcihzZWxmKSB7XG4gIHZhciBsb2dnZXIgPSBzZWxmLl9vcHRzLmxvZ2dlcjtcbiAgaWYgKGxvZ2dlciA9PT0gZmFsc2UpIHtcbiAgICBzZWxmLmxvZ2dlciA9IHtsb2c6IG5vb3AsIHdhcm46IG5vb3AsIGVycm9yOiBub29wfTtcbiAgfSBlbHNlIHtcbiAgICBpZiAobG9nZ2VyID09PSB1bmRlZmluZWQpIGxvZ2dlciA9IGNvbnNvbGU7XG4gICAgaWYgKCEodHlwZW9mIGxvZ2dlciA9PSAnb2JqZWN0JyAmJiBsb2dnZXIubG9nICYmIGxvZ2dlci53YXJuICYmIGxvZ2dlci5lcnJvcikpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2xvZ2dlciBtdXN0IGltcGxlbWVudCBsb2csIHdhcm4gYW5kIGVycm9yIG1ldGhvZHMnKTtcbiAgICBzZWxmLmxvZ2dlciA9IGxvZ2dlcjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2Fqdi5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciBDYWNoZSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gQ2FjaGUoKSB7XG4gIHRoaXMuX2NhY2hlID0ge307XG59O1xuXG5cbkNhY2hlLnByb3RvdHlwZS5wdXQgPSBmdW5jdGlvbiBDYWNoZV9wdXQoa2V5LCB2YWx1ZSkge1xuICB0aGlzLl9jYWNoZVtrZXldID0gdmFsdWU7XG59O1xuXG5cbkNhY2hlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiBDYWNoZV9nZXQoa2V5KSB7XG4gIHJldHVybiB0aGlzLl9jYWNoZVtrZXldO1xufTtcblxuXG5DYWNoZS5wcm90b3R5cGUuZGVsID0gZnVuY3Rpb24gQ2FjaGVfZGVsKGtleSkge1xuICBkZWxldGUgdGhpcy5fY2FjaGVba2V5XTtcbn07XG5cblxuQ2FjaGUucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gQ2FjaGVfY2xlYXIoKSB7XG4gIHRoaXMuX2NhY2hlID0ge307XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2NhY2hlLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWJcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5cbnZhciBNaXNzaW5nUmVmRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yX2NsYXNzZXMnKS5NaXNzaW5nUmVmO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBpbGVBc3luYztcblxuXG4vKipcbiAqIENyZWF0ZXMgdmFsaWRhdGluZyBmdW5jdGlvbiBmb3IgcGFzc2VkIHNjaGVtYSB3aXRoIGFzeW5jaHJvbm91cyBsb2FkaW5nIG9mIG1pc3Npbmcgc2NoZW1hcy5cbiAqIGBsb2FkU2NoZW1hYCBvcHRpb24gc2hvdWxkIGJlIGEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIHNjaGVtYSB1cmkgYW5kIHJldHVybnMgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdpdGggdGhlIHNjaGVtYS5cbiAqIEB0aGlzICBBanZcbiAqIEBwYXJhbSB7T2JqZWN0fSAgIHNjaGVtYSBzY2hlbWEgb2JqZWN0XG4gKiBAcGFyYW0ge0Jvb2xlYW59ICBtZXRhIG9wdGlvbmFsIHRydWUgdG8gY29tcGlsZSBtZXRhLXNjaGVtYTsgdGhpcyBwYXJhbWV0ZXIgY2FuIGJlIHNraXBwZWRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGFuIG9wdGlvbmFsIG5vZGUtc3R5bGUgY2FsbGJhY2ssIGl0IGlzIGNhbGxlZCB3aXRoIDIgcGFyYW1ldGVyczogZXJyb3IgKG9yIG51bGwpIGFuZCB2YWxpZGF0aW5nIGZ1bmN0aW9uLlxuICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdpdGggYSB2YWxpZGF0aW5nIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiBjb21waWxlQXN5bmMoc2NoZW1hLCBtZXRhLCBjYWxsYmFjaykge1xuICAvKiBlc2xpbnQgbm8tc2hhZG93OiAwICovXG4gIC8qIGdsb2JhbCBQcm9taXNlICovXG4gIC8qIGpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAodHlwZW9mIHRoaXMuX29wdHMubG9hZFNjaGVtYSAhPSAnZnVuY3Rpb24nKVxuICAgIHRocm93IG5ldyBFcnJvcignb3B0aW9ucy5sb2FkU2NoZW1hIHNob3VsZCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKHR5cGVvZiBtZXRhID09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG1ldGE7XG4gICAgbWV0YSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHZhciBwID0gbG9hZE1ldGFTY2hlbWFPZihzY2hlbWEpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgIHZhciBzY2hlbWFPYmogPSBzZWxmLl9hZGRTY2hlbWEoc2NoZW1hLCB1bmRlZmluZWQsIG1ldGEpO1xuICAgIHJldHVybiBzY2hlbWFPYmoudmFsaWRhdGUgfHwgX2NvbXBpbGVBc3luYyhzY2hlbWFPYmopO1xuICB9KTtcblxuICBpZiAoY2FsbGJhY2spIHtcbiAgICBwLnRoZW4oXG4gICAgICBmdW5jdGlvbih2KSB7IGNhbGxiYWNrKG51bGwsIHYpOyB9LFxuICAgICAgY2FsbGJhY2tcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIHA7XG5cblxuICBmdW5jdGlvbiBsb2FkTWV0YVNjaGVtYU9mKHNjaCkge1xuICAgIHZhciAkc2NoZW1hID0gc2NoLiRzY2hlbWE7XG4gICAgcmV0dXJuICRzY2hlbWEgJiYgIXNlbGYuZ2V0U2NoZW1hKCRzY2hlbWEpXG4gICAgICAgICAgICA/IGNvbXBpbGVBc3luYy5jYWxsKHNlbGYsIHsgJHJlZjogJHNjaGVtYSB9LCB0cnVlKVxuICAgICAgICAgICAgOiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gX2NvbXBpbGVBc3luYyhzY2hlbWFPYmopIHtcbiAgICB0cnkgeyByZXR1cm4gc2VsZi5fY29tcGlsZShzY2hlbWFPYmopOyB9XG4gICAgY2F0Y2goZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBNaXNzaW5nUmVmRXJyb3IpIHJldHVybiBsb2FkTWlzc2luZ1NjaGVtYShlKTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBsb2FkTWlzc2luZ1NjaGVtYShlKSB7XG4gICAgICB2YXIgcmVmID0gZS5taXNzaW5nU2NoZW1hO1xuICAgICAgaWYgKGFkZGVkKHJlZikpIHRocm93IG5ldyBFcnJvcignU2NoZW1hICcgKyByZWYgKyAnIGlzIGxvYWRlZCBidXQgJyArIGUubWlzc2luZ1JlZiArICcgY2Fubm90IGJlIHJlc29sdmVkJyk7XG5cbiAgICAgIHZhciBzY2hlbWFQcm9taXNlID0gc2VsZi5fbG9hZGluZ1NjaGVtYXNbcmVmXTtcbiAgICAgIGlmICghc2NoZW1hUHJvbWlzZSkge1xuICAgICAgICBzY2hlbWFQcm9taXNlID0gc2VsZi5fbG9hZGluZ1NjaGVtYXNbcmVmXSA9IHNlbGYuX29wdHMubG9hZFNjaGVtYShyZWYpO1xuICAgICAgICBzY2hlbWFQcm9taXNlLnRoZW4ocmVtb3ZlUHJvbWlzZSwgcmVtb3ZlUHJvbWlzZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzY2hlbWFQcm9taXNlLnRoZW4oZnVuY3Rpb24gKHNjaCkge1xuICAgICAgICBpZiAoIWFkZGVkKHJlZikpIHtcbiAgICAgICAgICByZXR1cm4gbG9hZE1ldGFTY2hlbWFPZihzY2gpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCFhZGRlZChyZWYpKSBzZWxmLmFkZFNjaGVtYShzY2gsIHJlZiwgdW5kZWZpbmVkLCBtZXRhKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9jb21waWxlQXN5bmMoc2NoZW1hT2JqKTtcbiAgICAgIH0pO1xuXG4gICAgICBmdW5jdGlvbiByZW1vdmVQcm9taXNlKCkge1xuICAgICAgICBkZWxldGUgc2VsZi5fbG9hZGluZ1NjaGVtYXNbcmVmXTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gYWRkZWQocmVmKSB7XG4gICAgICAgIHJldHVybiBzZWxmLl9yZWZzW3JlZl0gfHwgc2VsZi5fc2NoZW1hc1tyZWZdO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvYXN5bmMuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVzb2x2ZSA9IHJlcXVpcmUoJy4vcmVzb2x2ZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgVmFsaWRhdGlvbjogZXJyb3JTdWJjbGFzcyhWYWxpZGF0aW9uRXJyb3IpLFxuICBNaXNzaW5nUmVmOiBlcnJvclN1YmNsYXNzKE1pc3NpbmdSZWZFcnJvcilcbn07XG5cblxuZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yKGVycm9ycykge1xuICB0aGlzLm1lc3NhZ2UgPSAndmFsaWRhdGlvbiBmYWlsZWQnO1xuICB0aGlzLmVycm9ycyA9IGVycm9ycztcbiAgdGhpcy5hanYgPSB0aGlzLnZhbGlkYXRpb24gPSB0cnVlO1xufVxuXG5cbk1pc3NpbmdSZWZFcnJvci5tZXNzYWdlID0gZnVuY3Rpb24gKGJhc2VJZCwgcmVmKSB7XG4gIHJldHVybiAnY2FuXFwndCByZXNvbHZlIHJlZmVyZW5jZSAnICsgcmVmICsgJyBmcm9tIGlkICcgKyBiYXNlSWQ7XG59O1xuXG5cbmZ1bmN0aW9uIE1pc3NpbmdSZWZFcnJvcihiYXNlSWQsIHJlZiwgbWVzc2FnZSkge1xuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlIHx8IE1pc3NpbmdSZWZFcnJvci5tZXNzYWdlKGJhc2VJZCwgcmVmKTtcbiAgdGhpcy5taXNzaW5nUmVmID0gcmVzb2x2ZS51cmwoYmFzZUlkLCByZWYpO1xuICB0aGlzLm1pc3NpbmdTY2hlbWEgPSByZXNvbHZlLm5vcm1hbGl6ZUlkKHJlc29sdmUuZnVsbFBhdGgodGhpcy5taXNzaW5nUmVmKSk7XG59XG5cblxuZnVuY3Rpb24gZXJyb3JTdWJjbGFzcyhTdWJjbGFzcykge1xuICBTdWJjbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG4gIFN1YmNsYXNzLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFN1YmNsYXNzO1xuICByZXR1cm4gU3ViY2xhc3M7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS9lcnJvcl9jbGFzc2VzLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIERBVEUgPSAvXihcXGRcXGRcXGRcXGQpLShcXGRcXGQpLShcXGRcXGQpJC87XG52YXIgREFZUyA9IFswLDMxLDI4LDMxLDMwLDMxLDMwLDMxLDMxLDMwLDMxLDMwLDMxXTtcbnZhciBUSU1FID0gL14oXFxkXFxkKTooXFxkXFxkKTooXFxkXFxkKShcXC5cXGQrKT8oenxbKy1dXFxkXFxkKD86Oj9cXGRcXGQpPyk/JC9pO1xudmFyIEhPU1ROQU1FID0gL14oPz0uezEsMjUzfVxcLj8kKVthLXowLTldKD86W2EtejAtOS1dezAsNjF9W2EtejAtOV0pPyg/OlxcLlthLXowLTldKD86Wy0wLTlhLXpdezAsNjF9WzAtOWEtel0pPykqXFwuPyQvaTtcbnZhciBVUkkgPSAvXig/OlthLXpdW2EtejAtOStcXC0uXSo6KSg/OlxcLz9cXC8oPzooPzpbYS16MC05XFwtLl9+ISQmJygpKissOz06XXwlWzAtOWEtZl17Mn0pKkApPyg/OlxcWyg/Oig/Oig/Oig/OlswLTlhLWZdezEsNH06KXs2fXw6Oig/OlswLTlhLWZdezEsNH06KXs1fXwoPzpbMC05YS1mXXsxLDR9KT86Oig/OlswLTlhLWZdezEsNH06KXs0fXwoPzooPzpbMC05YS1mXXsxLDR9Oil7MCwxfVswLTlhLWZdezEsNH0pPzo6KD86WzAtOWEtZl17MSw0fTopezN9fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDJ9WzAtOWEtZl17MSw0fSk/OjooPzpbMC05YS1mXXsxLDR9Oil7Mn18KD86KD86WzAtOWEtZl17MSw0fTopezAsM31bMC05YS1mXXsxLDR9KT86OlswLTlhLWZdezEsNH06fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDR9WzAtOWEtZl17MSw0fSk/OjopKD86WzAtOWEtZl17MSw0fTpbMC05YS1mXXsxLDR9fCg/Oig/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPylcXC4pezN9KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KSl8KD86KD86WzAtOWEtZl17MSw0fTopezAsNX1bMC05YS1mXXsxLDR9KT86OlswLTlhLWZdezEsNH18KD86KD86WzAtOWEtZl17MSw0fTopezAsNn1bMC05YS1mXXsxLDR9KT86Oil8W1Z2XVswLTlhLWZdK1xcLlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpdKylcXF18KD86KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KVxcLil7M30oPzoyNVswLTVdfDJbMC00XVxcZHxbMDFdP1xcZFxcZD8pfCg/OlthLXowLTlcXC0uX34hJCYnKCkqKyw7PV18JVswLTlhLWZdezJ9KSopKD86OlxcZCopPyg/OlxcLyg/OlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKikqfFxcLyg/Oig/OlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKyg/OlxcLyg/OlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKikqKT98KD86W2EtejAtOVxcLS5ffiEkJicoKSorLDs9OkBdfCVbMC05YS1mXXsyfSkrKD86XFwvKD86W2EtejAtOVxcLS5ffiEkJicoKSorLDs9OkBdfCVbMC05YS1mXXsyfSkqKSopKD86XFw/KD86W2EtejAtOVxcLS5ffiEkJicoKSorLDs9OkAvP118JVswLTlhLWZdezJ9KSopPyg/OiMoPzpbYS16MC05XFwtLl9+ISQmJygpKissOz06QC8/XXwlWzAtOWEtZl17Mn0pKik/JC9pO1xudmFyIFVSSVJFRiA9IC9eKD86W2Etel1bYS16MC05K1xcLS5dKjopPyg/OlxcLz9cXC8oPzooPzpbYS16MC05XFwtLl9+ISQmJygpKissOz06XXwlWzAtOWEtZl17Mn0pKkApPyg/OlxcWyg/Oig/Oig/Oig/OlswLTlhLWZdezEsNH06KXs2fXw6Oig/OlswLTlhLWZdezEsNH06KXs1fXwoPzpbMC05YS1mXXsxLDR9KT86Oig/OlswLTlhLWZdezEsNH06KXs0fXwoPzooPzpbMC05YS1mXXsxLDR9Oil7MCwxfVswLTlhLWZdezEsNH0pPzo6KD86WzAtOWEtZl17MSw0fTopezN9fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDJ9WzAtOWEtZl17MSw0fSk/OjooPzpbMC05YS1mXXsxLDR9Oil7Mn18KD86KD86WzAtOWEtZl17MSw0fTopezAsM31bMC05YS1mXXsxLDR9KT86OlswLTlhLWZdezEsNH06fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDR9WzAtOWEtZl17MSw0fSk/OjopKD86WzAtOWEtZl17MSw0fTpbMC05YS1mXXsxLDR9fCg/Oig/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPylcXC4pezN9KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KSl8KD86KD86WzAtOWEtZl17MSw0fTopezAsNX1bMC05YS1mXXsxLDR9KT86OlswLTlhLWZdezEsNH18KD86KD86WzAtOWEtZl17MSw0fTopezAsNn1bMC05YS1mXXsxLDR9KT86Oil8W1Z2XVswLTlhLWZdK1xcLlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpdKylcXF18KD86KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KVxcLil7M30oPzoyNVswLTVdfDJbMC00XVxcZHxbMDFdP1xcZFxcZD8pfCg/OlthLXowLTlcXC0uX34hJCYnXCIoKSorLDs9XXwlWzAtOWEtZl17Mn0pKikoPzo6XFxkKik/KD86XFwvKD86W2EtejAtOVxcLS5ffiEkJidcIigpKissOz06QF18JVswLTlhLWZdezJ9KSopKnxcXC8oPzooPzpbYS16MC05XFwtLl9+ISQmJ1wiKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKyg/OlxcLyg/OlthLXowLTlcXC0uX34hJCYnXCIoKSorLDs9OkBdfCVbMC05YS1mXXsyfSkqKSopP3woPzpbYS16MC05XFwtLl9+ISQmJ1wiKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKyg/OlxcLyg/OlthLXowLTlcXC0uX34hJCYnXCIoKSorLDs9OkBdfCVbMC05YS1mXXsyfSkqKSopPyg/OlxcPyg/OlthLXowLTlcXC0uX34hJCYnXCIoKSorLDs9OkAvP118JVswLTlhLWZdezJ9KSopPyg/OiMoPzpbYS16MC05XFwtLl9+ISQmJ1wiKCkqKyw7PTpALz9dfCVbMC05YS1mXXsyfSkqKT8kL2k7XG4vLyB1cmktdGVtcGxhdGU6IGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2NTcwXG52YXIgVVJJVEVNUExBVEUgPSAvXig/Oig/OlteXFx4MDAtXFx4MjBcIic8PiVcXFxcXmB7fH1dfCVbMC05YS1mXXsyfSl8XFx7WysjLi87PyY9LCFAfF0/KD86W2EtejAtOV9dfCVbMC05YS1mXXsyfSkrKD86OlsxLTldWzAtOV17MCwzfXxcXCopPyg/OiwoPzpbYS16MC05X118JVswLTlhLWZdezJ9KSsoPzo6WzEtOV1bMC05XXswLDN9fFxcKik/KSpcXH0pKiQvaTtcbi8vIEZvciB0aGUgc291cmNlOiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9kcGVyaW5pLzcyOTI5NFxuLy8gRm9yIHRlc3QgY2FzZXM6IGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9kZW1vL3VybC1yZWdleFxuLy8gQHRvZG8gRGVsZXRlIGN1cnJlbnQgVVJMIGluIGZhdm91ciBvZiB0aGUgY29tbWVudGVkIG91dCBVUkwgcnVsZSB3aGVuIHRoaXMgaXNzdWUgaXMgZml4ZWQgaHR0cHM6Ly9naXRodWIuY29tL2VzbGludC9lc2xpbnQvaXNzdWVzLzc5ODMuXG4vLyB2YXIgVVJMID0gL14oPzooPzpodHRwcz98ZnRwKTpcXC9cXC8pKD86XFxTKyg/OjpcXFMqKT9AKT8oPzooPyExMCg/OlxcLlxcZHsxLDN9KXszfSkoPyExMjcoPzpcXC5cXGR7MSwzfSl7M30pKD8hMTY5XFwuMjU0KD86XFwuXFxkezEsM30pezJ9KSg/ITE5MlxcLjE2OCg/OlxcLlxcZHsxLDN9KXsyfSkoPyExNzJcXC4oPzoxWzYtOV18MlxcZHwzWzAtMV0pKD86XFwuXFxkezEsM30pezJ9KSg/OlsxLTldXFxkP3wxXFxkXFxkfDJbMDFdXFxkfDIyWzAtM10pKD86XFwuKD86MT9cXGR7MSwyfXwyWzAtNF1cXGR8MjVbMC01XSkpezJ9KD86XFwuKD86WzEtOV1cXGQ/fDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNF0pKXwoPzooPzpbYS16XFx1ezAwYTF9LVxcdXtmZmZmfTAtOV0rLSkqW2EtelxcdXswMGExfS1cXHV7ZmZmZn0wLTldKykoPzpcXC4oPzpbYS16XFx1ezAwYTF9LVxcdXtmZmZmfTAtOV0rLSkqW2EtelxcdXswMGExfS1cXHV7ZmZmZn0wLTldKykqKD86XFwuKD86W2EtelxcdXswMGExfS1cXHV7ZmZmZn1dezIsfSkpKSg/OjpcXGR7Miw1fSk/KD86XFwvW15cXHNdKik/JC9pdTtcbnZhciBVUkwgPSAvXig/Oig/Omh0dHBbc1xcdTAxN0ZdP3xmdHApOlxcL1xcLykoPzooPzpbXFwwLVxceDA4XFx4MEUtXFx4MUYhLVxceDlGXFx4QTEtXFx1MTY3RlxcdTE2ODEtXFx1MUZGRlxcdTIwMEItXFx1MjAyN1xcdTIwMkEtXFx1MjAyRVxcdTIwMzAtXFx1MjA1RVxcdTIwNjAtXFx1MkZGRlxcdTMwMDEtXFx1RDdGRlxcdUUwMDAtXFx1RkVGRVxcdUZGMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl1bXFx1REMwMC1cXHVERkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkrKD86Oig/OltcXDAtXFx4MDhcXHgwRS1cXHgxRiEtXFx4OUZcXHhBMS1cXHUxNjdGXFx1MTY4MS1cXHUxRkZGXFx1MjAwQi1cXHUyMDI3XFx1MjAyQS1cXHUyMDJFXFx1MjAzMC1cXHUyMDVFXFx1MjA2MC1cXHUyRkZGXFx1MzAwMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRUZFXFx1RkYwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXVtcXHVEQzAwLVxcdURGRkZdfFtcXHVEODAwLVxcdURCRkZdKD8hW1xcdURDMDAtXFx1REZGRl0pfCg/OlteXFx1RDgwMC1cXHVEQkZGXXxeKVtcXHVEQzAwLVxcdURGRkZdKSopP0ApPyg/Oig/ITEwKD86XFwuWzAtOV17MSwzfSl7M30pKD8hMTI3KD86XFwuWzAtOV17MSwzfSl7M30pKD8hMTY5XFwuMjU0KD86XFwuWzAtOV17MSwzfSl7Mn0pKD8hMTkyXFwuMTY4KD86XFwuWzAtOV17MSwzfSl7Mn0pKD8hMTcyXFwuKD86MVs2LTldfDJbMC05XXwzWzAxXSkoPzpcXC5bMC05XXsxLDN9KXsyfSkoPzpbMS05XVswLTldP3wxWzAtOV1bMC05XXwyWzAxXVswLTldfDIyWzAtM10pKD86XFwuKD86MT9bMC05XXsxLDJ9fDJbMC00XVswLTldfDI1WzAtNV0pKXsyfSg/OlxcLig/OlsxLTldWzAtOV0/fDFbMC05XVswLTldfDJbMC00XVswLTldfDI1WzAtNF0pKXwoPzooPzooPzpbMC05YS16XFx4QTEtXFx1RDdGRlxcdUUwMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl0oPyFbXFx1REMwMC1cXHVERkZGXSl8KD86W15cXHVEODAwLVxcdURCRkZdfF4pW1xcdURDMDAtXFx1REZGRl0pKy0pKig/OlswLTlhLXpcXHhBMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkrKSg/OlxcLig/Oig/OlswLTlhLXpcXHhBMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkrLSkqKD86WzAtOWEtelxceEExLVxcdUQ3RkZcXHVFMDAwLVxcdUZGRkZdfFtcXHVEODAwLVxcdURCRkZdKD8hW1xcdURDMDAtXFx1REZGRl0pfCg/OlteXFx1RDgwMC1cXHVEQkZGXXxeKVtcXHVEQzAwLVxcdURGRkZdKSspKig/OlxcLig/Oig/OlthLXpcXHhBMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSl7Mix9KSkpKD86OlswLTldezIsNX0pPyg/OlxcLyg/OltcXDAtXFx4MDhcXHgwRS1cXHgxRiEtXFx4OUZcXHhBMS1cXHUxNjdGXFx1MTY4MS1cXHUxRkZGXFx1MjAwQi1cXHUyMDI3XFx1MjAyQS1cXHUyMDJFXFx1MjAzMC1cXHUyMDVFXFx1MjA2MC1cXHUyRkZGXFx1MzAwMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRUZFXFx1RkYwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXVtcXHVEQzAwLVxcdURGRkZdfFtcXHVEODAwLVxcdURCRkZdKD8hW1xcdURDMDAtXFx1REZGRl0pfCg/OlteXFx1RDgwMC1cXHVEQkZGXXxeKVtcXHVEQzAwLVxcdURGRkZdKSopPyQvaTtcbnZhciBVVUlEID0gL14oPzp1cm46dXVpZDopP1swLTlhLWZdezh9LSg/OlswLTlhLWZdezR9LSl7M31bMC05YS1mXXsxMn0kL2k7XG52YXIgSlNPTl9QT0lOVEVSID0gL14oPzpcXC8oPzpbXn4vXXx+MHx+MSkqKSokLztcbnZhciBKU09OX1BPSU5URVJfVVJJX0ZSQUdNRU5UID0gL14jKD86XFwvKD86W2EtejAtOV9cXC0uISQmJygpKissOzo9QF18JVswLTlhLWZdezJ9fH4wfH4xKSopKiQvaTtcbnZhciBSRUxBVElWRV9KU09OX1BPSU5URVIgPSAvXig/OjB8WzEtOV1bMC05XSopKD86I3woPzpcXC8oPzpbXn4vXXx+MHx+MSkqKSopJC87XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmb3JtYXRzO1xuXG5mdW5jdGlvbiBmb3JtYXRzKG1vZGUpIHtcbiAgbW9kZSA9IG1vZGUgPT0gJ2Z1bGwnID8gJ2Z1bGwnIDogJ2Zhc3QnO1xuICByZXR1cm4gdXRpbC5jb3B5KGZvcm1hdHNbbW9kZV0pO1xufVxuXG5cbmZvcm1hdHMuZmFzdCA9IHtcbiAgLy8gZGF0ZTogaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzMzOSNzZWN0aW9uLTUuNlxuICBkYXRlOiAvXlxcZFxcZFxcZFxcZC1bMC0xXVxcZC1bMC0zXVxcZCQvLFxuICAvLyBkYXRlLXRpbWU6IGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzMzMzkjc2VjdGlvbi01LjZcbiAgdGltZTogL14oPzpbMC0yXVxcZDpbMC01XVxcZDpbMC01XVxcZHwyMzo1OTo2MCkoPzpcXC5cXGQrKT8oPzp6fFsrLV1cXGRcXGQoPzo6P1xcZFxcZCk/KT8kL2ksXG4gICdkYXRlLXRpbWUnOiAvXlxcZFxcZFxcZFxcZC1bMC0xXVxcZC1bMC0zXVxcZFt0XFxzXSg/OlswLTJdXFxkOlswLTVdXFxkOlswLTVdXFxkfDIzOjU5OjYwKSg/OlxcLlxcZCspPyg/Onp8WystXVxcZFxcZCg/Ojo/XFxkXFxkKT8pJC9pLFxuICAvLyB1cmk6IGh0dHBzOi8vZ2l0aHViLmNvbS9tYWZpbnRvc2gvaXMtbXktanNvbi12YWxpZC9ibG9iL21hc3Rlci9mb3JtYXRzLmpzXG4gIHVyaTogL14oPzpbYS16XVthLXowLTkrXFwtLl0qOikoPzpcXC8/XFwvKT9bXlxcc10qJC9pLFxuICAndXJpLXJlZmVyZW5jZSc6IC9eKD86KD86W2Etel1bYS16MC05K1xcLS5dKjopP1xcLz9cXC8pPyg/OlteXFxcXFxccyNdW15cXHMjXSopPyg/OiNbXlxcXFxcXHNdKik/JC9pLFxuICAndXJpLXRlbXBsYXRlJzogVVJJVEVNUExBVEUsXG4gIHVybDogVVJMLFxuICAvLyBlbWFpbCAoc291cmNlcyBmcm9tIGpzZW4gdmFsaWRhdG9yKTpcbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8yMDEzMjMvdXNpbmctYS1yZWd1bGFyLWV4cHJlc3Npb24tdG8tdmFsaWRhdGUtYW4tZW1haWwtYWRkcmVzcyNhbnN3ZXItODgyOTM2M1xuICAvLyBodHRwOi8vd3d3LnczLm9yZy9UUi9odG1sNS9mb3Jtcy5odG1sI3ZhbGlkLWUtbWFpbC1hZGRyZXNzIChzZWFyY2ggZm9yICd3aWxsZnVsIHZpb2xhdGlvbicpXG4gIGVtYWlsOiAvXlthLXowLTkuISMkJSYnKisvPT9eX2B7fH1+LV0rQFthLXowLTldKD86W2EtejAtOS1dezAsNjF9W2EtejAtOV0pPyg/OlxcLlthLXowLTldKD86W2EtejAtOS1dezAsNjF9W2EtejAtOV0pPykqJC9pLFxuICBob3N0bmFtZTogSE9TVE5BTUUsXG4gIC8vIG9wdGltaXplZCBodHRwczovL3d3dy5zYWZhcmlib29rc29ubGluZS5jb20vbGlicmFyeS92aWV3L3JlZ3VsYXItZXhwcmVzc2lvbnMtY29va2Jvb2svOTc4MDU5NjgwMjgzNy9jaDA3czE2Lmh0bWxcbiAgaXB2NDogL14oPzooPzoyNVswLTVdfDJbMC00XVxcZHxbMDFdP1xcZFxcZD8pXFwuKXszfSg/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPykkLyxcbiAgLy8gb3B0aW1pemVkIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTM0OTcvcmVndWxhci1leHByZXNzaW9uLXRoYXQtbWF0Y2hlcy12YWxpZC1pcHY2LWFkZHJlc3Nlc1xuICBpcHY2OiAvXlxccyooPzooPzooPzpbMC05YS1mXXsxLDR9Oil7N30oPzpbMC05YS1mXXsxLDR9fDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7Nn0oPzo6WzAtOWEtZl17MSw0fXwoPzooPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoPzpcXC4oPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezV9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsMn0pfDooPzooPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoPzpcXC4oPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezR9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsM30pfCg/Oig/OjpbMC05YS1mXXsxLDR9KT86KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7M30oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw0fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsMn06KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7Mn0oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw1fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsM306KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7MX0oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw2fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsNH06KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzo6KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsN30pfCg/Oig/OjpbMC05YS1mXXsxLDR9KXswLDV9Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSkpKD86JS4rKT9cXHMqJC9pLFxuICByZWdleDogcmVnZXgsXG4gIC8vIHV1aWQ6IGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzQxMjJcbiAgdXVpZDogVVVJRCxcbiAgLy8gSlNPTi1wb2ludGVyOiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMVxuICAvLyB1cmkgZnJhZ21lbnQ6IGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzOTg2I2FwcGVuZGl4LUFcbiAgJ2pzb24tcG9pbnRlcic6IEpTT05fUE9JTlRFUixcbiAgJ2pzb24tcG9pbnRlci11cmktZnJhZ21lbnQnOiBKU09OX1BPSU5URVJfVVJJX0ZSQUdNRU5ULFxuICAvLyByZWxhdGl2ZSBKU09OLXBvaW50ZXI6IGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL2RyYWZ0LWx1ZmYtcmVsYXRpdmUtanNvbi1wb2ludGVyLTAwXG4gICdyZWxhdGl2ZS1qc29uLXBvaW50ZXInOiBSRUxBVElWRV9KU09OX1BPSU5URVJcbn07XG5cblxuZm9ybWF0cy5mdWxsID0ge1xuICBkYXRlOiBkYXRlLFxuICB0aW1lOiB0aW1lLFxuICAnZGF0ZS10aW1lJzogZGF0ZV90aW1lLFxuICB1cmk6IHVyaSxcbiAgJ3VyaS1yZWZlcmVuY2UnOiBVUklSRUYsXG4gICd1cmktdGVtcGxhdGUnOiBVUklURU1QTEFURSxcbiAgdXJsOiBVUkwsXG4gIGVtYWlsOiAvXlthLXowLTkhIyQlJicqKy89P15fYHt8fX4tXSsoPzpcXC5bYS16MC05ISMkJSYnKisvPT9eX2B7fH1+LV0rKSpAKD86W2EtejAtOV0oPzpbYS16MC05LV0qW2EtejAtOV0pP1xcLikrW2EtejAtOV0oPzpbYS16MC05LV0qW2EtejAtOV0pPyQvaSxcbiAgaG9zdG5hbWU6IEhPU1ROQU1FLFxuICBpcHY0OiAvXig/Oig/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPylcXC4pezN9KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KSQvLFxuICBpcHY2OiAvXlxccyooPzooPzooPzpbMC05YS1mXXsxLDR9Oil7N30oPzpbMC05YS1mXXsxLDR9fDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7Nn0oPzo6WzAtOWEtZl17MSw0fXwoPzooPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoPzpcXC4oPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezV9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsMn0pfDooPzooPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoPzpcXC4oPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezR9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsM30pfCg/Oig/OjpbMC05YS1mXXsxLDR9KT86KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7M30oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw0fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsMn06KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7Mn0oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw1fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsM306KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7MX0oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw2fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsNH06KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzo6KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsN30pfCg/Oig/OjpbMC05YS1mXXsxLDR9KXswLDV9Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSkpKD86JS4rKT9cXHMqJC9pLFxuICByZWdleDogcmVnZXgsXG4gIHV1aWQ6IFVVSUQsXG4gICdqc29uLXBvaW50ZXInOiBKU09OX1BPSU5URVIsXG4gICdqc29uLXBvaW50ZXItdXJpLWZyYWdtZW50JzogSlNPTl9QT0lOVEVSX1VSSV9GUkFHTUVOVCxcbiAgJ3JlbGF0aXZlLWpzb24tcG9pbnRlcic6IFJFTEFUSVZFX0pTT05fUE9JTlRFUlxufTtcblxuXG5mdW5jdGlvbiBpc0xlYXBZZWFyKHllYXIpIHtcbiAgLy8gaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzMzMzkjYXBwZW5kaXgtQ1xuICByZXR1cm4geWVhciAlIDQgPT09IDAgJiYgKHllYXIgJSAxMDAgIT09IDAgfHwgeWVhciAlIDQwMCA9PT0gMCk7XG59XG5cblxuZnVuY3Rpb24gZGF0ZShzdHIpIHtcbiAgLy8gZnVsbC1kYXRlIGZyb20gaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzMzOSNzZWN0aW9uLTUuNlxuICB2YXIgbWF0Y2hlcyA9IHN0ci5tYXRjaChEQVRFKTtcbiAgaWYgKCFtYXRjaGVzKSByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIHllYXIgPSArbWF0Y2hlc1sxXTtcbiAgdmFyIG1vbnRoID0gK21hdGNoZXNbMl07XG4gIHZhciBkYXkgPSArbWF0Y2hlc1szXTtcblxuICByZXR1cm4gbW9udGggPj0gMSAmJiBtb250aCA8PSAxMiAmJiBkYXkgPj0gMSAmJlxuICAgICAgICAgIGRheSA8PSAobW9udGggPT0gMiAmJiBpc0xlYXBZZWFyKHllYXIpID8gMjkgOiBEQVlTW21vbnRoXSk7XG59XG5cblxuZnVuY3Rpb24gdGltZShzdHIsIGZ1bGwpIHtcbiAgdmFyIG1hdGNoZXMgPSBzdHIubWF0Y2goVElNRSk7XG4gIGlmICghbWF0Y2hlcykgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBob3VyID0gbWF0Y2hlc1sxXTtcbiAgdmFyIG1pbnV0ZSA9IG1hdGNoZXNbMl07XG4gIHZhciBzZWNvbmQgPSBtYXRjaGVzWzNdO1xuICB2YXIgdGltZVpvbmUgPSBtYXRjaGVzWzVdO1xuICByZXR1cm4gKChob3VyIDw9IDIzICYmIG1pbnV0ZSA8PSA1OSAmJiBzZWNvbmQgPD0gNTkpIHx8XG4gICAgICAgICAgKGhvdXIgPT0gMjMgJiYgbWludXRlID09IDU5ICYmIHNlY29uZCA9PSA2MCkpICYmXG4gICAgICAgICAoIWZ1bGwgfHwgdGltZVpvbmUpO1xufVxuXG5cbnZhciBEQVRFX1RJTUVfU0VQQVJBVE9SID0gL3R8XFxzL2k7XG5mdW5jdGlvbiBkYXRlX3RpbWUoc3RyKSB7XG4gIC8vIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzMzMzkjc2VjdGlvbi01LjZcbiAgdmFyIGRhdGVUaW1lID0gc3RyLnNwbGl0KERBVEVfVElNRV9TRVBBUkFUT1IpO1xuICByZXR1cm4gZGF0ZVRpbWUubGVuZ3RoID09IDIgJiYgZGF0ZShkYXRlVGltZVswXSkgJiYgdGltZShkYXRlVGltZVsxXSwgdHJ1ZSk7XG59XG5cblxudmFyIE5PVF9VUklfRlJBR01FTlQgPSAvXFwvfDovO1xuZnVuY3Rpb24gdXJpKHN0cikge1xuICAvLyBodHRwOi8vam1yd2FyZS5jb20vYXJ0aWNsZXMvMjAwOS91cmlfcmVnZXhwL1VSSV9yZWdleC5odG1sICsgb3B0aW9uYWwgcHJvdG9jb2wgKyByZXF1aXJlZCBcIi5cIlxuICByZXR1cm4gTk9UX1VSSV9GUkFHTUVOVC50ZXN0KHN0cikgJiYgVVJJLnRlc3Qoc3RyKTtcbn1cblxuXG52YXIgWl9BTkNIT1IgPSAvW15cXFxcXVxcXFxaLztcbmZ1bmN0aW9uIHJlZ2V4KHN0cikge1xuICBpZiAoWl9BTkNIT1IudGVzdChzdHIpKSByZXR1cm4gZmFsc2U7XG4gIHRyeSB7XG4gICAgbmV3IFJlZ0V4cChzdHIpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoKGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL2Zvcm1hdHMuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVzb2x2ZSA9IHJlcXVpcmUoJy4vcmVzb2x2ZScpXG4gICwgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpXG4gICwgZXJyb3JDbGFzc2VzID0gcmVxdWlyZSgnLi9lcnJvcl9jbGFzc2VzJylcbiAgLCBzdGFibGVTdHJpbmdpZnkgPSByZXF1aXJlKCdmYXN0LWpzb24tc3RhYmxlLXN0cmluZ2lmeScpO1xuXG52YXIgdmFsaWRhdGVHZW5lcmF0b3IgPSByZXF1aXJlKCcuLi9kb3Rqcy92YWxpZGF0ZScpO1xuXG4vKipcbiAqIEZ1bmN0aW9ucyBiZWxvdyBhcmUgdXNlZCBpbnNpZGUgY29tcGlsZWQgdmFsaWRhdGlvbnMgZnVuY3Rpb25cbiAqL1xuXG52YXIgdWNzMmxlbmd0aCA9IHV0aWwudWNzMmxlbmd0aDtcbnZhciBlcXVhbCA9IHJlcXVpcmUoJ2Zhc3QtZGVlcC1lcXVhbCcpO1xuXG4vLyB0aGlzIGVycm9yIGlzIHRocm93biBieSBhc3luYyBzY2hlbWFzIHRvIHJldHVybiB2YWxpZGF0aW9uIGVycm9ycyB2aWEgZXhjZXB0aW9uXG52YXIgVmFsaWRhdGlvbkVycm9yID0gZXJyb3JDbGFzc2VzLlZhbGlkYXRpb247XG5cbm1vZHVsZS5leHBvcnRzID0gY29tcGlsZTtcblxuXG4vKipcbiAqIENvbXBpbGVzIHNjaGVtYSB0byB2YWxpZGF0aW9uIGZ1bmN0aW9uXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtICB7T2JqZWN0fSBzY2hlbWEgc2NoZW1hIG9iamVjdFxuICogQHBhcmFtICB7T2JqZWN0fSByb290IG9iamVjdCB3aXRoIGluZm9ybWF0aW9uIGFib3V0IHRoZSByb290IHNjaGVtYSBmb3IgdGhpcyBzY2hlbWFcbiAqIEBwYXJhbSAge09iamVjdH0gbG9jYWxSZWZzIHRoZSBoYXNoIG9mIGxvY2FsIHJlZmVyZW5jZXMgaW5zaWRlIHRoZSBzY2hlbWEgKGNyZWF0ZWQgYnkgcmVzb2x2ZS5pZCksIHVzZWQgZm9yIGlubGluZSByZXNvbHV0aW9uXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGJhc2VJZCBiYXNlIElEIGZvciBJRHMgaW4gdGhlIHNjaGVtYVxuICogQHJldHVybiB7RnVuY3Rpb259IHZhbGlkYXRpb24gZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gY29tcGlsZShzY2hlbWEsIHJvb3QsIGxvY2FsUmVmcywgYmFzZUlkKSB7XG4gIC8qIGpzaGludCB2YWxpZHRoaXM6IHRydWUsIGV2aWw6IHRydWUgKi9cbiAgLyogZXNsaW50IG5vLXNoYWRvdzogMCAqL1xuICB2YXIgc2VsZiA9IHRoaXNcbiAgICAsIG9wdHMgPSB0aGlzLl9vcHRzXG4gICAgLCByZWZWYWwgPSBbIHVuZGVmaW5lZCBdXG4gICAgLCByZWZzID0ge31cbiAgICAsIHBhdHRlcm5zID0gW11cbiAgICAsIHBhdHRlcm5zSGFzaCA9IHt9XG4gICAgLCBkZWZhdWx0cyA9IFtdXG4gICAgLCBkZWZhdWx0c0hhc2ggPSB7fVxuICAgICwgY3VzdG9tUnVsZXMgPSBbXTtcblxuICByb290ID0gcm9vdCB8fCB7IHNjaGVtYTogc2NoZW1hLCByZWZWYWw6IHJlZlZhbCwgcmVmczogcmVmcyB9O1xuXG4gIHZhciBjID0gY2hlY2tDb21waWxpbmcuY2FsbCh0aGlzLCBzY2hlbWEsIHJvb3QsIGJhc2VJZCk7XG4gIHZhciBjb21waWxhdGlvbiA9IHRoaXMuX2NvbXBpbGF0aW9uc1tjLmluZGV4XTtcbiAgaWYgKGMuY29tcGlsaW5nKSByZXR1cm4gKGNvbXBpbGF0aW9uLmNhbGxWYWxpZGF0ZSA9IGNhbGxWYWxpZGF0ZSk7XG5cbiAgdmFyIGZvcm1hdHMgPSB0aGlzLl9mb3JtYXRzO1xuICB2YXIgUlVMRVMgPSB0aGlzLlJVTEVTO1xuXG4gIHRyeSB7XG4gICAgdmFyIHYgPSBsb2NhbENvbXBpbGUoc2NoZW1hLCByb290LCBsb2NhbFJlZnMsIGJhc2VJZCk7XG4gICAgY29tcGlsYXRpb24udmFsaWRhdGUgPSB2O1xuICAgIHZhciBjdiA9IGNvbXBpbGF0aW9uLmNhbGxWYWxpZGF0ZTtcbiAgICBpZiAoY3YpIHtcbiAgICAgIGN2LnNjaGVtYSA9IHYuc2NoZW1hO1xuICAgICAgY3YuZXJyb3JzID0gbnVsbDtcbiAgICAgIGN2LnJlZnMgPSB2LnJlZnM7XG4gICAgICBjdi5yZWZWYWwgPSB2LnJlZlZhbDtcbiAgICAgIGN2LnJvb3QgPSB2LnJvb3Q7XG4gICAgICBjdi4kYXN5bmMgPSB2LiRhc3luYztcbiAgICAgIGlmIChvcHRzLnNvdXJjZUNvZGUpIGN2LnNvdXJjZSA9IHYuc291cmNlO1xuICAgIH1cbiAgICByZXR1cm4gdjtcbiAgfSBmaW5hbGx5IHtcbiAgICBlbmRDb21waWxpbmcuY2FsbCh0aGlzLCBzY2hlbWEsIHJvb3QsIGJhc2VJZCk7XG4gIH1cblxuICAvKiBAdGhpcyAgIHsqfSAtIGN1c3RvbSBjb250ZXh0LCBzZWUgcGFzc0NvbnRleHQgb3B0aW9uICovXG4gIGZ1bmN0aW9uIGNhbGxWYWxpZGF0ZSgpIHtcbiAgICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIHZhbGlkYXRlID0gY29tcGlsYXRpb24udmFsaWRhdGU7XG4gICAgdmFyIHJlc3VsdCA9IHZhbGlkYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgY2FsbFZhbGlkYXRlLmVycm9ycyA9IHZhbGlkYXRlLmVycm9ycztcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gbG9jYWxDb21waWxlKF9zY2hlbWEsIF9yb290LCBsb2NhbFJlZnMsIGJhc2VJZCkge1xuICAgIHZhciBpc1Jvb3QgPSAhX3Jvb3QgfHwgKF9yb290ICYmIF9yb290LnNjaGVtYSA9PSBfc2NoZW1hKTtcbiAgICBpZiAoX3Jvb3Quc2NoZW1hICE9IHJvb3Quc2NoZW1hKVxuICAgICAgcmV0dXJuIGNvbXBpbGUuY2FsbChzZWxmLCBfc2NoZW1hLCBfcm9vdCwgbG9jYWxSZWZzLCBiYXNlSWQpO1xuXG4gICAgdmFyICRhc3luYyA9IF9zY2hlbWEuJGFzeW5jID09PSB0cnVlO1xuXG4gICAgdmFyIHNvdXJjZUNvZGUgPSB2YWxpZGF0ZUdlbmVyYXRvcih7XG4gICAgICBpc1RvcDogdHJ1ZSxcbiAgICAgIHNjaGVtYTogX3NjaGVtYSxcbiAgICAgIGlzUm9vdDogaXNSb290LFxuICAgICAgYmFzZUlkOiBiYXNlSWQsXG4gICAgICByb290OiBfcm9vdCxcbiAgICAgIHNjaGVtYVBhdGg6ICcnLFxuICAgICAgZXJyU2NoZW1hUGF0aDogJyMnLFxuICAgICAgZXJyb3JQYXRoOiAnXCJcIicsXG4gICAgICBNaXNzaW5nUmVmRXJyb3I6IGVycm9yQ2xhc3Nlcy5NaXNzaW5nUmVmLFxuICAgICAgUlVMRVM6IFJVTEVTLFxuICAgICAgdmFsaWRhdGU6IHZhbGlkYXRlR2VuZXJhdG9yLFxuICAgICAgdXRpbDogdXRpbCxcbiAgICAgIHJlc29sdmU6IHJlc29sdmUsXG4gICAgICByZXNvbHZlUmVmOiByZXNvbHZlUmVmLFxuICAgICAgdXNlUGF0dGVybjogdXNlUGF0dGVybixcbiAgICAgIHVzZURlZmF1bHQ6IHVzZURlZmF1bHQsXG4gICAgICB1c2VDdXN0b21SdWxlOiB1c2VDdXN0b21SdWxlLFxuICAgICAgb3B0czogb3B0cyxcbiAgICAgIGZvcm1hdHM6IGZvcm1hdHMsXG4gICAgICBsb2dnZXI6IHNlbGYubG9nZ2VyLFxuICAgICAgc2VsZjogc2VsZlxuICAgIH0pO1xuXG4gICAgc291cmNlQ29kZSA9IHZhcnMocmVmVmFsLCByZWZWYWxDb2RlKSArIHZhcnMocGF0dGVybnMsIHBhdHRlcm5Db2RlKVxuICAgICAgICAgICAgICAgICAgICsgdmFycyhkZWZhdWx0cywgZGVmYXVsdENvZGUpICsgdmFycyhjdXN0b21SdWxlcywgY3VzdG9tUnVsZUNvZGUpXG4gICAgICAgICAgICAgICAgICAgKyBzb3VyY2VDb2RlO1xuXG4gICAgaWYgKG9wdHMucHJvY2Vzc0NvZGUpIHNvdXJjZUNvZGUgPSBvcHRzLnByb2Nlc3NDb2RlKHNvdXJjZUNvZGUsIF9zY2hlbWEpO1xuICAgIC8vIGNvbnNvbGUubG9nKCdcXG5cXG5cXG4gKioqIFxcbicsIEpTT04uc3RyaW5naWZ5KHNvdXJjZUNvZGUpKTtcbiAgICB2YXIgdmFsaWRhdGU7XG4gICAgdHJ5IHtcbiAgICAgIHZhciBtYWtlVmFsaWRhdGUgPSBuZXcgRnVuY3Rpb24oXG4gICAgICAgICdzZWxmJyxcbiAgICAgICAgJ1JVTEVTJyxcbiAgICAgICAgJ2Zvcm1hdHMnLFxuICAgICAgICAncm9vdCcsXG4gICAgICAgICdyZWZWYWwnLFxuICAgICAgICAnZGVmYXVsdHMnLFxuICAgICAgICAnY3VzdG9tUnVsZXMnLFxuICAgICAgICAnZXF1YWwnLFxuICAgICAgICAndWNzMmxlbmd0aCcsXG4gICAgICAgICdWYWxpZGF0aW9uRXJyb3InLFxuICAgICAgICBzb3VyY2VDb2RlXG4gICAgICApO1xuXG4gICAgICB2YWxpZGF0ZSA9IG1ha2VWYWxpZGF0ZShcbiAgICAgICAgc2VsZixcbiAgICAgICAgUlVMRVMsXG4gICAgICAgIGZvcm1hdHMsXG4gICAgICAgIHJvb3QsXG4gICAgICAgIHJlZlZhbCxcbiAgICAgICAgZGVmYXVsdHMsXG4gICAgICAgIGN1c3RvbVJ1bGVzLFxuICAgICAgICBlcXVhbCxcbiAgICAgICAgdWNzMmxlbmd0aCxcbiAgICAgICAgVmFsaWRhdGlvbkVycm9yXG4gICAgICApO1xuXG4gICAgICByZWZWYWxbMF0gPSB2YWxpZGF0ZTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHNlbGYubG9nZ2VyLmVycm9yKCdFcnJvciBjb21waWxpbmcgc2NoZW1hLCBmdW5jdGlvbiBjb2RlOicsIHNvdXJjZUNvZGUpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICB2YWxpZGF0ZS5zY2hlbWEgPSBfc2NoZW1hO1xuICAgIHZhbGlkYXRlLmVycm9ycyA9IG51bGw7XG4gICAgdmFsaWRhdGUucmVmcyA9IHJlZnM7XG4gICAgdmFsaWRhdGUucmVmVmFsID0gcmVmVmFsO1xuICAgIHZhbGlkYXRlLnJvb3QgPSBpc1Jvb3QgPyB2YWxpZGF0ZSA6IF9yb290O1xuICAgIGlmICgkYXN5bmMpIHZhbGlkYXRlLiRhc3luYyA9IHRydWU7XG4gICAgaWYgKG9wdHMuc291cmNlQ29kZSA9PT0gdHJ1ZSkge1xuICAgICAgdmFsaWRhdGUuc291cmNlID0ge1xuICAgICAgICBjb2RlOiBzb3VyY2VDb2RlLFxuICAgICAgICBwYXR0ZXJuczogcGF0dGVybnMsXG4gICAgICAgIGRlZmF1bHRzOiBkZWZhdWx0c1xuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsaWRhdGU7XG4gIH1cblxuICBmdW5jdGlvbiByZXNvbHZlUmVmKGJhc2VJZCwgcmVmLCBpc1Jvb3QpIHtcbiAgICByZWYgPSByZXNvbHZlLnVybChiYXNlSWQsIHJlZik7XG4gICAgdmFyIHJlZkluZGV4ID0gcmVmc1tyZWZdO1xuICAgIHZhciBfcmVmVmFsLCByZWZDb2RlO1xuICAgIGlmIChyZWZJbmRleCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBfcmVmVmFsID0gcmVmVmFsW3JlZkluZGV4XTtcbiAgICAgIHJlZkNvZGUgPSAncmVmVmFsWycgKyByZWZJbmRleCArICddJztcbiAgICAgIHJldHVybiByZXNvbHZlZFJlZihfcmVmVmFsLCByZWZDb2RlKTtcbiAgICB9XG4gICAgaWYgKCFpc1Jvb3QgJiYgcm9vdC5yZWZzKSB7XG4gICAgICB2YXIgcm9vdFJlZklkID0gcm9vdC5yZWZzW3JlZl07XG4gICAgICBpZiAocm9vdFJlZklkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgX3JlZlZhbCA9IHJvb3QucmVmVmFsW3Jvb3RSZWZJZF07XG4gICAgICAgIHJlZkNvZGUgPSBhZGRMb2NhbFJlZihyZWYsIF9yZWZWYWwpO1xuICAgICAgICByZXR1cm4gcmVzb2x2ZWRSZWYoX3JlZlZhbCwgcmVmQ29kZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVmQ29kZSA9IGFkZExvY2FsUmVmKHJlZik7XG4gICAgdmFyIHYgPSByZXNvbHZlLmNhbGwoc2VsZiwgbG9jYWxDb21waWxlLCByb290LCByZWYpO1xuICAgIGlmICh2ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhciBsb2NhbFNjaGVtYSA9IGxvY2FsUmVmcyAmJiBsb2NhbFJlZnNbcmVmXTtcbiAgICAgIGlmIChsb2NhbFNjaGVtYSkge1xuICAgICAgICB2ID0gcmVzb2x2ZS5pbmxpbmVSZWYobG9jYWxTY2hlbWEsIG9wdHMuaW5saW5lUmVmcylcbiAgICAgICAgICAgID8gbG9jYWxTY2hlbWFcbiAgICAgICAgICAgIDogY29tcGlsZS5jYWxsKHNlbGYsIGxvY2FsU2NoZW1hLCByb290LCBsb2NhbFJlZnMsIGJhc2VJZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVtb3ZlTG9jYWxSZWYocmVmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVwbGFjZUxvY2FsUmVmKHJlZiwgdik7XG4gICAgICByZXR1cm4gcmVzb2x2ZWRSZWYodiwgcmVmQ29kZSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYWRkTG9jYWxSZWYocmVmLCB2KSB7XG4gICAgdmFyIHJlZklkID0gcmVmVmFsLmxlbmd0aDtcbiAgICByZWZWYWxbcmVmSWRdID0gdjtcbiAgICByZWZzW3JlZl0gPSByZWZJZDtcbiAgICByZXR1cm4gJ3JlZlZhbCcgKyByZWZJZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZUxvY2FsUmVmKHJlZikge1xuICAgIGRlbGV0ZSByZWZzW3JlZl07XG4gIH1cblxuICBmdW5jdGlvbiByZXBsYWNlTG9jYWxSZWYocmVmLCB2KSB7XG4gICAgdmFyIHJlZklkID0gcmVmc1tyZWZdO1xuICAgIHJlZlZhbFtyZWZJZF0gPSB2O1xuICB9XG5cbiAgZnVuY3Rpb24gcmVzb2x2ZWRSZWYocmVmVmFsLCBjb2RlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiByZWZWYWwgPT0gJ29iamVjdCcgfHwgdHlwZW9mIHJlZlZhbCA9PSAnYm9vbGVhbidcbiAgICAgICAgICAgID8geyBjb2RlOiBjb2RlLCBzY2hlbWE6IHJlZlZhbCwgaW5saW5lOiB0cnVlIH1cbiAgICAgICAgICAgIDogeyBjb2RlOiBjb2RlLCAkYXN5bmM6IHJlZlZhbCAmJiAhIXJlZlZhbC4kYXN5bmMgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVzZVBhdHRlcm4ocmVnZXhTdHIpIHtcbiAgICB2YXIgaW5kZXggPSBwYXR0ZXJuc0hhc2hbcmVnZXhTdHJdO1xuICAgIGlmIChpbmRleCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBpbmRleCA9IHBhdHRlcm5zSGFzaFtyZWdleFN0cl0gPSBwYXR0ZXJucy5sZW5ndGg7XG4gICAgICBwYXR0ZXJuc1tpbmRleF0gPSByZWdleFN0cjtcbiAgICB9XG4gICAgcmV0dXJuICdwYXR0ZXJuJyArIGluZGV4O1xuICB9XG5cbiAgZnVuY3Rpb24gdXNlRGVmYXVsdCh2YWx1ZSkge1xuICAgIHN3aXRjaCAodHlwZW9mIHZhbHVlKSB7XG4gICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgIHJldHVybiAnJyArIHZhbHVlO1xuICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgcmV0dXJuIHV0aWwudG9RdW90ZWRTdHJpbmcodmFsdWUpO1xuICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgaWYgKHZhbHVlID09PSBudWxsKSByZXR1cm4gJ251bGwnO1xuICAgICAgICB2YXIgdmFsdWVTdHIgPSBzdGFibGVTdHJpbmdpZnkodmFsdWUpO1xuICAgICAgICB2YXIgaW5kZXggPSBkZWZhdWx0c0hhc2hbdmFsdWVTdHJdO1xuICAgICAgICBpZiAoaW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGluZGV4ID0gZGVmYXVsdHNIYXNoW3ZhbHVlU3RyXSA9IGRlZmF1bHRzLmxlbmd0aDtcbiAgICAgICAgICBkZWZhdWx0c1tpbmRleF0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ2RlZmF1bHQnICsgaW5kZXg7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdXNlQ3VzdG9tUnVsZShydWxlLCBzY2hlbWEsIHBhcmVudFNjaGVtYSwgaXQpIHtcbiAgICBpZiAoc2VsZi5fb3B0cy52YWxpZGF0ZVNjaGVtYSAhPT0gZmFsc2UpIHtcbiAgICAgIHZhciBkZXBzID0gcnVsZS5kZWZpbml0aW9uLmRlcGVuZGVuY2llcztcbiAgICAgIGlmIChkZXBzICYmICFkZXBzLmV2ZXJ5KGZ1bmN0aW9uKGtleXdvcmQpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJlbnRTY2hlbWEsIGtleXdvcmQpO1xuICAgICAgfSkpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcigncGFyZW50IHNjaGVtYSBtdXN0IGhhdmUgYWxsIHJlcXVpcmVkIGtleXdvcmRzOiAnICsgZGVwcy5qb2luKCcsJykpO1xuXG4gICAgICB2YXIgdmFsaWRhdGVTY2hlbWEgPSBydWxlLmRlZmluaXRpb24udmFsaWRhdGVTY2hlbWE7XG4gICAgICBpZiAodmFsaWRhdGVTY2hlbWEpIHtcbiAgICAgICAgdmFyIHZhbGlkID0gdmFsaWRhdGVTY2hlbWEoc2NoZW1hKTtcbiAgICAgICAgaWYgKCF2YWxpZCkge1xuICAgICAgICAgIHZhciBtZXNzYWdlID0gJ2tleXdvcmQgc2NoZW1hIGlzIGludmFsaWQ6ICcgKyBzZWxmLmVycm9yc1RleHQodmFsaWRhdGVTY2hlbWEuZXJyb3JzKTtcbiAgICAgICAgICBpZiAoc2VsZi5fb3B0cy52YWxpZGF0ZVNjaGVtYSA9PSAnbG9nJykgc2VsZi5sb2dnZXIuZXJyb3IobWVzc2FnZSk7XG4gICAgICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgY29tcGlsZSA9IHJ1bGUuZGVmaW5pdGlvbi5jb21waWxlXG4gICAgICAsIGlubGluZSA9IHJ1bGUuZGVmaW5pdGlvbi5pbmxpbmVcbiAgICAgICwgbWFjcm8gPSBydWxlLmRlZmluaXRpb24ubWFjcm87XG5cbiAgICB2YXIgdmFsaWRhdGU7XG4gICAgaWYgKGNvbXBpbGUpIHtcbiAgICAgIHZhbGlkYXRlID0gY29tcGlsZS5jYWxsKHNlbGYsIHNjaGVtYSwgcGFyZW50U2NoZW1hLCBpdCk7XG4gICAgfSBlbHNlIGlmIChtYWNybykge1xuICAgICAgdmFsaWRhdGUgPSBtYWNyby5jYWxsKHNlbGYsIHNjaGVtYSwgcGFyZW50U2NoZW1hLCBpdCk7XG4gICAgICBpZiAob3B0cy52YWxpZGF0ZVNjaGVtYSAhPT0gZmFsc2UpIHNlbGYudmFsaWRhdGVTY2hlbWEodmFsaWRhdGUsIHRydWUpO1xuICAgIH0gZWxzZSBpZiAoaW5saW5lKSB7XG4gICAgICB2YWxpZGF0ZSA9IGlubGluZS5jYWxsKHNlbGYsIGl0LCBydWxlLmtleXdvcmQsIHNjaGVtYSwgcGFyZW50U2NoZW1hKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsaWRhdGUgPSBydWxlLmRlZmluaXRpb24udmFsaWRhdGU7XG4gICAgICBpZiAoIXZhbGlkYXRlKSByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHZhbGlkYXRlID09PSB1bmRlZmluZWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2N1c3RvbSBrZXl3b3JkIFwiJyArIHJ1bGUua2V5d29yZCArICdcImZhaWxlZCB0byBjb21waWxlJyk7XG5cbiAgICB2YXIgaW5kZXggPSBjdXN0b21SdWxlcy5sZW5ndGg7XG4gICAgY3VzdG9tUnVsZXNbaW5kZXhdID0gdmFsaWRhdGU7XG5cbiAgICByZXR1cm4ge1xuICAgICAgY29kZTogJ2N1c3RvbVJ1bGUnICsgaW5kZXgsXG4gICAgICB2YWxpZGF0ZTogdmFsaWRhdGVcbiAgICB9O1xuICB9XG59XG5cblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIHNjaGVtYSBpcyBjdXJyZW50bHkgY29tcGlsZWRcbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0gIHtPYmplY3R9IHNjaGVtYSBzY2hlbWEgdG8gY29tcGlsZVxuICogQHBhcmFtICB7T2JqZWN0fSByb290IHJvb3Qgb2JqZWN0XG4gKiBAcGFyYW0gIHtTdHJpbmd9IGJhc2VJZCBiYXNlIHNjaGVtYSBJRFxuICogQHJldHVybiB7T2JqZWN0fSBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIFwiaW5kZXhcIiAoY29tcGlsYXRpb24gaW5kZXgpIGFuZCBcImNvbXBpbGluZ1wiIChib29sZWFuKVxuICovXG5mdW5jdGlvbiBjaGVja0NvbXBpbGluZyhzY2hlbWEsIHJvb3QsIGJhc2VJZCkge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gIHZhciBpbmRleCA9IGNvbXBJbmRleC5jYWxsKHRoaXMsIHNjaGVtYSwgcm9vdCwgYmFzZUlkKTtcbiAgaWYgKGluZGV4ID49IDApIHJldHVybiB7IGluZGV4OiBpbmRleCwgY29tcGlsaW5nOiB0cnVlIH07XG4gIGluZGV4ID0gdGhpcy5fY29tcGlsYXRpb25zLmxlbmd0aDtcbiAgdGhpcy5fY29tcGlsYXRpb25zW2luZGV4XSA9IHtcbiAgICBzY2hlbWE6IHNjaGVtYSxcbiAgICByb290OiByb290LFxuICAgIGJhc2VJZDogYmFzZUlkXG4gIH07XG4gIHJldHVybiB7IGluZGV4OiBpbmRleCwgY29tcGlsaW5nOiBmYWxzZSB9O1xufVxuXG5cbi8qKlxuICogUmVtb3ZlcyB0aGUgc2NoZW1hIGZyb20gdGhlIGN1cnJlbnRseSBjb21waWxlZCBsaXN0XG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtICB7T2JqZWN0fSBzY2hlbWEgc2NoZW1hIHRvIGNvbXBpbGVcbiAqIEBwYXJhbSAge09iamVjdH0gcm9vdCByb290IG9iamVjdFxuICogQHBhcmFtICB7U3RyaW5nfSBiYXNlSWQgYmFzZSBzY2hlbWEgSURcbiAqL1xuZnVuY3Rpb24gZW5kQ29tcGlsaW5nKHNjaGVtYSwgcm9vdCwgYmFzZUlkKSB7XG4gIC8qIGpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgdmFyIGkgPSBjb21wSW5kZXguY2FsbCh0aGlzLCBzY2hlbWEsIHJvb3QsIGJhc2VJZCk7XG4gIGlmIChpID49IDApIHRoaXMuX2NvbXBpbGF0aW9ucy5zcGxpY2UoaSwgMSk7XG59XG5cblxuLyoqXG4gKiBJbmRleCBvZiBzY2hlbWEgY29tcGlsYXRpb24gaW4gdGhlIGN1cnJlbnRseSBjb21waWxlZCBsaXN0XG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtICB7T2JqZWN0fSBzY2hlbWEgc2NoZW1hIHRvIGNvbXBpbGVcbiAqIEBwYXJhbSAge09iamVjdH0gcm9vdCByb290IG9iamVjdFxuICogQHBhcmFtICB7U3RyaW5nfSBiYXNlSWQgYmFzZSBzY2hlbWEgSURcbiAqIEByZXR1cm4ge0ludGVnZXJ9IGNvbXBpbGF0aW9uIGluZGV4XG4gKi9cbmZ1bmN0aW9uIGNvbXBJbmRleChzY2hlbWEsIHJvb3QsIGJhc2VJZCkge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gIGZvciAodmFyIGk9MDsgaTx0aGlzLl9jb21waWxhdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYyA9IHRoaXMuX2NvbXBpbGF0aW9uc1tpXTtcbiAgICBpZiAoYy5zY2hlbWEgPT0gc2NoZW1hICYmIGMucm9vdCA9PSByb290ICYmIGMuYmFzZUlkID09IGJhc2VJZCkgcmV0dXJuIGk7XG4gIH1cbiAgcmV0dXJuIC0xO1xufVxuXG5cbmZ1bmN0aW9uIHBhdHRlcm5Db2RlKGksIHBhdHRlcm5zKSB7XG4gIHJldHVybiAndmFyIHBhdHRlcm4nICsgaSArICcgPSBuZXcgUmVnRXhwKCcgKyB1dGlsLnRvUXVvdGVkU3RyaW5nKHBhdHRlcm5zW2ldKSArICcpOyc7XG59XG5cblxuZnVuY3Rpb24gZGVmYXVsdENvZGUoaSkge1xuICByZXR1cm4gJ3ZhciBkZWZhdWx0JyArIGkgKyAnID0gZGVmYXVsdHNbJyArIGkgKyAnXTsnO1xufVxuXG5cbmZ1bmN0aW9uIHJlZlZhbENvZGUoaSwgcmVmVmFsKSB7XG4gIHJldHVybiByZWZWYWxbaV0gPT09IHVuZGVmaW5lZCA/ICcnIDogJ3ZhciByZWZWYWwnICsgaSArICcgPSByZWZWYWxbJyArIGkgKyAnXTsnO1xufVxuXG5cbmZ1bmN0aW9uIGN1c3RvbVJ1bGVDb2RlKGkpIHtcbiAgcmV0dXJuICd2YXIgY3VzdG9tUnVsZScgKyBpICsgJyA9IGN1c3RvbVJ1bGVzWycgKyBpICsgJ107Jztcbn1cblxuXG5mdW5jdGlvbiB2YXJzKGFyciwgc3RhdGVtZW50KSB7XG4gIGlmICghYXJyLmxlbmd0aCkgcmV0dXJuICcnO1xuICB2YXIgY29kZSA9ICcnO1xuICBmb3IgKHZhciBpPTA7IGk8YXJyLmxlbmd0aDsgaSsrKVxuICAgIGNvZGUgKz0gc3RhdGVtZW50KGksIGFycik7XG4gIHJldHVybiBjb2RlO1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvaW5kZXguanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVVJJID0gcmVxdWlyZSgndXJpLWpzJylcbiAgLCBlcXVhbCA9IHJlcXVpcmUoJ2Zhc3QtZGVlcC1lcXVhbCcpXG4gICwgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpXG4gICwgU2NoZW1hT2JqZWN0ID0gcmVxdWlyZSgnLi9zY2hlbWFfb2JqJylcbiAgLCB0cmF2ZXJzZSA9IHJlcXVpcmUoJ2pzb24tc2NoZW1hLXRyYXZlcnNlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVzb2x2ZTtcblxucmVzb2x2ZS5ub3JtYWxpemVJZCA9IG5vcm1hbGl6ZUlkO1xucmVzb2x2ZS5mdWxsUGF0aCA9IGdldEZ1bGxQYXRoO1xucmVzb2x2ZS51cmwgPSByZXNvbHZlVXJsO1xucmVzb2x2ZS5pZHMgPSByZXNvbHZlSWRzO1xucmVzb2x2ZS5pbmxpbmVSZWYgPSBpbmxpbmVSZWY7XG5yZXNvbHZlLnNjaGVtYSA9IHJlc29sdmVTY2hlbWE7XG5cbi8qKlxuICogW3Jlc29sdmUgYW5kIGNvbXBpbGUgdGhlIHJlZmVyZW5jZXMgKCRyZWYpXVxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjb21waWxlIHJlZmVyZW5jZSB0byBzY2hlbWEgY29tcGlsYXRpb24gZnVuY2l0b24gKGxvY2FsQ29tcGlsZSlcbiAqIEBwYXJhbSAge09iamVjdH0gcm9vdCBvYmplY3Qgd2l0aCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgcm9vdCBzY2hlbWEgZm9yIHRoZSBjdXJyZW50IHNjaGVtYVxuICogQHBhcmFtICB7U3RyaW5nfSByZWYgcmVmZXJlbmNlIHRvIHJlc29sdmVcbiAqIEByZXR1cm4ge09iamVjdHxGdW5jdGlvbn0gc2NoZW1hIG9iamVjdCAoaWYgdGhlIHNjaGVtYSBjYW4gYmUgaW5saW5lZCkgb3IgdmFsaWRhdGlvbiBmdW5jdGlvblxuICovXG5mdW5jdGlvbiByZXNvbHZlKGNvbXBpbGUsIHJvb3QsIHJlZikge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gIHZhciByZWZWYWwgPSB0aGlzLl9yZWZzW3JlZl07XG4gIGlmICh0eXBlb2YgcmVmVmFsID09ICdzdHJpbmcnKSB7XG4gICAgaWYgKHRoaXMuX3JlZnNbcmVmVmFsXSkgcmVmVmFsID0gdGhpcy5fcmVmc1tyZWZWYWxdO1xuICAgIGVsc2UgcmV0dXJuIHJlc29sdmUuY2FsbCh0aGlzLCBjb21waWxlLCByb290LCByZWZWYWwpO1xuICB9XG5cbiAgcmVmVmFsID0gcmVmVmFsIHx8IHRoaXMuX3NjaGVtYXNbcmVmXTtcbiAgaWYgKHJlZlZhbCBpbnN0YW5jZW9mIFNjaGVtYU9iamVjdCkge1xuICAgIHJldHVybiBpbmxpbmVSZWYocmVmVmFsLnNjaGVtYSwgdGhpcy5fb3B0cy5pbmxpbmVSZWZzKVxuICAgICAgICAgICAgPyByZWZWYWwuc2NoZW1hXG4gICAgICAgICAgICA6IHJlZlZhbC52YWxpZGF0ZSB8fCB0aGlzLl9jb21waWxlKHJlZlZhbCk7XG4gIH1cblxuICB2YXIgcmVzID0gcmVzb2x2ZVNjaGVtYS5jYWxsKHRoaXMsIHJvb3QsIHJlZik7XG4gIHZhciBzY2hlbWEsIHYsIGJhc2VJZDtcbiAgaWYgKHJlcykge1xuICAgIHNjaGVtYSA9IHJlcy5zY2hlbWE7XG4gICAgcm9vdCA9IHJlcy5yb290O1xuICAgIGJhc2VJZCA9IHJlcy5iYXNlSWQ7XG4gIH1cblxuICBpZiAoc2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hT2JqZWN0KSB7XG4gICAgdiA9IHNjaGVtYS52YWxpZGF0ZSB8fCBjb21waWxlLmNhbGwodGhpcywgc2NoZW1hLnNjaGVtYSwgcm9vdCwgdW5kZWZpbmVkLCBiYXNlSWQpO1xuICB9IGVsc2UgaWYgKHNjaGVtYSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdiA9IGlubGluZVJlZihzY2hlbWEsIHRoaXMuX29wdHMuaW5saW5lUmVmcylcbiAgICAgICAgPyBzY2hlbWFcbiAgICAgICAgOiBjb21waWxlLmNhbGwodGhpcywgc2NoZW1hLCByb290LCB1bmRlZmluZWQsIGJhc2VJZCk7XG4gIH1cblxuICByZXR1cm4gdjtcbn1cblxuXG4vKipcbiAqIFJlc29sdmUgc2NoZW1hLCBpdHMgcm9vdCBhbmQgYmFzZUlkXG4gKiBAdGhpcyBBanZcbiAqIEBwYXJhbSAge09iamVjdH0gcm9vdCByb290IG9iamVjdCB3aXRoIHByb3BlcnRpZXMgc2NoZW1hLCByZWZWYWwsIHJlZnNcbiAqIEBwYXJhbSAge1N0cmluZ30gcmVmICByZWZlcmVuY2UgdG8gcmVzb2x2ZVxuICogQHJldHVybiB7T2JqZWN0fSBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIHNjaGVtYSwgcm9vdCwgYmFzZUlkXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVTY2hlbWEocm9vdCwgcmVmKSB7XG4gIC8qIGpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgdmFyIHAgPSBVUkkucGFyc2UocmVmKVxuICAgICwgcmVmUGF0aCA9IF9nZXRGdWxsUGF0aChwKVxuICAgICwgYmFzZUlkID0gZ2V0RnVsbFBhdGgodGhpcy5fZ2V0SWQocm9vdC5zY2hlbWEpKTtcbiAgaWYgKE9iamVjdC5rZXlzKHJvb3Quc2NoZW1hKS5sZW5ndGggPT09IDAgfHwgcmVmUGF0aCAhPT0gYmFzZUlkKSB7XG4gICAgdmFyIGlkID0gbm9ybWFsaXplSWQocmVmUGF0aCk7XG4gICAgdmFyIHJlZlZhbCA9IHRoaXMuX3JlZnNbaWRdO1xuICAgIGlmICh0eXBlb2YgcmVmVmFsID09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gcmVzb2x2ZVJlY3Vyc2l2ZS5jYWxsKHRoaXMsIHJvb3QsIHJlZlZhbCwgcCk7XG4gICAgfSBlbHNlIGlmIChyZWZWYWwgaW5zdGFuY2VvZiBTY2hlbWFPYmplY3QpIHtcbiAgICAgIGlmICghcmVmVmFsLnZhbGlkYXRlKSB0aGlzLl9jb21waWxlKHJlZlZhbCk7XG4gICAgICByb290ID0gcmVmVmFsO1xuICAgIH0gZWxzZSB7XG4gICAgICByZWZWYWwgPSB0aGlzLl9zY2hlbWFzW2lkXTtcbiAgICAgIGlmIChyZWZWYWwgaW5zdGFuY2VvZiBTY2hlbWFPYmplY3QpIHtcbiAgICAgICAgaWYgKCFyZWZWYWwudmFsaWRhdGUpIHRoaXMuX2NvbXBpbGUocmVmVmFsKTtcbiAgICAgICAgaWYgKGlkID09IG5vcm1hbGl6ZUlkKHJlZikpXG4gICAgICAgICAgcmV0dXJuIHsgc2NoZW1hOiByZWZWYWwsIHJvb3Q6IHJvb3QsIGJhc2VJZDogYmFzZUlkIH07XG4gICAgICAgIHJvb3QgPSByZWZWYWw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghcm9vdC5zY2hlbWEpIHJldHVybjtcbiAgICBiYXNlSWQgPSBnZXRGdWxsUGF0aCh0aGlzLl9nZXRJZChyb290LnNjaGVtYSkpO1xuICB9XG4gIHJldHVybiBnZXRKc29uUG9pbnRlci5jYWxsKHRoaXMsIHAsIGJhc2VJZCwgcm9vdC5zY2hlbWEsIHJvb3QpO1xufVxuXG5cbi8qIEB0aGlzIEFqdiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVJlY3Vyc2l2ZShyb290LCByZWYsIHBhcnNlZFJlZikge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gIHZhciByZXMgPSByZXNvbHZlU2NoZW1hLmNhbGwodGhpcywgcm9vdCwgcmVmKTtcbiAgaWYgKHJlcykge1xuICAgIHZhciBzY2hlbWEgPSByZXMuc2NoZW1hO1xuICAgIHZhciBiYXNlSWQgPSByZXMuYmFzZUlkO1xuICAgIHJvb3QgPSByZXMucm9vdDtcbiAgICB2YXIgaWQgPSB0aGlzLl9nZXRJZChzY2hlbWEpO1xuICAgIGlmIChpZCkgYmFzZUlkID0gcmVzb2x2ZVVybChiYXNlSWQsIGlkKTtcbiAgICByZXR1cm4gZ2V0SnNvblBvaW50ZXIuY2FsbCh0aGlzLCBwYXJzZWRSZWYsIGJhc2VJZCwgc2NoZW1hLCByb290KTtcbiAgfVxufVxuXG5cbnZhciBQUkVWRU5UX1NDT1BFX0NIQU5HRSA9IHV0aWwudG9IYXNoKFsncHJvcGVydGllcycsICdwYXR0ZXJuUHJvcGVydGllcycsICdlbnVtJywgJ2RlcGVuZGVuY2llcycsICdkZWZpbml0aW9ucyddKTtcbi8qIEB0aGlzIEFqdiAqL1xuZnVuY3Rpb24gZ2V0SnNvblBvaW50ZXIocGFyc2VkUmVmLCBiYXNlSWQsIHNjaGVtYSwgcm9vdCkge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gIHBhcnNlZFJlZi5mcmFnbWVudCA9IHBhcnNlZFJlZi5mcmFnbWVudCB8fCAnJztcbiAgaWYgKHBhcnNlZFJlZi5mcmFnbWVudC5zbGljZSgwLDEpICE9ICcvJykgcmV0dXJuO1xuICB2YXIgcGFydHMgPSBwYXJzZWRSZWYuZnJhZ21lbnQuc3BsaXQoJy8nKTtcblxuICBmb3IgKHZhciBpID0gMTsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHBhcnQgPSBwYXJ0c1tpXTtcbiAgICBpZiAocGFydCkge1xuICAgICAgcGFydCA9IHV0aWwudW5lc2NhcGVGcmFnbWVudChwYXJ0KTtcbiAgICAgIHNjaGVtYSA9IHNjaGVtYVtwYXJ0XTtcbiAgICAgIGlmIChzY2hlbWEgPT09IHVuZGVmaW5lZCkgYnJlYWs7XG4gICAgICB2YXIgaWQ7XG4gICAgICBpZiAoIVBSRVZFTlRfU0NPUEVfQ0hBTkdFW3BhcnRdKSB7XG4gICAgICAgIGlkID0gdGhpcy5fZ2V0SWQoc2NoZW1hKTtcbiAgICAgICAgaWYgKGlkKSBiYXNlSWQgPSByZXNvbHZlVXJsKGJhc2VJZCwgaWQpO1xuICAgICAgICBpZiAoc2NoZW1hLiRyZWYpIHtcbiAgICAgICAgICB2YXIgJHJlZiA9IHJlc29sdmVVcmwoYmFzZUlkLCBzY2hlbWEuJHJlZik7XG4gICAgICAgICAgdmFyIHJlcyA9IHJlc29sdmVTY2hlbWEuY2FsbCh0aGlzLCByb290LCAkcmVmKTtcbiAgICAgICAgICBpZiAocmVzKSB7XG4gICAgICAgICAgICBzY2hlbWEgPSByZXMuc2NoZW1hO1xuICAgICAgICAgICAgcm9vdCA9IHJlcy5yb290O1xuICAgICAgICAgICAgYmFzZUlkID0gcmVzLmJhc2VJZDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKHNjaGVtYSAhPT0gdW5kZWZpbmVkICYmIHNjaGVtYSAhPT0gcm9vdC5zY2hlbWEpXG4gICAgcmV0dXJuIHsgc2NoZW1hOiBzY2hlbWEsIHJvb3Q6IHJvb3QsIGJhc2VJZDogYmFzZUlkIH07XG59XG5cblxudmFyIFNJTVBMRV9JTkxJTkVEID0gdXRpbC50b0hhc2goW1xuICAndHlwZScsICdmb3JtYXQnLCAncGF0dGVybicsXG4gICdtYXhMZW5ndGgnLCAnbWluTGVuZ3RoJyxcbiAgJ21heFByb3BlcnRpZXMnLCAnbWluUHJvcGVydGllcycsXG4gICdtYXhJdGVtcycsICdtaW5JdGVtcycsXG4gICdtYXhpbXVtJywgJ21pbmltdW0nLFxuICAndW5pcXVlSXRlbXMnLCAnbXVsdGlwbGVPZicsXG4gICdyZXF1aXJlZCcsICdlbnVtJ1xuXSk7XG5mdW5jdGlvbiBpbmxpbmVSZWYoc2NoZW1hLCBsaW1pdCkge1xuICBpZiAobGltaXQgPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XG4gIGlmIChsaW1pdCA9PT0gdW5kZWZpbmVkIHx8IGxpbWl0ID09PSB0cnVlKSByZXR1cm4gY2hlY2tOb1JlZihzY2hlbWEpO1xuICBlbHNlIGlmIChsaW1pdCkgcmV0dXJuIGNvdW50S2V5cyhzY2hlbWEpIDw9IGxpbWl0O1xufVxuXG5cbmZ1bmN0aW9uIGNoZWNrTm9SZWYoc2NoZW1hKSB7XG4gIHZhciBpdGVtO1xuICBpZiAoQXJyYXkuaXNBcnJheShzY2hlbWEpKSB7XG4gICAgZm9yICh2YXIgaT0wOyBpPHNjaGVtYS5sZW5ndGg7IGkrKykge1xuICAgICAgaXRlbSA9IHNjaGVtYVtpXTtcbiAgICAgIGlmICh0eXBlb2YgaXRlbSA9PSAnb2JqZWN0JyAmJiAhY2hlY2tOb1JlZihpdGVtKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gc2NoZW1hKSB7XG4gICAgICBpZiAoa2V5ID09ICckcmVmJykgcmV0dXJuIGZhbHNlO1xuICAgICAgaXRlbSA9IHNjaGVtYVtrZXldO1xuICAgICAgaWYgKHR5cGVvZiBpdGVtID09ICdvYmplY3QnICYmICFjaGVja05vUmVmKGl0ZW0pKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5cbmZ1bmN0aW9uIGNvdW50S2V5cyhzY2hlbWEpIHtcbiAgdmFyIGNvdW50ID0gMCwgaXRlbTtcbiAgaWYgKEFycmF5LmlzQXJyYXkoc2NoZW1hKSkge1xuICAgIGZvciAodmFyIGk9MDsgaTxzY2hlbWEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGl0ZW0gPSBzY2hlbWFbaV07XG4gICAgICBpZiAodHlwZW9mIGl0ZW0gPT0gJ29iamVjdCcpIGNvdW50ICs9IGNvdW50S2V5cyhpdGVtKTtcbiAgICAgIGlmIChjb3VudCA9PSBJbmZpbml0eSkgcmV0dXJuIEluZmluaXR5O1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gc2NoZW1hKSB7XG4gICAgICBpZiAoa2V5ID09ICckcmVmJykgcmV0dXJuIEluZmluaXR5O1xuICAgICAgaWYgKFNJTVBMRV9JTkxJTkVEW2tleV0pIHtcbiAgICAgICAgY291bnQrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGl0ZW0gPSBzY2hlbWFba2V5XTtcbiAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09ICdvYmplY3QnKSBjb3VudCArPSBjb3VudEtleXMoaXRlbSkgKyAxO1xuICAgICAgICBpZiAoY291bnQgPT0gSW5maW5pdHkpIHJldHVybiBJbmZpbml0eTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNvdW50O1xufVxuXG5cbmZ1bmN0aW9uIGdldEZ1bGxQYXRoKGlkLCBub3JtYWxpemUpIHtcbiAgaWYgKG5vcm1hbGl6ZSAhPT0gZmFsc2UpIGlkID0gbm9ybWFsaXplSWQoaWQpO1xuICB2YXIgcCA9IFVSSS5wYXJzZShpZCk7XG4gIHJldHVybiBfZ2V0RnVsbFBhdGgocCk7XG59XG5cblxuZnVuY3Rpb24gX2dldEZ1bGxQYXRoKHApIHtcbiAgcmV0dXJuIFVSSS5zZXJpYWxpemUocCkuc3BsaXQoJyMnKVswXSArICcjJztcbn1cblxuXG52YXIgVFJBSUxJTkdfU0xBU0hfSEFTSCA9IC8jXFwvPyQvO1xuZnVuY3Rpb24gbm9ybWFsaXplSWQoaWQpIHtcbiAgcmV0dXJuIGlkID8gaWQucmVwbGFjZShUUkFJTElOR19TTEFTSF9IQVNILCAnJykgOiAnJztcbn1cblxuXG5mdW5jdGlvbiByZXNvbHZlVXJsKGJhc2VJZCwgaWQpIHtcbiAgaWQgPSBub3JtYWxpemVJZChpZCk7XG4gIHJldHVybiBVUkkucmVzb2x2ZShiYXNlSWQsIGlkKTtcbn1cblxuXG4vKiBAdGhpcyBBanYgKi9cbmZ1bmN0aW9uIHJlc29sdmVJZHMoc2NoZW1hKSB7XG4gIHZhciBzY2hlbWFJZCA9IG5vcm1hbGl6ZUlkKHRoaXMuX2dldElkKHNjaGVtYSkpO1xuICB2YXIgYmFzZUlkcyA9IHsnJzogc2NoZW1hSWR9O1xuICB2YXIgZnVsbFBhdGhzID0geycnOiBnZXRGdWxsUGF0aChzY2hlbWFJZCwgZmFsc2UpfTtcbiAgdmFyIGxvY2FsUmVmcyA9IHt9O1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdHJhdmVyc2Uoc2NoZW1hLCB7YWxsS2V5czogdHJ1ZX0sIGZ1bmN0aW9uKHNjaCwganNvblB0ciwgcm9vdFNjaGVtYSwgcGFyZW50SnNvblB0ciwgcGFyZW50S2V5d29yZCwgcGFyZW50U2NoZW1hLCBrZXlJbmRleCkge1xuICAgIGlmIChqc29uUHRyID09PSAnJykgcmV0dXJuO1xuICAgIHZhciBpZCA9IHNlbGYuX2dldElkKHNjaCk7XG4gICAgdmFyIGJhc2VJZCA9IGJhc2VJZHNbcGFyZW50SnNvblB0cl07XG4gICAgdmFyIGZ1bGxQYXRoID0gZnVsbFBhdGhzW3BhcmVudEpzb25QdHJdICsgJy8nICsgcGFyZW50S2V5d29yZDtcbiAgICBpZiAoa2V5SW5kZXggIT09IHVuZGVmaW5lZClcbiAgICAgIGZ1bGxQYXRoICs9ICcvJyArICh0eXBlb2Yga2V5SW5kZXggPT0gJ251bWJlcicgPyBrZXlJbmRleCA6IHV0aWwuZXNjYXBlRnJhZ21lbnQoa2V5SW5kZXgpKTtcblxuICAgIGlmICh0eXBlb2YgaWQgPT0gJ3N0cmluZycpIHtcbiAgICAgIGlkID0gYmFzZUlkID0gbm9ybWFsaXplSWQoYmFzZUlkID8gVVJJLnJlc29sdmUoYmFzZUlkLCBpZCkgOiBpZCk7XG5cbiAgICAgIHZhciByZWZWYWwgPSBzZWxmLl9yZWZzW2lkXTtcbiAgICAgIGlmICh0eXBlb2YgcmVmVmFsID09ICdzdHJpbmcnKSByZWZWYWwgPSBzZWxmLl9yZWZzW3JlZlZhbF07XG4gICAgICBpZiAocmVmVmFsICYmIHJlZlZhbC5zY2hlbWEpIHtcbiAgICAgICAgaWYgKCFlcXVhbChzY2gsIHJlZlZhbC5zY2hlbWEpKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaWQgXCInICsgaWQgKyAnXCIgcmVzb2x2ZXMgdG8gbW9yZSB0aGFuIG9uZSBzY2hlbWEnKTtcbiAgICAgIH0gZWxzZSBpZiAoaWQgIT0gbm9ybWFsaXplSWQoZnVsbFBhdGgpKSB7XG4gICAgICAgIGlmIChpZFswXSA9PSAnIycpIHtcbiAgICAgICAgICBpZiAobG9jYWxSZWZzW2lkXSAmJiAhZXF1YWwoc2NoLCBsb2NhbFJlZnNbaWRdKSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaWQgXCInICsgaWQgKyAnXCIgcmVzb2x2ZXMgdG8gbW9yZSB0aGFuIG9uZSBzY2hlbWEnKTtcbiAgICAgICAgICBsb2NhbFJlZnNbaWRdID0gc2NoO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbGYuX3JlZnNbaWRdID0gZnVsbFBhdGg7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgYmFzZUlkc1tqc29uUHRyXSA9IGJhc2VJZDtcbiAgICBmdWxsUGF0aHNbanNvblB0cl0gPSBmdWxsUGF0aDtcbiAgfSk7XG5cbiAgcmV0dXJuIGxvY2FsUmVmcztcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL3Jlc29sdmUuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcnVsZU1vZHVsZXMgPSByZXF1aXJlKCcuLi9kb3RqcycpXG4gICwgdG9IYXNoID0gcmVxdWlyZSgnLi91dGlsJykudG9IYXNoO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJ1bGVzKCkge1xuICB2YXIgUlVMRVMgPSBbXG4gICAgeyB0eXBlOiAnbnVtYmVyJyxcbiAgICAgIHJ1bGVzOiBbIHsgJ21heGltdW0nOiBbJ2V4Y2x1c2l2ZU1heGltdW0nXSB9LFxuICAgICAgICAgICAgICAgeyAnbWluaW11bSc6IFsnZXhjbHVzaXZlTWluaW11bSddIH0sICdtdWx0aXBsZU9mJywgJ2Zvcm1hdCddIH0sXG4gICAgeyB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIHJ1bGVzOiBbICdtYXhMZW5ndGgnLCAnbWluTGVuZ3RoJywgJ3BhdHRlcm4nLCAnZm9ybWF0JyBdIH0sXG4gICAgeyB0eXBlOiAnYXJyYXknLFxuICAgICAgcnVsZXM6IFsgJ21heEl0ZW1zJywgJ21pbkl0ZW1zJywgJ2l0ZW1zJywgJ2NvbnRhaW5zJywgJ3VuaXF1ZUl0ZW1zJyBdIH0sXG4gICAgeyB0eXBlOiAnb2JqZWN0JyxcbiAgICAgIHJ1bGVzOiBbICdtYXhQcm9wZXJ0aWVzJywgJ21pblByb3BlcnRpZXMnLCAncmVxdWlyZWQnLCAnZGVwZW5kZW5jaWVzJywgJ3Byb3BlcnR5TmFtZXMnLFxuICAgICAgICAgICAgICAgeyAncHJvcGVydGllcyc6IFsnYWRkaXRpb25hbFByb3BlcnRpZXMnLCAncGF0dGVyblByb3BlcnRpZXMnXSB9IF0gfSxcbiAgICB7IHJ1bGVzOiBbICckcmVmJywgJ2NvbnN0JywgJ2VudW0nLCAnbm90JywgJ2FueU9mJywgJ29uZU9mJywgJ2FsbE9mJywgJ2lmJyBdIH1cbiAgXTtcblxuICB2YXIgQUxMID0gWyAndHlwZScsICckY29tbWVudCcgXTtcbiAgdmFyIEtFWVdPUkRTID0gW1xuICAgICckc2NoZW1hJywgJyRpZCcsICdpZCcsICckZGF0YScsICckYXN5bmMnLCAndGl0bGUnLFxuICAgICdkZXNjcmlwdGlvbicsICdkZWZhdWx0JywgJ2RlZmluaXRpb25zJyxcbiAgICAnZXhhbXBsZXMnLCAncmVhZE9ubHknLCAnd3JpdGVPbmx5JyxcbiAgICAnY29udGVudE1lZGlhVHlwZScsICdjb250ZW50RW5jb2RpbmcnLFxuICAgICdhZGRpdGlvbmFsSXRlbXMnLCAndGhlbicsICdlbHNlJ1xuICBdO1xuICB2YXIgVFlQRVMgPSBbICdudW1iZXInLCAnaW50ZWdlcicsICdzdHJpbmcnLCAnYXJyYXknLCAnb2JqZWN0JywgJ2Jvb2xlYW4nLCAnbnVsbCcgXTtcbiAgUlVMRVMuYWxsID0gdG9IYXNoKEFMTCk7XG4gIFJVTEVTLnR5cGVzID0gdG9IYXNoKFRZUEVTKTtcblxuICBSVUxFUy5mb3JFYWNoKGZ1bmN0aW9uIChncm91cCkge1xuICAgIGdyb3VwLnJ1bGVzID0gZ3JvdXAucnVsZXMubWFwKGZ1bmN0aW9uIChrZXl3b3JkKSB7XG4gICAgICB2YXIgaW1wbEtleXdvcmRzO1xuICAgICAgaWYgKHR5cGVvZiBrZXl3b3JkID09ICdvYmplY3QnKSB7XG4gICAgICAgIHZhciBrZXkgPSBPYmplY3Qua2V5cyhrZXl3b3JkKVswXTtcbiAgICAgICAgaW1wbEtleXdvcmRzID0ga2V5d29yZFtrZXldO1xuICAgICAgICBrZXl3b3JkID0ga2V5O1xuICAgICAgICBpbXBsS2V5d29yZHMuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgICAgICAgIEFMTC5wdXNoKGspO1xuICAgICAgICAgIFJVTEVTLmFsbFtrXSA9IHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgQUxMLnB1c2goa2V5d29yZCk7XG4gICAgICB2YXIgcnVsZSA9IFJVTEVTLmFsbFtrZXl3b3JkXSA9IHtcbiAgICAgICAga2V5d29yZDoga2V5d29yZCxcbiAgICAgICAgY29kZTogcnVsZU1vZHVsZXNba2V5d29yZF0sXG4gICAgICAgIGltcGxlbWVudHM6IGltcGxLZXl3b3Jkc1xuICAgICAgfTtcbiAgICAgIHJldHVybiBydWxlO1xuICAgIH0pO1xuXG4gICAgUlVMRVMuYWxsLiRjb21tZW50ID0ge1xuICAgICAga2V5d29yZDogJyRjb21tZW50JyxcbiAgICAgIGNvZGU6IHJ1bGVNb2R1bGVzLiRjb21tZW50XG4gICAgfTtcblxuICAgIGlmIChncm91cC50eXBlKSBSVUxFUy50eXBlc1tncm91cC50eXBlXSA9IGdyb3VwO1xuICB9KTtcblxuICBSVUxFUy5rZXl3b3JkcyA9IHRvSGFzaChBTEwuY29uY2F0KEtFWVdPUkRTKSk7XG4gIFJVTEVTLmN1c3RvbSA9IHt9O1xuXG4gIHJldHVybiBSVUxFUztcbn07XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS9ydWxlcy5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGVcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hT2JqZWN0O1xuXG5mdW5jdGlvbiBTY2hlbWFPYmplY3Qob2JqKSB7XG4gIHV0aWwuY29weShvYmosIHRoaXMpO1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvc2NoZW1hX29iai5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGVcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5cbi8vIGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvcHVueWNvZGUuanMgLSBwdW55Y29kZS51Y3MyLmRlY29kZVxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB1Y3MybGVuZ3RoKHN0cikge1xuICB2YXIgbGVuZ3RoID0gMFxuICAgICwgbGVuID0gc3RyLmxlbmd0aFxuICAgICwgcG9zID0gMFxuICAgICwgdmFsdWU7XG4gIHdoaWxlIChwb3MgPCBsZW4pIHtcbiAgICBsZW5ndGgrKztcbiAgICB2YWx1ZSA9IHN0ci5jaGFyQ29kZUF0KHBvcysrKTtcbiAgICBpZiAodmFsdWUgPj0gMHhEODAwICYmIHZhbHVlIDw9IDB4REJGRiAmJiBwb3MgPCBsZW4pIHtcbiAgICAgIC8vIGhpZ2ggc3Vycm9nYXRlLCBhbmQgdGhlcmUgaXMgYSBuZXh0IGNoYXJhY3RlclxuICAgICAgdmFsdWUgPSBzdHIuY2hhckNvZGVBdChwb3MpO1xuICAgICAgaWYgKCh2YWx1ZSAmIDB4RkMwMCkgPT0gMHhEQzAwKSBwb3MrKzsgLy8gbG93IHN1cnJvZ2F0ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gbGVuZ3RoO1xufTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL3VjczJsZW5ndGguanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjb3B5OiBjb3B5LFxuICBjaGVja0RhdGFUeXBlOiBjaGVja0RhdGFUeXBlLFxuICBjaGVja0RhdGFUeXBlczogY2hlY2tEYXRhVHlwZXMsXG4gIGNvZXJjZVRvVHlwZXM6IGNvZXJjZVRvVHlwZXMsXG4gIHRvSGFzaDogdG9IYXNoLFxuICBnZXRQcm9wZXJ0eTogZ2V0UHJvcGVydHksXG4gIGVzY2FwZVF1b3RlczogZXNjYXBlUXVvdGVzLFxuICBlcXVhbDogcmVxdWlyZSgnZmFzdC1kZWVwLWVxdWFsJyksXG4gIHVjczJsZW5ndGg6IHJlcXVpcmUoJy4vdWNzMmxlbmd0aCcpLFxuICB2YXJPY2N1cmVuY2VzOiB2YXJPY2N1cmVuY2VzLFxuICB2YXJSZXBsYWNlOiB2YXJSZXBsYWNlLFxuICBzY2hlbWFIYXNSdWxlczogc2NoZW1hSGFzUnVsZXMsXG4gIHNjaGVtYUhhc1J1bGVzRXhjZXB0OiBzY2hlbWFIYXNSdWxlc0V4Y2VwdCxcbiAgc2NoZW1hVW5rbm93blJ1bGVzOiBzY2hlbWFVbmtub3duUnVsZXMsXG4gIHRvUXVvdGVkU3RyaW5nOiB0b1F1b3RlZFN0cmluZyxcbiAgZ2V0UGF0aEV4cHI6IGdldFBhdGhFeHByLFxuICBnZXRQYXRoOiBnZXRQYXRoLFxuICBnZXREYXRhOiBnZXREYXRhLFxuICB1bmVzY2FwZUZyYWdtZW50OiB1bmVzY2FwZUZyYWdtZW50LFxuICB1bmVzY2FwZUpzb25Qb2ludGVyOiB1bmVzY2FwZUpzb25Qb2ludGVyLFxuICBlc2NhcGVGcmFnbWVudDogZXNjYXBlRnJhZ21lbnQsXG4gIGVzY2FwZUpzb25Qb2ludGVyOiBlc2NhcGVKc29uUG9pbnRlclxufTtcblxuXG5mdW5jdGlvbiBjb3B5KG8sIHRvKSB7XG4gIHRvID0gdG8gfHwge307XG4gIGZvciAodmFyIGtleSBpbiBvKSB0b1trZXldID0gb1trZXldO1xuICByZXR1cm4gdG87XG59XG5cblxuZnVuY3Rpb24gY2hlY2tEYXRhVHlwZShkYXRhVHlwZSwgZGF0YSwgc3RyaWN0TnVtYmVycywgbmVnYXRlKSB7XG4gIHZhciBFUVVBTCA9IG5lZ2F0ZSA/ICcgIT09ICcgOiAnID09PSAnXG4gICAgLCBBTkQgPSBuZWdhdGUgPyAnIHx8ICcgOiAnICYmICdcbiAgICAsIE9LID0gbmVnYXRlID8gJyEnIDogJydcbiAgICAsIE5PVCA9IG5lZ2F0ZSA/ICcnIDogJyEnO1xuICBzd2l0Y2ggKGRhdGFUeXBlKSB7XG4gICAgY2FzZSAnbnVsbCc6IHJldHVybiBkYXRhICsgRVFVQUwgKyAnbnVsbCc7XG4gICAgY2FzZSAnYXJyYXknOiByZXR1cm4gT0sgKyAnQXJyYXkuaXNBcnJheSgnICsgZGF0YSArICcpJztcbiAgICBjYXNlICdvYmplY3QnOiByZXR1cm4gJygnICsgT0sgKyBkYXRhICsgQU5EICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJ3R5cGVvZiAnICsgZGF0YSArIEVRVUFMICsgJ1wib2JqZWN0XCInICsgQU5EICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgTk9UICsgJ0FycmF5LmlzQXJyYXkoJyArIGRhdGEgKyAnKSknO1xuICAgIGNhc2UgJ2ludGVnZXInOiByZXR1cm4gJyh0eXBlb2YgJyArIGRhdGEgKyBFUVVBTCArICdcIm51bWJlclwiJyArIEFORCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBOT1QgKyAnKCcgKyBkYXRhICsgJyAlIDEpJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBBTkQgKyBkYXRhICsgRVFVQUwgKyBkYXRhICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIChzdHJpY3ROdW1iZXJzID8gKEFORCArIE9LICsgJ2lzRmluaXRlKCcgKyBkYXRhICsgJyknKSA6ICcnKSArICcpJztcbiAgICBjYXNlICdudW1iZXInOiByZXR1cm4gJyh0eXBlb2YgJyArIGRhdGEgKyBFUVVBTCArICdcIicgKyBkYXRhVHlwZSArICdcIicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAoc3RyaWN0TnVtYmVycyA/IChBTkQgKyBPSyArICdpc0Zpbml0ZSgnICsgZGF0YSArICcpJykgOiAnJykgKyAnKSc7XG4gICAgZGVmYXVsdDogcmV0dXJuICd0eXBlb2YgJyArIGRhdGEgKyBFUVVBTCArICdcIicgKyBkYXRhVHlwZSArICdcIic7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBjaGVja0RhdGFUeXBlcyhkYXRhVHlwZXMsIGRhdGEsIHN0cmljdE51bWJlcnMpIHtcbiAgc3dpdGNoIChkYXRhVHlwZXMubGVuZ3RoKSB7XG4gICAgY2FzZSAxOiByZXR1cm4gY2hlY2tEYXRhVHlwZShkYXRhVHlwZXNbMF0sIGRhdGEsIHN0cmljdE51bWJlcnMsIHRydWUpO1xuICAgIGRlZmF1bHQ6XG4gICAgICB2YXIgY29kZSA9ICcnO1xuICAgICAgdmFyIHR5cGVzID0gdG9IYXNoKGRhdGFUeXBlcyk7XG4gICAgICBpZiAodHlwZXMuYXJyYXkgJiYgdHlwZXMub2JqZWN0KSB7XG4gICAgICAgIGNvZGUgPSB0eXBlcy5udWxsID8gJygnOiAnKCEnICsgZGF0YSArICcgfHwgJztcbiAgICAgICAgY29kZSArPSAndHlwZW9mICcgKyBkYXRhICsgJyAhPT0gXCJvYmplY3RcIiknO1xuICAgICAgICBkZWxldGUgdHlwZXMubnVsbDtcbiAgICAgICAgZGVsZXRlIHR5cGVzLmFycmF5O1xuICAgICAgICBkZWxldGUgdHlwZXMub2JqZWN0O1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVzLm51bWJlcikgZGVsZXRlIHR5cGVzLmludGVnZXI7XG4gICAgICBmb3IgKHZhciB0IGluIHR5cGVzKVxuICAgICAgICBjb2RlICs9IChjb2RlID8gJyAmJiAnIDogJycgKSArIGNoZWNrRGF0YVR5cGUodCwgZGF0YSwgc3RyaWN0TnVtYmVycywgdHJ1ZSk7XG5cbiAgICAgIHJldHVybiBjb2RlO1xuICB9XG59XG5cblxudmFyIENPRVJDRV9UT19UWVBFUyA9IHRvSGFzaChbICdzdHJpbmcnLCAnbnVtYmVyJywgJ2ludGVnZXInLCAnYm9vbGVhbicsICdudWxsJyBdKTtcbmZ1bmN0aW9uIGNvZXJjZVRvVHlwZXMob3B0aW9uQ29lcmNlVHlwZXMsIGRhdGFUeXBlcykge1xuICBpZiAoQXJyYXkuaXNBcnJheShkYXRhVHlwZXMpKSB7XG4gICAgdmFyIHR5cGVzID0gW107XG4gICAgZm9yICh2YXIgaT0wOyBpPGRhdGFUeXBlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHQgPSBkYXRhVHlwZXNbaV07XG4gICAgICBpZiAoQ09FUkNFX1RPX1RZUEVTW3RdKSB0eXBlc1t0eXBlcy5sZW5ndGhdID0gdDtcbiAgICAgIGVsc2UgaWYgKG9wdGlvbkNvZXJjZVR5cGVzID09PSAnYXJyYXknICYmIHQgPT09ICdhcnJheScpIHR5cGVzW3R5cGVzLmxlbmd0aF0gPSB0O1xuICAgIH1cbiAgICBpZiAodHlwZXMubGVuZ3RoKSByZXR1cm4gdHlwZXM7XG4gIH0gZWxzZSBpZiAoQ09FUkNFX1RPX1RZUEVTW2RhdGFUeXBlc10pIHtcbiAgICByZXR1cm4gW2RhdGFUeXBlc107XG4gIH0gZWxzZSBpZiAob3B0aW9uQ29lcmNlVHlwZXMgPT09ICdhcnJheScgJiYgZGF0YVR5cGVzID09PSAnYXJyYXknKSB7XG4gICAgcmV0dXJuIFsnYXJyYXknXTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHRvSGFzaChhcnIpIHtcbiAgdmFyIGhhc2ggPSB7fTtcbiAgZm9yICh2YXIgaT0wOyBpPGFyci5sZW5ndGg7IGkrKykgaGFzaFthcnJbaV1dID0gdHJ1ZTtcbiAgcmV0dXJuIGhhc2g7XG59XG5cblxudmFyIElERU5USUZJRVIgPSAvXlthLXokX11bYS16JF8wLTldKiQvaTtcbnZhciBTSU5HTEVfUVVPVEUgPSAvJ3xcXFxcL2c7XG5mdW5jdGlvbiBnZXRQcm9wZXJ0eShrZXkpIHtcbiAgcmV0dXJuIHR5cGVvZiBrZXkgPT0gJ251bWJlcidcbiAgICAgICAgICA/ICdbJyArIGtleSArICddJ1xuICAgICAgICAgIDogSURFTlRJRklFUi50ZXN0KGtleSlcbiAgICAgICAgICAgID8gJy4nICsga2V5XG4gICAgICAgICAgICA6IFwiWydcIiArIGVzY2FwZVF1b3RlcyhrZXkpICsgXCInXVwiO1xufVxuXG5cbmZ1bmN0aW9uIGVzY2FwZVF1b3RlcyhzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKFNJTkdMRV9RVU9URSwgJ1xcXFwkJicpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxuL2csICdcXFxcbicpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxyL2csICdcXFxccicpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxmL2csICdcXFxcZicpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFx0L2csICdcXFxcdCcpO1xufVxuXG5cbmZ1bmN0aW9uIHZhck9jY3VyZW5jZXMoc3RyLCBkYXRhVmFyKSB7XG4gIGRhdGFWYXIgKz0gJ1teMC05XSc7XG4gIHZhciBtYXRjaGVzID0gc3RyLm1hdGNoKG5ldyBSZWdFeHAoZGF0YVZhciwgJ2cnKSk7XG4gIHJldHVybiBtYXRjaGVzID8gbWF0Y2hlcy5sZW5ndGggOiAwO1xufVxuXG5cbmZ1bmN0aW9uIHZhclJlcGxhY2Uoc3RyLCBkYXRhVmFyLCBleHByKSB7XG4gIGRhdGFWYXIgKz0gJyhbXjAtOV0pJztcbiAgZXhwciA9IGV4cHIucmVwbGFjZSgvXFwkL2csICckJCQkJyk7XG4gIHJldHVybiBzdHIucmVwbGFjZShuZXcgUmVnRXhwKGRhdGFWYXIsICdnJyksIGV4cHIgKyAnJDEnKTtcbn1cblxuXG5mdW5jdGlvbiBzY2hlbWFIYXNSdWxlcyhzY2hlbWEsIHJ1bGVzKSB7XG4gIGlmICh0eXBlb2Ygc2NoZW1hID09ICdib29sZWFuJykgcmV0dXJuICFzY2hlbWE7XG4gIGZvciAodmFyIGtleSBpbiBzY2hlbWEpIGlmIChydWxlc1trZXldKSByZXR1cm4gdHJ1ZTtcbn1cblxuXG5mdW5jdGlvbiBzY2hlbWFIYXNSdWxlc0V4Y2VwdChzY2hlbWEsIHJ1bGVzLCBleGNlcHRLZXl3b3JkKSB7XG4gIGlmICh0eXBlb2Ygc2NoZW1hID09ICdib29sZWFuJykgcmV0dXJuICFzY2hlbWEgJiYgZXhjZXB0S2V5d29yZCAhPSAnbm90JztcbiAgZm9yICh2YXIga2V5IGluIHNjaGVtYSkgaWYgKGtleSAhPSBleGNlcHRLZXl3b3JkICYmIHJ1bGVzW2tleV0pIHJldHVybiB0cnVlO1xufVxuXG5cbmZ1bmN0aW9uIHNjaGVtYVVua25vd25SdWxlcyhzY2hlbWEsIHJ1bGVzKSB7XG4gIGlmICh0eXBlb2Ygc2NoZW1hID09ICdib29sZWFuJykgcmV0dXJuO1xuICBmb3IgKHZhciBrZXkgaW4gc2NoZW1hKSBpZiAoIXJ1bGVzW2tleV0pIHJldHVybiBrZXk7XG59XG5cblxuZnVuY3Rpb24gdG9RdW90ZWRTdHJpbmcoc3RyKSB7XG4gIHJldHVybiAnXFwnJyArIGVzY2FwZVF1b3RlcyhzdHIpICsgJ1xcJyc7XG59XG5cblxuZnVuY3Rpb24gZ2V0UGF0aEV4cHIoY3VycmVudFBhdGgsIGV4cHIsIGpzb25Qb2ludGVycywgaXNOdW1iZXIpIHtcbiAgdmFyIHBhdGggPSBqc29uUG9pbnRlcnMgLy8gZmFsc2UgYnkgZGVmYXVsdFxuICAgICAgICAgICAgICA/ICdcXCcvXFwnICsgJyArIGV4cHIgKyAoaXNOdW1iZXIgPyAnJyA6ICcucmVwbGFjZSgvfi9nLCBcXCd+MFxcJykucmVwbGFjZSgvXFxcXC8vZywgXFwnfjFcXCcpJylcbiAgICAgICAgICAgICAgOiAoaXNOdW1iZXIgPyAnXFwnW1xcJyArICcgKyBleHByICsgJyArIFxcJ11cXCcnIDogJ1xcJ1tcXFxcXFwnXFwnICsgJyArIGV4cHIgKyAnICsgXFwnXFxcXFxcJ11cXCcnKTtcbiAgcmV0dXJuIGpvaW5QYXRocyhjdXJyZW50UGF0aCwgcGF0aCk7XG59XG5cblxuZnVuY3Rpb24gZ2V0UGF0aChjdXJyZW50UGF0aCwgcHJvcCwganNvblBvaW50ZXJzKSB7XG4gIHZhciBwYXRoID0ganNvblBvaW50ZXJzIC8vIGZhbHNlIGJ5IGRlZmF1bHRcbiAgICAgICAgICAgICAgPyB0b1F1b3RlZFN0cmluZygnLycgKyBlc2NhcGVKc29uUG9pbnRlcihwcm9wKSlcbiAgICAgICAgICAgICAgOiB0b1F1b3RlZFN0cmluZyhnZXRQcm9wZXJ0eShwcm9wKSk7XG4gIHJldHVybiBqb2luUGF0aHMoY3VycmVudFBhdGgsIHBhdGgpO1xufVxuXG5cbnZhciBKU09OX1BPSU5URVIgPSAvXlxcLyg/Oltefl18fjB8fjEpKiQvO1xudmFyIFJFTEFUSVZFX0pTT05fUE9JTlRFUiA9IC9eKFswLTldKykoI3xcXC8oPzpbXn5dfH4wfH4xKSopPyQvO1xuZnVuY3Rpb24gZ2V0RGF0YSgkZGF0YSwgbHZsLCBwYXRocykge1xuICB2YXIgdXAsIGpzb25Qb2ludGVyLCBkYXRhLCBtYXRjaGVzO1xuICBpZiAoJGRhdGEgPT09ICcnKSByZXR1cm4gJ3Jvb3REYXRhJztcbiAgaWYgKCRkYXRhWzBdID09ICcvJykge1xuICAgIGlmICghSlNPTl9QT0lOVEVSLnRlc3QoJGRhdGEpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgSlNPTi1wb2ludGVyOiAnICsgJGRhdGEpO1xuICAgIGpzb25Qb2ludGVyID0gJGRhdGE7XG4gICAgZGF0YSA9ICdyb290RGF0YSc7XG4gIH0gZWxzZSB7XG4gICAgbWF0Y2hlcyA9ICRkYXRhLm1hdGNoKFJFTEFUSVZFX0pTT05fUE9JTlRFUik7XG4gICAgaWYgKCFtYXRjaGVzKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgSlNPTi1wb2ludGVyOiAnICsgJGRhdGEpO1xuICAgIHVwID0gK21hdGNoZXNbMV07XG4gICAganNvblBvaW50ZXIgPSBtYXRjaGVzWzJdO1xuICAgIGlmIChqc29uUG9pbnRlciA9PSAnIycpIHtcbiAgICAgIGlmICh1cCA+PSBsdmwpIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGFjY2VzcyBwcm9wZXJ0eS9pbmRleCAnICsgdXAgKyAnIGxldmVscyB1cCwgY3VycmVudCBsZXZlbCBpcyAnICsgbHZsKTtcbiAgICAgIHJldHVybiBwYXRoc1tsdmwgLSB1cF07XG4gICAgfVxuXG4gICAgaWYgKHVwID4gbHZsKSB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBhY2Nlc3MgZGF0YSAnICsgdXAgKyAnIGxldmVscyB1cCwgY3VycmVudCBsZXZlbCBpcyAnICsgbHZsKTtcbiAgICBkYXRhID0gJ2RhdGEnICsgKChsdmwgLSB1cCkgfHwgJycpO1xuICAgIGlmICghanNvblBvaW50ZXIpIHJldHVybiBkYXRhO1xuICB9XG5cbiAgdmFyIGV4cHIgPSBkYXRhO1xuICB2YXIgc2VnbWVudHMgPSBqc29uUG9pbnRlci5zcGxpdCgnLycpO1xuICBmb3IgKHZhciBpPTA7IGk8c2VnbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgc2VnbWVudCA9IHNlZ21lbnRzW2ldO1xuICAgIGlmIChzZWdtZW50KSB7XG4gICAgICBkYXRhICs9IGdldFByb3BlcnR5KHVuZXNjYXBlSnNvblBvaW50ZXIoc2VnbWVudCkpO1xuICAgICAgZXhwciArPSAnICYmICcgKyBkYXRhO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZXhwcjtcbn1cblxuXG5mdW5jdGlvbiBqb2luUGF0aHMgKGEsIGIpIHtcbiAgaWYgKGEgPT0gJ1wiXCInKSByZXR1cm4gYjtcbiAgcmV0dXJuIChhICsgJyArICcgKyBiKS5yZXBsYWNlKC8oW15cXFxcXSknIFxcKyAnL2csICckMScpO1xufVxuXG5cbmZ1bmN0aW9uIHVuZXNjYXBlRnJhZ21lbnQoc3RyKSB7XG4gIHJldHVybiB1bmVzY2FwZUpzb25Qb2ludGVyKGRlY29kZVVSSUNvbXBvbmVudChzdHIpKTtcbn1cblxuXG5mdW5jdGlvbiBlc2NhcGVGcmFnbWVudChzdHIpIHtcbiAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChlc2NhcGVKc29uUG9pbnRlcihzdHIpKTtcbn1cblxuXG5mdW5jdGlvbiBlc2NhcGVKc29uUG9pbnRlcihzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9+L2csICd+MCcpLnJlcGxhY2UoL1xcLy9nLCAnfjEnKTtcbn1cblxuXG5mdW5jdGlvbiB1bmVzY2FwZUpzb25Qb2ludGVyKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL34xL2csICcvJykucmVwbGFjZSgvfjAvZywgJ34nKTtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL3V0aWwuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgS0VZV09SRFMgPSBbXG4gICdtdWx0aXBsZU9mJyxcbiAgJ21heGltdW0nLFxuICAnZXhjbHVzaXZlTWF4aW11bScsXG4gICdtaW5pbXVtJyxcbiAgJ2V4Y2x1c2l2ZU1pbmltdW0nLFxuICAnbWF4TGVuZ3RoJyxcbiAgJ21pbkxlbmd0aCcsXG4gICdwYXR0ZXJuJyxcbiAgJ2FkZGl0aW9uYWxJdGVtcycsXG4gICdtYXhJdGVtcycsXG4gICdtaW5JdGVtcycsXG4gICd1bmlxdWVJdGVtcycsXG4gICdtYXhQcm9wZXJ0aWVzJyxcbiAgJ21pblByb3BlcnRpZXMnLFxuICAncmVxdWlyZWQnLFxuICAnYWRkaXRpb25hbFByb3BlcnRpZXMnLFxuICAnZW51bScsXG4gICdmb3JtYXQnLFxuICAnY29uc3QnXG5dO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChtZXRhU2NoZW1hLCBrZXl3b3Jkc0pzb25Qb2ludGVycykge1xuICBmb3IgKHZhciBpPTA7IGk8a2V5d29yZHNKc29uUG9pbnRlcnMubGVuZ3RoOyBpKyspIHtcbiAgICBtZXRhU2NoZW1hID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShtZXRhU2NoZW1hKSk7XG4gICAgdmFyIHNlZ21lbnRzID0ga2V5d29yZHNKc29uUG9pbnRlcnNbaV0uc3BsaXQoJy8nKTtcbiAgICB2YXIga2V5d29yZHMgPSBtZXRhU2NoZW1hO1xuICAgIHZhciBqO1xuICAgIGZvciAoaj0xOyBqPHNlZ21lbnRzLmxlbmd0aDsgaisrKVxuICAgICAga2V5d29yZHMgPSBrZXl3b3Jkc1tzZWdtZW50c1tqXV07XG5cbiAgICBmb3IgKGo9MDsgajxLRVlXT1JEUy5sZW5ndGg7IGorKykge1xuICAgICAgdmFyIGtleSA9IEtFWVdPUkRTW2pdO1xuICAgICAgdmFyIHNjaGVtYSA9IGtleXdvcmRzW2tleV07XG4gICAgICBpZiAoc2NoZW1hKSB7XG4gICAgICAgIGtleXdvcmRzW2tleV0gPSB7XG4gICAgICAgICAgYW55T2Y6IFtcbiAgICAgICAgICAgIHNjaGVtYSxcbiAgICAgICAgICAgIHsgJHJlZjogJ2h0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9hanYtdmFsaWRhdG9yL2Fqdi9tYXN0ZXIvbGliL3JlZnMvZGF0YS5qc29uIycgfVxuICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbWV0YVNjaGVtYTtcbn07XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZGF0YS5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWV0YVNjaGVtYSA9IHJlcXVpcmUoJy4vcmVmcy9qc29uLXNjaGVtYS1kcmFmdC0wNy5qc29uJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAkaWQ6ICdodHRwczovL2dpdGh1Yi5jb20vYWp2LXZhbGlkYXRvci9hanYvYmxvYi9tYXN0ZXIvbGliL2RlZmluaXRpb25fc2NoZW1hLmpzJyxcbiAgZGVmaW5pdGlvbnM6IHtcbiAgICBzaW1wbGVUeXBlczogbWV0YVNjaGVtYS5kZWZpbml0aW9ucy5zaW1wbGVUeXBlc1xuICB9LFxuICB0eXBlOiAnb2JqZWN0JyxcbiAgZGVwZW5kZW5jaWVzOiB7XG4gICAgc2NoZW1hOiBbJ3ZhbGlkYXRlJ10sXG4gICAgJGRhdGE6IFsndmFsaWRhdGUnXSxcbiAgICBzdGF0ZW1lbnRzOiBbJ2lubGluZSddLFxuICAgIHZhbGlkOiB7bm90OiB7cmVxdWlyZWQ6IFsnbWFjcm8nXX19XG4gIH0sXG4gIHByb3BlcnRpZXM6IHtcbiAgICB0eXBlOiBtZXRhU2NoZW1hLnByb3BlcnRpZXMudHlwZSxcbiAgICBzY2hlbWE6IHt0eXBlOiAnYm9vbGVhbid9LFxuICAgIHN0YXRlbWVudHM6IHt0eXBlOiAnYm9vbGVhbid9LFxuICAgIGRlcGVuZGVuY2llczoge1xuICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgIGl0ZW1zOiB7dHlwZTogJ3N0cmluZyd9XG4gICAgfSxcbiAgICBtZXRhU2NoZW1hOiB7dHlwZTogJ29iamVjdCd9LFxuICAgIG1vZGlmeWluZzoge3R5cGU6ICdib29sZWFuJ30sXG4gICAgdmFsaWQ6IHt0eXBlOiAnYm9vbGVhbid9LFxuICAgICRkYXRhOiB7dHlwZTogJ2Jvb2xlYW4nfSxcbiAgICBhc3luYzoge3R5cGU6ICdib29sZWFuJ30sXG4gICAgZXJyb3JzOiB7XG4gICAgICBhbnlPZjogW1xuICAgICAgICB7dHlwZTogJ2Jvb2xlYW4nfSxcbiAgICAgICAge2NvbnN0OiAnZnVsbCd9XG4gICAgICBdXG4gICAgfVxuICB9XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RlZmluaXRpb25fc2NoZW1hLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWJcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX19saW1pdChpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGVycm9yS2V5d29yZDtcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICRpc0RhdGEgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWEgJiYgJHNjaGVtYS4kZGF0YSxcbiAgICAkc2NoZW1hVmFsdWU7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLmdldERhdGEoJHNjaGVtYS4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgfSBlbHNlIHtcbiAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hO1xuICB9XG4gIHZhciAkaXNNYXggPSAka2V5d29yZCA9PSAnbWF4aW11bScsXG4gICAgJGV4Y2x1c2l2ZUtleXdvcmQgPSAkaXNNYXggPyAnZXhjbHVzaXZlTWF4aW11bScgOiAnZXhjbHVzaXZlTWluaW11bScsXG4gICAgJHNjaGVtYUV4Y2wgPSBpdC5zY2hlbWFbJGV4Y2x1c2l2ZUtleXdvcmRdLFxuICAgICRpc0RhdGFFeGNsID0gaXQub3B0cy4kZGF0YSAmJiAkc2NoZW1hRXhjbCAmJiAkc2NoZW1hRXhjbC4kZGF0YSxcbiAgICAkb3AgPSAkaXNNYXggPyAnPCcgOiAnPicsXG4gICAgJG5vdE9wID0gJGlzTWF4ID8gJz4nIDogJzwnLFxuICAgICRlcnJvcktleXdvcmQgPSB1bmRlZmluZWQ7XG4gIGlmICghKCRpc0RhdGEgfHwgdHlwZW9mICRzY2hlbWEgPT0gJ251bWJlcicgfHwgJHNjaGVtYSA9PT0gdW5kZWZpbmVkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcigka2V5d29yZCArICcgbXVzdCBiZSBudW1iZXInKTtcbiAgfVxuICBpZiAoISgkaXNEYXRhRXhjbCB8fCAkc2NoZW1hRXhjbCA9PT0gdW5kZWZpbmVkIHx8IHR5cGVvZiAkc2NoZW1hRXhjbCA9PSAnbnVtYmVyJyB8fCB0eXBlb2YgJHNjaGVtYUV4Y2wgPT0gJ2Jvb2xlYW4nKSkge1xuICAgIHRocm93IG5ldyBFcnJvcigkZXhjbHVzaXZlS2V5d29yZCArICcgbXVzdCBiZSBudW1iZXIgb3IgYm9vbGVhbicpO1xuICB9XG4gIGlmICgkaXNEYXRhRXhjbCkge1xuICAgIHZhciAkc2NoZW1hVmFsdWVFeGNsID0gaXQudXRpbC5nZXREYXRhKCRzY2hlbWFFeGNsLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpLFxuICAgICAgJGV4Y2x1c2l2ZSA9ICdleGNsdXNpdmUnICsgJGx2bCxcbiAgICAgICRleGNsVHlwZSA9ICdleGNsVHlwZScgKyAkbHZsLFxuICAgICAgJGV4Y2xJc051bWJlciA9ICdleGNsSXNOdW1iZXInICsgJGx2bCxcbiAgICAgICRvcEV4cHIgPSAnb3AnICsgJGx2bCxcbiAgICAgICRvcFN0ciA9ICdcXCcgKyAnICsgJG9wRXhwciArICcgKyBcXCcnO1xuICAgIG91dCArPSAnIHZhciBzY2hlbWFFeGNsJyArICgkbHZsKSArICcgPSAnICsgKCRzY2hlbWFWYWx1ZUV4Y2wpICsgJzsgJztcbiAgICAkc2NoZW1hVmFsdWVFeGNsID0gJ3NjaGVtYUV4Y2wnICsgJGx2bDtcbiAgICBvdXQgKz0gJyB2YXIgJyArICgkZXhjbHVzaXZlKSArICc7IHZhciAnICsgKCRleGNsVHlwZSkgKyAnID0gdHlwZW9mICcgKyAoJHNjaGVtYVZhbHVlRXhjbCkgKyAnOyBpZiAoJyArICgkZXhjbFR5cGUpICsgJyAhPSBcXCdib29sZWFuXFwnICYmICcgKyAoJGV4Y2xUeXBlKSArICcgIT0gXFwndW5kZWZpbmVkXFwnICYmICcgKyAoJGV4Y2xUeXBlKSArICcgIT0gXFwnbnVtYmVyXFwnKSB7ICc7XG4gICAgdmFyICRlcnJvcktleXdvcmQgPSAkZXhjbHVzaXZlS2V5d29yZDtcbiAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgkZXJyb3JLZXl3b3JkIHx8ICdfZXhjbHVzaXZlTGltaXQnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7fSAnO1xuICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnJyArICgkZXhjbHVzaXZlS2V5d29yZCkgKyAnIHNob3VsZCBiZSBib29sZWFuXFwnICc7XG4gICAgICB9XG4gICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgfVxuICAgIHZhciBfX2VyciA9IG91dDtcbiAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSBlbHNlIGlmICggJztcbiAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgb3V0ICs9ICcgKCcgKyAoJHNjaGVtYVZhbHVlKSArICcgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPSBcXCdudW1iZXJcXCcpIHx8ICc7XG4gICAgfVxuICAgIG91dCArPSAnICcgKyAoJGV4Y2xUeXBlKSArICcgPT0gXFwnbnVtYmVyXFwnID8gKCAoJyArICgkZXhjbHVzaXZlKSArICcgPSAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnID09PSB1bmRlZmluZWQgfHwgJyArICgkc2NoZW1hVmFsdWVFeGNsKSArICcgJyArICgkb3ApICsgJz0gJyArICgkc2NoZW1hVmFsdWUpICsgJykgPyAnICsgKCRkYXRhKSArICcgJyArICgkbm90T3ApICsgJz0gJyArICgkc2NoZW1hVmFsdWVFeGNsKSArICcgOiAnICsgKCRkYXRhKSArICcgJyArICgkbm90T3ApICsgJyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICkgOiAoICgnICsgKCRleGNsdXNpdmUpICsgJyA9ICcgKyAoJHNjaGVtYVZhbHVlRXhjbCkgKyAnID09PSB0cnVlKSA/ICcgKyAoJGRhdGEpICsgJyAnICsgKCRub3RPcCkgKyAnPSAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnIDogJyArICgkZGF0YSkgKyAnICcgKyAoJG5vdE9wKSArICcgJyArICgkc2NoZW1hVmFsdWUpICsgJyApIHx8ICcgKyAoJGRhdGEpICsgJyAhPT0gJyArICgkZGF0YSkgKyAnKSB7IHZhciBvcCcgKyAoJGx2bCkgKyAnID0gJyArICgkZXhjbHVzaXZlKSArICcgPyBcXCcnICsgKCRvcCkgKyAnXFwnIDogXFwnJyArICgkb3ApICsgJz1cXCc7ICc7XG4gICAgaWYgKCRzY2hlbWEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgJGVycm9yS2V5d29yZCA9ICRleGNsdXNpdmVLZXl3b3JkO1xuICAgICAgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGV4Y2x1c2l2ZUtleXdvcmQ7XG4gICAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hVmFsdWVFeGNsO1xuICAgICAgJGlzRGF0YSA9ICRpc0RhdGFFeGNsO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgJGV4Y2xJc051bWJlciA9IHR5cGVvZiAkc2NoZW1hRXhjbCA9PSAnbnVtYmVyJyxcbiAgICAgICRvcFN0ciA9ICRvcDtcbiAgICBpZiAoJGV4Y2xJc051bWJlciAmJiAkaXNEYXRhKSB7XG4gICAgICB2YXIgJG9wRXhwciA9ICdcXCcnICsgJG9wU3RyICsgJ1xcJyc7XG4gICAgICBvdXQgKz0gJyBpZiAoICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ251bWJlclxcJykgfHwgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnICggJyArICgkc2NoZW1hVmFsdWUpICsgJyA9PT0gdW5kZWZpbmVkIHx8ICcgKyAoJHNjaGVtYUV4Y2wpICsgJyAnICsgKCRvcCkgKyAnPSAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnID8gJyArICgkZGF0YSkgKyAnICcgKyAoJG5vdE9wKSArICc9ICcgKyAoJHNjaGVtYUV4Y2wpICsgJyA6ICcgKyAoJGRhdGEpICsgJyAnICsgKCRub3RPcCkgKyAnICcgKyAoJHNjaGVtYVZhbHVlKSArICcgKSB8fCAnICsgKCRkYXRhKSArICcgIT09ICcgKyAoJGRhdGEpICsgJykgeyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoJGV4Y2xJc051bWJlciAmJiAkc2NoZW1hID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgJGV4Y2x1c2l2ZSA9IHRydWU7XG4gICAgICAgICRlcnJvcktleXdvcmQgPSAkZXhjbHVzaXZlS2V5d29yZDtcbiAgICAgICAgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGV4Y2x1c2l2ZUtleXdvcmQ7XG4gICAgICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWFFeGNsO1xuICAgICAgICAkbm90T3AgKz0gJz0nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCRleGNsSXNOdW1iZXIpICRzY2hlbWFWYWx1ZSA9IE1hdGhbJGlzTWF4ID8gJ21pbicgOiAnbWF4J10oJHNjaGVtYUV4Y2wsICRzY2hlbWEpO1xuICAgICAgICBpZiAoJHNjaGVtYUV4Y2wgPT09ICgkZXhjbElzTnVtYmVyID8gJHNjaGVtYVZhbHVlIDogdHJ1ZSkpIHtcbiAgICAgICAgICAkZXhjbHVzaXZlID0gdHJ1ZTtcbiAgICAgICAgICAkZXJyb3JLZXl3b3JkID0gJGV4Y2x1c2l2ZUtleXdvcmQ7XG4gICAgICAgICAgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGV4Y2x1c2l2ZUtleXdvcmQ7XG4gICAgICAgICAgJG5vdE9wICs9ICc9JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkZXhjbHVzaXZlID0gZmFsc2U7XG4gICAgICAgICAgJG9wU3RyICs9ICc9JztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyICRvcEV4cHIgPSAnXFwnJyArICRvcFN0ciArICdcXCcnO1xuICAgICAgb3V0ICs9ICcgaWYgKCAnO1xuICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgb3V0ICs9ICcgKCcgKyAoJHNjaGVtYVZhbHVlKSArICcgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPSBcXCdudW1iZXJcXCcpIHx8ICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAnICsgKCRkYXRhKSArICcgJyArICgkbm90T3ApICsgJyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnIHx8ICcgKyAoJGRhdGEpICsgJyAhPT0gJyArICgkZGF0YSkgKyAnKSB7ICc7XG4gICAgfVxuICB9XG4gICRlcnJvcktleXdvcmQgPSAkZXJyb3JLZXl3b3JkIHx8ICRrZXl3b3JkO1xuICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJGVycm9yS2V5d29yZCB8fCAnX2xpbWl0JykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBjb21wYXJpc29uOiAnICsgKCRvcEV4cHIpICsgJywgbGltaXQ6ICcgKyAoJHNjaGVtYVZhbHVlKSArICcsIGV4Y2x1c2l2ZTogJyArICgkZXhjbHVzaXZlKSArICcgfSAnO1xuICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgYmUgJyArICgkb3BTdHIpICsgJyAnO1xuICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgb3V0ICs9ICdcXCcgKyAnICsgKCRzY2hlbWFWYWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYVZhbHVlKSArICdcXCcnO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICBvdXQgKz0gJyAsIHNjaGVtYTogICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ3ZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKCRzY2hlbWEpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgICAgICAgICAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHt9ICc7XG4gIH1cbiAgdmFyIF9fZXJyID0gb3V0O1xuICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgIGlmIChpdC5hc3luYykge1xuICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgfVxuICBvdXQgKz0gJyB9ICc7XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9fbGltaXQuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfX2xpbWl0SXRlbXMoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRlcnJvcktleXdvcmQ7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkaXNEYXRhID0gaXQub3B0cy4kZGF0YSAmJiAkc2NoZW1hICYmICRzY2hlbWEuJGRhdGEsXG4gICAgJHNjaGVtYVZhbHVlO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciBzY2hlbWEnICsgKCRsdmwpICsgJyA9ICcgKyAoaXQudXRpbC5nZXREYXRhKCRzY2hlbWEuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFycikpICsgJzsgJztcbiAgICAkc2NoZW1hVmFsdWUgPSAnc2NoZW1hJyArICRsdmw7XG4gIH0gZWxzZSB7XG4gICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYTtcbiAgfVxuICBpZiAoISgkaXNEYXRhIHx8IHR5cGVvZiAkc2NoZW1hID09ICdudW1iZXInKSkge1xuICAgIHRocm93IG5ldyBFcnJvcigka2V5d29yZCArICcgbXVzdCBiZSBudW1iZXInKTtcbiAgfVxuICB2YXIgJG9wID0gJGtleXdvcmQgPT0gJ21heEl0ZW1zJyA/ICc+JyA6ICc8JztcbiAgb3V0ICs9ICdpZiAoICc7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgKCcgKyAoJHNjaGVtYVZhbHVlKSArICcgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPSBcXCdudW1iZXJcXCcpIHx8ICc7XG4gIH1cbiAgb3V0ICs9ICcgJyArICgkZGF0YSkgKyAnLmxlbmd0aCAnICsgKCRvcCkgKyAnICcgKyAoJHNjaGVtYVZhbHVlKSArICcpIHsgJztcbiAgdmFyICRlcnJvcktleXdvcmQgPSAka2V5d29yZDtcbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ19saW1pdEl0ZW1zJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBsaW1pdDogJyArICgkc2NoZW1hVmFsdWUpICsgJyB9ICc7XG4gICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBOT1QgaGF2ZSAnO1xuICAgICAgaWYgKCRrZXl3b3JkID09ICdtYXhJdGVtcycpIHtcbiAgICAgICAgb3V0ICs9ICdtb3JlJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnZmV3ZXInO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgdGhhbiAnO1xuICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgb3V0ICs9ICdcXCcgKyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICsgXFwnJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArICgkc2NoZW1hKTtcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIGl0ZW1zXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnfSAnO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvX2xpbWl0SXRlbXMuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfX2xpbWl0TGVuZ3RoKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZXJyb3JLZXl3b3JkO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgaWYgKCEoJGlzRGF0YSB8fCB0eXBlb2YgJHNjaGVtYSA9PSAnbnVtYmVyJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJGtleXdvcmQgKyAnIG11c3QgYmUgbnVtYmVyJyk7XG4gIH1cbiAgdmFyICRvcCA9ICRrZXl3b3JkID09ICdtYXhMZW5ndGgnID8gJz4nIDogJzwnO1xuICBvdXQgKz0gJ2lmICggJztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ251bWJlclxcJykgfHwgJztcbiAgfVxuICBpZiAoaXQub3B0cy51bmljb2RlID09PSBmYWxzZSkge1xuICAgIG91dCArPSAnICcgKyAoJGRhdGEpICsgJy5sZW5ndGggJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB1Y3MybGVuZ3RoKCcgKyAoJGRhdGEpICsgJykgJztcbiAgfVxuICBvdXQgKz0gJyAnICsgKCRvcCkgKyAnICcgKyAoJHNjaGVtYVZhbHVlKSArICcpIHsgJztcbiAgdmFyICRlcnJvcktleXdvcmQgPSAka2V5d29yZDtcbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ19saW1pdExlbmd0aCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbGltaXQ6ICcgKyAoJHNjaGVtYVZhbHVlKSArICcgfSAnO1xuICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgTk9UIGJlICc7XG4gICAgICBpZiAoJGtleXdvcmQgPT0gJ21heExlbmd0aCcpIHtcbiAgICAgICAgb3V0ICs9ICdsb25nZXInO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICdzaG9ydGVyJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIHRoYW4gJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAnXFwnICsgJyArICgkc2NoZW1hVmFsdWUpICsgJyArIFxcJyc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyBjaGFyYWN0ZXJzXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnfSAnO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvX2xpbWl0TGVuZ3RoLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX19saW1pdFByb3BlcnRpZXMoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRlcnJvcktleXdvcmQ7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkaXNEYXRhID0gaXQub3B0cy4kZGF0YSAmJiAkc2NoZW1hICYmICRzY2hlbWEuJGRhdGEsXG4gICAgJHNjaGVtYVZhbHVlO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciBzY2hlbWEnICsgKCRsdmwpICsgJyA9ICcgKyAoaXQudXRpbC5nZXREYXRhKCRzY2hlbWEuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFycikpICsgJzsgJztcbiAgICAkc2NoZW1hVmFsdWUgPSAnc2NoZW1hJyArICRsdmw7XG4gIH0gZWxzZSB7XG4gICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYTtcbiAgfVxuICBpZiAoISgkaXNEYXRhIHx8IHR5cGVvZiAkc2NoZW1hID09ICdudW1iZXInKSkge1xuICAgIHRocm93IG5ldyBFcnJvcigka2V5d29yZCArICcgbXVzdCBiZSBudW1iZXInKTtcbiAgfVxuICB2YXIgJG9wID0gJGtleXdvcmQgPT0gJ21heFByb3BlcnRpZXMnID8gJz4nIDogJzwnO1xuICBvdXQgKz0gJ2lmICggJztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ251bWJlclxcJykgfHwgJztcbiAgfVxuICBvdXQgKz0gJyBPYmplY3Qua2V5cygnICsgKCRkYXRhKSArICcpLmxlbmd0aCAnICsgKCRvcCkgKyAnICcgKyAoJHNjaGVtYVZhbHVlKSArICcpIHsgJztcbiAgdmFyICRlcnJvcktleXdvcmQgPSAka2V5d29yZDtcbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ19saW1pdFByb3BlcnRpZXMnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGxpbWl0OiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIE5PVCBoYXZlICc7XG4gICAgICBpZiAoJGtleXdvcmQgPT0gJ21heFByb3BlcnRpZXMnKSB7XG4gICAgICAgIG91dCArPSAnbW9yZSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJ2Zld2VyJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIHRoYW4gJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAnXFwnICsgJyArICgkc2NoZW1hVmFsdWUpICsgJyArIFxcJyc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyBwcm9wZXJ0aWVzXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnfSAnO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvX2xpbWl0UHJvcGVydGllcy5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9hbGxPZihpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gIHZhciAkY2xvc2luZ0JyYWNlcyA9ICcnO1xuICAkaXQubGV2ZWwrKztcbiAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICB2YXIgJGN1cnJlbnRCYXNlSWQgPSAkaXQuYmFzZUlkLFxuICAgICRhbGxTY2hlbWFzRW1wdHkgPSB0cnVlO1xuICB2YXIgYXJyMSA9ICRzY2hlbWE7XG4gIGlmIChhcnIxKSB7XG4gICAgdmFyICRzY2gsICRpID0gLTEsXG4gICAgICBsMSA9IGFycjEubGVuZ3RoIC0gMTtcbiAgICB3aGlsZSAoJGkgPCBsMSkge1xuICAgICAgJHNjaCA9IGFycjFbJGkgKz0gMV07XG4gICAgICBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2ggPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaCkubGVuZ3RoID4gMCkgfHwgJHNjaCA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2gsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgICAgICRhbGxTY2hlbWFzRW1wdHkgPSBmYWxzZTtcbiAgICAgICAgJGl0LnNjaGVtYSA9ICRzY2g7XG4gICAgICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGggKyAnWycgKyAkaSArICddJztcbiAgICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aCArICcvJyArICRpO1xuICAgICAgICBvdXQgKz0gJyAgJyArIChpdC52YWxpZGF0ZSgkaXQpKSArICcgJztcbiAgICAgICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJykgeyAnO1xuICAgICAgICAgICRjbG9zaW5nQnJhY2VzICs9ICd9JztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIGlmICgkYWxsU2NoZW1hc0VtcHR5KSB7XG4gICAgICBvdXQgKz0gJyBpZiAodHJ1ZSkgeyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCRjbG9zaW5nQnJhY2VzLnNsaWNlKDAsIC0xKSkgKyAnICc7XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvYWxsT2YuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfYW55T2YoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICB2YXIgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgdmFyICRub0VtcHR5U2NoZW1hID0gJHNjaGVtYS5ldmVyeShmdW5jdGlvbigkc2NoKSB7XG4gICAgcmV0dXJuIChpdC5vcHRzLnN0cmljdEtleXdvcmRzID8gKHR5cGVvZiAkc2NoID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRzY2gpLmxlbmd0aCA+IDApIHx8ICRzY2ggPT09IGZhbHNlIDogaXQudXRpbC5zY2hlbWFIYXNSdWxlcygkc2NoLCBpdC5SVUxFUy5hbGwpKTtcbiAgfSk7XG4gIGlmICgkbm9FbXB0eVNjaGVtYSkge1xuICAgIHZhciAkY3VycmVudEJhc2VJZCA9ICRpdC5iYXNlSWQ7XG4gICAgb3V0ICs9ICcgdmFyICcgKyAoJGVycnMpICsgJyA9IGVycm9yczsgdmFyICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgICc7XG4gICAgdmFyICR3YXNDb21wb3NpdGUgPSBpdC5jb21wb3NpdGVSdWxlO1xuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9IHRydWU7XG4gICAgdmFyIGFycjEgPSAkc2NoZW1hO1xuICAgIGlmIChhcnIxKSB7XG4gICAgICB2YXIgJHNjaCwgJGkgPSAtMSxcbiAgICAgICAgbDEgPSBhcnIxLmxlbmd0aCAtIDE7XG4gICAgICB3aGlsZSAoJGkgPCBsMSkge1xuICAgICAgICAkc2NoID0gYXJyMVskaSArPSAxXTtcbiAgICAgICAgJGl0LnNjaGVtYSA9ICRzY2g7XG4gICAgICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGggKyAnWycgKyAkaSArICddJztcbiAgICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aCArICcvJyArICRpO1xuICAgICAgICBvdXQgKz0gJyAgJyArIChpdC52YWxpZGF0ZSgkaXQpKSArICcgJztcbiAgICAgICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gJyArICgkdmFsaWQpICsgJyB8fCAnICsgKCRuZXh0VmFsaWQpICsgJzsgaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICc7XG4gICAgICAgICRjbG9zaW5nQnJhY2VzICs9ICd9JztcbiAgICAgIH1cbiAgICB9XG4gICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gJHdhc0NvbXBvc2l0ZTtcbiAgICBvdXQgKz0gJyAnICsgKCRjbG9zaW5nQnJhY2VzKSArICcgaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdhbnlPZicpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHt9ICc7XG4gICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgbWF0Y2ggc29tZSBzY2hlbWEgaW4gYW55T2ZcXCcgJztcbiAgICAgIH1cbiAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcge30gJztcbiAgICB9XG4gICAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcih2RXJyb3JzKTsgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IHZFcnJvcnM7IHJldHVybiBmYWxzZTsgJztcbiAgICAgIH1cbiAgICB9XG4gICAgb3V0ICs9ICcgfSBlbHNlIHsgIGVycm9ycyA9ICcgKyAoJGVycnMpICsgJzsgaWYgKHZFcnJvcnMgIT09IG51bGwpIHsgaWYgKCcgKyAoJGVycnMpICsgJykgdkVycm9ycy5sZW5ndGggPSAnICsgKCRlcnJzKSArICc7IGVsc2UgdkVycm9ycyA9IG51bGw7IH0gJztcbiAgICBpZiAoaXQub3B0cy5hbGxFcnJvcnMpIHtcbiAgICAgIG91dCArPSAnIH0gJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvYW55T2YuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfY29tbWVudChpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkY29tbWVudCA9IGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJHNjaGVtYSk7XG4gIGlmIChpdC5vcHRzLiRjb21tZW50ID09PSB0cnVlKSB7XG4gICAgb3V0ICs9ICcgY29uc29sZS5sb2coJyArICgkY29tbWVudCkgKyAnKTsnO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBpdC5vcHRzLiRjb21tZW50ID09ICdmdW5jdGlvbicpIHtcbiAgICBvdXQgKz0gJyBzZWxmLl9vcHRzLiRjb21tZW50KCcgKyAoJGNvbW1lbnQpICsgJywgJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnLCB2YWxpZGF0ZS5yb290LnNjaGVtYSk7JztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2NvbW1lbnQuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfY29uc3QoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgaWYgKCEkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnOyc7XG4gIH1cbiAgb3V0ICs9ICd2YXIgJyArICgkdmFsaWQpICsgJyA9IGVxdWFsKCcgKyAoJGRhdGEpICsgJywgc2NoZW1hJyArICgkbHZsKSArICcpOyBpZiAoIScgKyAoJHZhbGlkKSArICcpIHsgICAnO1xuICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ2NvbnN0JykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBhbGxvd2VkVmFsdWU6IHNjaGVtYScgKyAoJGx2bCkgKyAnIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGJlIGVxdWFsIHRvIGNvbnN0YW50XFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB7fSAnO1xuICB9XG4gIHZhciBfX2VyciA9IG91dDtcbiAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gIH1cbiAgb3V0ICs9ICcgfSc7XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9jb25zdC5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9jb250YWlucyhpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmw7XG4gIHZhciAkZXJycyA9ICdlcnJzX18nICsgJGx2bDtcbiAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gIHZhciAkY2xvc2luZ0JyYWNlcyA9ICcnO1xuICAkaXQubGV2ZWwrKztcbiAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICB2YXIgJGlkeCA9ICdpJyArICRsdmwsXG4gICAgJGRhdGFOeHQgPSAkaXQuZGF0YUxldmVsID0gaXQuZGF0YUxldmVsICsgMSxcbiAgICAkbmV4dERhdGEgPSAnZGF0YScgKyAkZGF0YU54dCxcbiAgICAkY3VycmVudEJhc2VJZCA9IGl0LmJhc2VJZCxcbiAgICAkbm9uRW1wdHlTY2hlbWEgPSAoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHNjaGVtYSA9PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cygkc2NoZW1hKS5sZW5ndGggPiAwKSB8fCAkc2NoZW1hID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHNjaGVtYSwgaXQuUlVMRVMuYWxsKSk7XG4gIG91dCArPSAndmFyICcgKyAoJGVycnMpICsgJyA9IGVycm9yczt2YXIgJyArICgkdmFsaWQpICsgJzsnO1xuICBpZiAoJG5vbkVtcHR5U2NoZW1hKSB7XG4gICAgdmFyICR3YXNDb21wb3NpdGUgPSBpdC5jb21wb3NpdGVSdWxlO1xuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9IHRydWU7XG4gICAgJGl0LnNjaGVtYSA9ICRzY2hlbWE7XG4gICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aDtcbiAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoO1xuICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0VmFsaWQpICsgJyA9IGZhbHNlOyBmb3IgKHZhciAnICsgKCRpZHgpICsgJyA9IDA7ICcgKyAoJGlkeCkgKyAnIDwgJyArICgkZGF0YSkgKyAnLmxlbmd0aDsgJyArICgkaWR4KSArICcrKykgeyAnO1xuICAgICRpdC5lcnJvclBhdGggPSBpdC51dGlsLmdldFBhdGhFeHByKGl0LmVycm9yUGF0aCwgJGlkeCwgaXQub3B0cy5qc29uUG9pbnRlcnMsIHRydWUpO1xuICAgIHZhciAkcGFzc0RhdGEgPSAkZGF0YSArICdbJyArICRpZHggKyAnXSc7XG4gICAgJGl0LmRhdGFQYXRoQXJyWyRkYXRhTnh0XSA9ICRpZHg7XG4gICAgdmFyICRjb2RlID0gaXQudmFsaWRhdGUoJGl0KTtcbiAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgaWYgKGl0LnV0aWwudmFyT2NjdXJlbmNlcygkY29kZSwgJG5leHREYXRhKSA8IDIpIHtcbiAgICAgIG91dCArPSAnICcgKyAoaXQudXRpbC52YXJSZXBsYWNlKCRjb2RlLCAkbmV4dERhdGEsICRwYXNzRGF0YSkpICsgJyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YXIgJyArICgkbmV4dERhdGEpICsgJyA9ICcgKyAoJHBhc3NEYXRhKSArICc7ICcgKyAoJGNvZGUpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyBpZiAoJyArICgkbmV4dFZhbGlkKSArICcpIGJyZWFrOyB9ICAnO1xuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9ICR3YXNDb21wb3NpdGU7XG4gICAgb3V0ICs9ICcgJyArICgkY2xvc2luZ0JyYWNlcykgKyAnIGlmICghJyArICgkbmV4dFZhbGlkKSArICcpIHsnO1xuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIGlmICgnICsgKCRkYXRhKSArICcubGVuZ3RoID09IDApIHsnO1xuICB9XG4gIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnY29udGFpbnMnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7fSAnO1xuICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgY29udGFpbiBhIHZhbGlkIGl0ZW1cXCcgJztcbiAgICB9XG4gICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHt9ICc7XG4gIH1cbiAgdmFyIF9fZXJyID0gb3V0O1xuICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgIGlmIChpdC5hc3luYykge1xuICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgfVxuICBvdXQgKz0gJyB9IGVsc2UgeyAnO1xuICBpZiAoJG5vbkVtcHR5U2NoZW1hKSB7XG4gICAgb3V0ICs9ICcgIGVycm9ycyA9ICcgKyAoJGVycnMpICsgJzsgaWYgKHZFcnJvcnMgIT09IG51bGwpIHsgaWYgKCcgKyAoJGVycnMpICsgJykgdkVycm9ycy5sZW5ndGggPSAnICsgKCRlcnJzKSArICc7IGVsc2UgdkVycm9ycyA9IG51bGw7IH0gJztcbiAgfVxuICBpZiAoaXQub3B0cy5hbGxFcnJvcnMpIHtcbiAgICBvdXQgKz0gJyB9ICc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9jb250YWlucy5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9jdXN0b20oaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRlcnJvcktleXdvcmQ7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkdmFsaWQgPSAndmFsaWQnICsgJGx2bDtcbiAgdmFyICRlcnJzID0gJ2VycnNfXycgKyAkbHZsO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgdmFyICRydWxlID0gdGhpcyxcbiAgICAkZGVmaW5pdGlvbiA9ICdkZWZpbml0aW9uJyArICRsdmwsXG4gICAgJHJEZWYgPSAkcnVsZS5kZWZpbml0aW9uLFxuICAgICRjbG9zaW5nQnJhY2VzID0gJyc7XG4gIHZhciAkY29tcGlsZSwgJGlubGluZSwgJG1hY3JvLCAkcnVsZVZhbGlkYXRlLCAkdmFsaWRhdGVDb2RlO1xuICBpZiAoJGlzRGF0YSAmJiAkckRlZi4kZGF0YSkge1xuICAgICR2YWxpZGF0ZUNvZGUgPSAna2V5d29yZFZhbGlkYXRlJyArICRsdmw7XG4gICAgdmFyICR2YWxpZGF0ZVNjaGVtYSA9ICRyRGVmLnZhbGlkYXRlU2NoZW1hO1xuICAgIG91dCArPSAnIHZhciAnICsgKCRkZWZpbml0aW9uKSArICcgPSBSVUxFUy5jdXN0b21bXFwnJyArICgka2V5d29yZCkgKyAnXFwnXS5kZWZpbml0aW9uOyB2YXIgJyArICgkdmFsaWRhdGVDb2RlKSArICcgPSAnICsgKCRkZWZpbml0aW9uKSArICcudmFsaWRhdGU7JztcbiAgfSBlbHNlIHtcbiAgICAkcnVsZVZhbGlkYXRlID0gaXQudXNlQ3VzdG9tUnVsZSgkcnVsZSwgJHNjaGVtYSwgaXQuc2NoZW1hLCBpdCk7XG4gICAgaWYgKCEkcnVsZVZhbGlkYXRlKSByZXR1cm47XG4gICAgJHNjaGVtYVZhbHVlID0gJ3ZhbGlkYXRlLnNjaGVtYScgKyAkc2NoZW1hUGF0aDtcbiAgICAkdmFsaWRhdGVDb2RlID0gJHJ1bGVWYWxpZGF0ZS5jb2RlO1xuICAgICRjb21waWxlID0gJHJEZWYuY29tcGlsZTtcbiAgICAkaW5saW5lID0gJHJEZWYuaW5saW5lO1xuICAgICRtYWNybyA9ICRyRGVmLm1hY3JvO1xuICB9XG4gIHZhciAkcnVsZUVycnMgPSAkdmFsaWRhdGVDb2RlICsgJy5lcnJvcnMnLFxuICAgICRpID0gJ2knICsgJGx2bCxcbiAgICAkcnVsZUVyciA9ICdydWxlRXJyJyArICRsdmwsXG4gICAgJGFzeW5jS2V5d29yZCA9ICRyRGVmLmFzeW5jO1xuICBpZiAoJGFzeW5jS2V5d29yZCAmJiAhaXQuYXN5bmMpIHRocm93IG5ldyBFcnJvcignYXN5bmMga2V5d29yZCBpbiBzeW5jIHNjaGVtYScpO1xuICBpZiAoISgkaW5saW5lIHx8ICRtYWNybykpIHtcbiAgICBvdXQgKz0gJycgKyAoJHJ1bGVFcnJzKSArICcgPSBudWxsOyc7XG4gIH1cbiAgb3V0ICs9ICd2YXIgJyArICgkZXJycykgKyAnID0gZXJyb3JzO3ZhciAnICsgKCR2YWxpZCkgKyAnOyc7XG4gIGlmICgkaXNEYXRhICYmICRyRGVmLiRkYXRhKSB7XG4gICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgIG91dCArPSAnIGlmICgnICsgKCRzY2hlbWFWYWx1ZSkgKyAnID09PSB1bmRlZmluZWQpIHsgJyArICgkdmFsaWQpICsgJyA9IHRydWU7IH0gZWxzZSB7ICc7XG4gICAgaWYgKCR2YWxpZGF0ZVNjaGVtYSkge1xuICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgICAgb3V0ICs9ICcgJyArICgkdmFsaWQpICsgJyA9ICcgKyAoJGRlZmluaXRpb24pICsgJy52YWxpZGF0ZVNjaGVtYSgnICsgKCRzY2hlbWFWYWx1ZSkgKyAnKTsgaWYgKCcgKyAoJHZhbGlkKSArICcpIHsgJztcbiAgICB9XG4gIH1cbiAgaWYgKCRpbmxpbmUpIHtcbiAgICBpZiAoJHJEZWYuc3RhdGVtZW50cykge1xuICAgICAgb3V0ICs9ICcgJyArICgkcnVsZVZhbGlkYXRlLnZhbGlkYXRlKSArICcgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgJyArICgkdmFsaWQpICsgJyA9ICcgKyAoJHJ1bGVWYWxpZGF0ZS52YWxpZGF0ZSkgKyAnOyAnO1xuICAgIH1cbiAgfSBlbHNlIGlmICgkbWFjcm8pIHtcbiAgICB2YXIgJGl0ID0gaXQudXRpbC5jb3B5KGl0KTtcbiAgICB2YXIgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgICAkaXQubGV2ZWwrKztcbiAgICB2YXIgJG5leHRWYWxpZCA9ICd2YWxpZCcgKyAkaXQubGV2ZWw7XG4gICAgJGl0LnNjaGVtYSA9ICRydWxlVmFsaWRhdGUudmFsaWRhdGU7XG4gICAgJGl0LnNjaGVtYVBhdGggPSAnJztcbiAgICB2YXIgJHdhc0NvbXBvc2l0ZSA9IGl0LmNvbXBvc2l0ZVJ1bGU7XG4gICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gdHJ1ZTtcbiAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpLnJlcGxhY2UoL3ZhbGlkYXRlXFwuc2NoZW1hL2csICR2YWxpZGF0ZUNvZGUpO1xuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9ICR3YXNDb21wb3NpdGU7XG4gICAgb3V0ICs9ICcgJyArICgkY29kZSk7XG4gIH0gZWxzZSB7XG4gICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgIG91dCA9ICcnO1xuICAgIG91dCArPSAnICAnICsgKCR2YWxpZGF0ZUNvZGUpICsgJy5jYWxsKCAnO1xuICAgIGlmIChpdC5vcHRzLnBhc3NDb250ZXh0KSB7XG4gICAgICBvdXQgKz0gJ3RoaXMnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJ3NlbGYnO1xuICAgIH1cbiAgICBpZiAoJGNvbXBpbGUgfHwgJHJEZWYuc2NoZW1hID09PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgLCAnICsgKCRkYXRhKSArICcgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgLCAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICwgJyArICgkZGF0YSkgKyAnICwgdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgLCAoZGF0YVBhdGggfHwgXFwnXFwnKSc7XG4gICAgaWYgKGl0LmVycm9yUGF0aCAhPSAnXCJcIicpIHtcbiAgICAgIG91dCArPSAnICsgJyArIChpdC5lcnJvclBhdGgpO1xuICAgIH1cbiAgICB2YXIgJHBhcmVudERhdGEgPSAkZGF0YUx2bCA/ICdkYXRhJyArICgoJGRhdGFMdmwgLSAxKSB8fCAnJykgOiAncGFyZW50RGF0YScsXG4gICAgICAkcGFyZW50RGF0YVByb3BlcnR5ID0gJGRhdGFMdmwgPyBpdC5kYXRhUGF0aEFyclskZGF0YUx2bF0gOiAncGFyZW50RGF0YVByb3BlcnR5JztcbiAgICBvdXQgKz0gJyAsICcgKyAoJHBhcmVudERhdGEpICsgJyAsICcgKyAoJHBhcmVudERhdGFQcm9wZXJ0eSkgKyAnICwgcm9vdERhdGEgKSAgJztcbiAgICB2YXIgZGVmX2NhbGxSdWxlVmFsaWRhdGUgPSBvdXQ7XG4gICAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgICBpZiAoJHJEZWYuZXJyb3JzID09PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgJyArICgkdmFsaWQpICsgJyA9ICc7XG4gICAgICBpZiAoJGFzeW5jS2V5d29yZCkge1xuICAgICAgICBvdXQgKz0gJ2F3YWl0ICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJycgKyAoZGVmX2NhbGxSdWxlVmFsaWRhdGUpICsgJzsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCRhc3luY0tleXdvcmQpIHtcbiAgICAgICAgJHJ1bGVFcnJzID0gJ2N1c3RvbUVycm9ycycgKyAkbHZsO1xuICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkcnVsZUVycnMpICsgJyA9IG51bGw7IHRyeSB7ICcgKyAoJHZhbGlkKSArICcgPSBhd2FpdCAnICsgKGRlZl9jYWxsUnVsZVZhbGlkYXRlKSArICc7IH0gY2F0Y2ggKGUpIHsgJyArICgkdmFsaWQpICsgJyA9IGZhbHNlOyBpZiAoZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikgJyArICgkcnVsZUVycnMpICsgJyA9IGUuZXJyb3JzOyBlbHNlIHRocm93IGU7IH0gJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnICcgKyAoJHJ1bGVFcnJzKSArICcgPSBudWxsOyAnICsgKCR2YWxpZCkgKyAnID0gJyArIChkZWZfY2FsbFJ1bGVWYWxpZGF0ZSkgKyAnOyAnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAoJHJEZWYubW9kaWZ5aW5nKSB7XG4gICAgb3V0ICs9ICcgaWYgKCcgKyAoJHBhcmVudERhdGEpICsgJykgJyArICgkZGF0YSkgKyAnID0gJyArICgkcGFyZW50RGF0YSkgKyAnWycgKyAoJHBhcmVudERhdGFQcm9wZXJ0eSkgKyAnXTsnO1xuICB9XG4gIG91dCArPSAnJyArICgkY2xvc2luZ0JyYWNlcyk7XG4gIGlmICgkckRlZi52YWxpZCkge1xuICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICBvdXQgKz0gJyBpZiAodHJ1ZSkgeyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyBpZiAoICc7XG4gICAgaWYgKCRyRGVmLnZhbGlkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIG91dCArPSAnICEnO1xuICAgICAgaWYgKCRtYWNybykge1xuICAgICAgICBvdXQgKz0gJycgKyAoJG5leHRWYWxpZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHZhbGlkKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgJyArICghJHJEZWYudmFsaWQpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJykgeyAnO1xuICAgICRlcnJvcktleXdvcmQgPSAkcnVsZS5rZXl3b3JkO1xuICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICBvdXQgPSAnJztcbiAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgkZXJyb3JLZXl3b3JkIHx8ICdjdXN0b20nKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGtleXdvcmQ6IFxcJycgKyAoJHJ1bGUua2V5d29yZCkgKyAnXFwnIH0gJztcbiAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBwYXNzIFwiJyArICgkcnVsZS5rZXl3b3JkKSArICdcIiBrZXl3b3JkIHZhbGlkYXRpb25cXCcgJztcbiAgICAgIH1cbiAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcge30gJztcbiAgICB9XG4gICAgdmFyIF9fZXJyID0gb3V0O1xuICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgIH1cbiAgICB2YXIgZGVmX2N1c3RvbUVycm9yID0gb3V0O1xuICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgaWYgKCRpbmxpbmUpIHtcbiAgICAgIGlmICgkckRlZi5lcnJvcnMpIHtcbiAgICAgICAgaWYgKCRyRGVmLmVycm9ycyAhPSAnZnVsbCcpIHtcbiAgICAgICAgICBvdXQgKz0gJyAgZm9yICh2YXIgJyArICgkaSkgKyAnPScgKyAoJGVycnMpICsgJzsgJyArICgkaSkgKyAnPGVycm9yczsgJyArICgkaSkgKyAnKyspIHsgdmFyICcgKyAoJHJ1bGVFcnIpICsgJyA9IHZFcnJvcnNbJyArICgkaSkgKyAnXTsgaWYgKCcgKyAoJHJ1bGVFcnIpICsgJy5kYXRhUGF0aCA9PT0gdW5kZWZpbmVkKSAnICsgKCRydWxlRXJyKSArICcuZGF0YVBhdGggPSAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICc7IGlmICgnICsgKCRydWxlRXJyKSArICcuc2NoZW1hUGF0aCA9PT0gdW5kZWZpbmVkKSB7ICcgKyAoJHJ1bGVFcnIpICsgJy5zY2hlbWFQYXRoID0gXCInICsgKCRlcnJTY2hlbWFQYXRoKSArICdcIjsgfSAnO1xuICAgICAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnICcgKyAoJHJ1bGVFcnIpICsgJy5zY2hlbWEgPSAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnOyAnICsgKCRydWxlRXJyKSArICcuZGF0YSA9ICcgKyAoJGRhdGEpICsgJzsgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoJHJEZWYuZXJyb3JzID09PSBmYWxzZSkge1xuICAgICAgICAgIG91dCArPSAnICcgKyAoZGVmX2N1c3RvbUVycm9yKSArICcgJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXQgKz0gJyBpZiAoJyArICgkZXJycykgKyAnID09IGVycm9ycykgeyAnICsgKGRlZl9jdXN0b21FcnJvcikgKyAnIH0gZWxzZSB7ICBmb3IgKHZhciAnICsgKCRpKSArICc9JyArICgkZXJycykgKyAnOyAnICsgKCRpKSArICc8ZXJyb3JzOyAnICsgKCRpKSArICcrKykgeyB2YXIgJyArICgkcnVsZUVycikgKyAnID0gdkVycm9yc1snICsgKCRpKSArICddOyBpZiAoJyArICgkcnVsZUVycikgKyAnLmRhdGFQYXRoID09PSB1bmRlZmluZWQpICcgKyAoJHJ1bGVFcnIpICsgJy5kYXRhUGF0aCA9IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJzsgaWYgKCcgKyAoJHJ1bGVFcnIpICsgJy5zY2hlbWFQYXRoID09PSB1bmRlZmluZWQpIHsgJyArICgkcnVsZUVycikgKyAnLnNjaGVtYVBhdGggPSBcIicgKyAoJGVyclNjaGVtYVBhdGgpICsgJ1wiOyB9ICc7XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArICgkcnVsZUVycikgKyAnLnNjaGVtYSA9ICcgKyAoJHNjaGVtYVZhbHVlKSArICc7ICcgKyAoJHJ1bGVFcnIpICsgJy5kYXRhID0gJyArICgkZGF0YSkgKyAnOyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyB9IH0gJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoJG1hY3JvKSB7XG4gICAgICBvdXQgKz0gJyAgIHZhciBlcnIgPSAgICc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJGVycm9yS2V5d29yZCB8fCAnY3VzdG9tJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBrZXl3b3JkOiBcXCcnICsgKCRydWxlLmtleXdvcmQpICsgJ1xcJyB9ICc7XG4gICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIHBhc3MgXCInICsgKCRydWxlLmtleXdvcmQpICsgJ1wiIGtleXdvcmQgdmFsaWRhdGlvblxcJyAnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IodkVycm9ycyk7ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gdkVycm9yczsgcmV0dXJuIGZhbHNlOyAnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICgkckRlZi5lcnJvcnMgPT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnICcgKyAoZGVmX2N1c3RvbUVycm9yKSArICcgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIGlmIChBcnJheS5pc0FycmF5KCcgKyAoJHJ1bGVFcnJzKSArICcpKSB7IGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gJyArICgkcnVsZUVycnMpICsgJzsgZWxzZSB2RXJyb3JzID0gdkVycm9ycy5jb25jYXQoJyArICgkcnVsZUVycnMpICsgJyk7IGVycm9ycyA9IHZFcnJvcnMubGVuZ3RoOyAgZm9yICh2YXIgJyArICgkaSkgKyAnPScgKyAoJGVycnMpICsgJzsgJyArICgkaSkgKyAnPGVycm9yczsgJyArICgkaSkgKyAnKyspIHsgdmFyICcgKyAoJHJ1bGVFcnIpICsgJyA9IHZFcnJvcnNbJyArICgkaSkgKyAnXTsgaWYgKCcgKyAoJHJ1bGVFcnIpICsgJy5kYXRhUGF0aCA9PT0gdW5kZWZpbmVkKSAnICsgKCRydWxlRXJyKSArICcuZGF0YVBhdGggPSAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICc7ICAnICsgKCRydWxlRXJyKSArICcuc2NoZW1hUGF0aCA9IFwiJyArICgkZXJyU2NoZW1hUGF0aCkgKyAnXCI7ICAnO1xuICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgJyArICgkcnVsZUVycikgKyAnLnNjaGVtYSA9ICcgKyAoJHNjaGVtYVZhbHVlKSArICc7ICcgKyAoJHJ1bGVFcnIpICsgJy5kYXRhID0gJyArICgkZGF0YSkgKyAnOyAnO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIH0gfSBlbHNlIHsgJyArIChkZWZfY3VzdG9tRXJyb3IpICsgJyB9ICc7XG4gICAgICB9XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvY3VzdG9tLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2RlcGVuZGVuY2llcyhpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICB2YXIgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgdmFyICRzY2hlbWFEZXBzID0ge30sXG4gICAgJHByb3BlcnR5RGVwcyA9IHt9LFxuICAgICRvd25Qcm9wZXJ0aWVzID0gaXQub3B0cy5vd25Qcm9wZXJ0aWVzO1xuICBmb3IgKCRwcm9wZXJ0eSBpbiAkc2NoZW1hKSB7XG4gICAgaWYgKCRwcm9wZXJ0eSA9PSAnX19wcm90b19fJykgY29udGludWU7XG4gICAgdmFyICRzY2ggPSAkc2NoZW1hWyRwcm9wZXJ0eV07XG4gICAgdmFyICRkZXBzID0gQXJyYXkuaXNBcnJheSgkc2NoKSA/ICRwcm9wZXJ0eURlcHMgOiAkc2NoZW1hRGVwcztcbiAgICAkZGVwc1skcHJvcGVydHldID0gJHNjaDtcbiAgfVxuICBvdXQgKz0gJ3ZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7JztcbiAgdmFyICRjdXJyZW50RXJyb3JQYXRoID0gaXQuZXJyb3JQYXRoO1xuICBvdXQgKz0gJ3ZhciBtaXNzaW5nJyArICgkbHZsKSArICc7JztcbiAgZm9yICh2YXIgJHByb3BlcnR5IGluICRwcm9wZXJ0eURlcHMpIHtcbiAgICAkZGVwcyA9ICRwcm9wZXJ0eURlcHNbJHByb3BlcnR5XTtcbiAgICBpZiAoJGRlcHMubGVuZ3RoKSB7XG4gICAgICBvdXQgKz0gJyBpZiAoICcgKyAoJGRhdGEpICsgKGl0LnV0aWwuZ2V0UHJvcGVydHkoJHByb3BlcnR5KSkgKyAnICE9PSB1bmRlZmluZWQgJztcbiAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICBvdXQgKz0gJyAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eSkpICsgJ1xcJykgJztcbiAgICAgIH1cbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnICYmICggJztcbiAgICAgICAgdmFyIGFycjEgPSAkZGVwcztcbiAgICAgICAgaWYgKGFycjEpIHtcbiAgICAgICAgICB2YXIgJHByb3BlcnR5S2V5LCAkaSA9IC0xLFxuICAgICAgICAgICAgbDEgPSBhcnIxLmxlbmd0aCAtIDE7XG4gICAgICAgICAgd2hpbGUgKCRpIDwgbDEpIHtcbiAgICAgICAgICAgICRwcm9wZXJ0eUtleSA9IGFycjFbJGkgKz0gMV07XG4gICAgICAgICAgICBpZiAoJGkpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciAkcHJvcCA9IGl0LnV0aWwuZ2V0UHJvcGVydHkoJHByb3BlcnR5S2V5KSxcbiAgICAgICAgICAgICAgJHVzZURhdGEgPSAkZGF0YSArICRwcm9wO1xuICAgICAgICAgICAgb3V0ICs9ICcgKCAoICcgKyAoJHVzZURhdGEpICsgJyA9PT0gdW5kZWZpbmVkICc7XG4gICAgICAgICAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgISBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSkpICsgJ1xcJykgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnKSAmJiAobWlzc2luZycgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKGl0Lm9wdHMuanNvblBvaW50ZXJzID8gJHByb3BlcnR5S2V5IDogJHByb3ApKSArICcpICkgJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcpKSB7ICAnO1xuICAgICAgICB2YXIgJHByb3BlcnR5UGF0aCA9ICdtaXNzaW5nJyArICRsdmwsXG4gICAgICAgICAgJG1pc3NpbmdQcm9wZXJ0eSA9ICdcXCcgKyAnICsgJHByb3BlcnR5UGF0aCArICcgKyBcXCcnO1xuICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgaXQuZXJyb3JQYXRoID0gaXQub3B0cy5qc29uUG9pbnRlcnMgPyBpdC51dGlsLmdldFBhdGhFeHByKCRjdXJyZW50RXJyb3JQYXRoLCAkcHJvcGVydHlQYXRoLCB0cnVlKSA6ICRjdXJyZW50RXJyb3JQYXRoICsgJyArICcgKyAkcHJvcGVydHlQYXRoO1xuICAgICAgICB9XG4gICAgICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAgICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgICAgIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnZGVwZW5kZW5jaWVzJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBwcm9wZXJ0eTogXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHkpKSArICdcXCcsIG1pc3NpbmdQcm9wZXJ0eTogXFwnJyArICgkbWlzc2luZ1Byb3BlcnR5KSArICdcXCcsIGRlcHNDb3VudDogJyArICgkZGVwcy5sZW5ndGgpICsgJywgZGVwczogXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkZGVwcy5sZW5ndGggPT0gMSA/ICRkZXBzWzBdIDogJGRlcHMuam9pbihcIiwgXCIpKSkgKyAnXFwnIH0gJztcbiAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGhhdmUgJztcbiAgICAgICAgICAgIGlmICgkZGVwcy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICBvdXQgKz0gJ3Byb3BlcnR5ICcgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJGRlcHNbMF0pKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG91dCArPSAncHJvcGVydGllcyAnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRkZXBzLmpvaW4oXCIsIFwiKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICcgd2hlbiBwcm9wZXJ0eSAnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eSkpICsgJyBpcyBwcmVzZW50XFwnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXQgKz0gJyB7fSAnO1xuICAgICAgICB9XG4gICAgICAgIHZhciBfX2VyciA9IG91dDtcbiAgICAgICAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgICAgICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnICkgeyAnO1xuICAgICAgICB2YXIgYXJyMiA9ICRkZXBzO1xuICAgICAgICBpZiAoYXJyMikge1xuICAgICAgICAgIHZhciAkcHJvcGVydHlLZXksIGkyID0gLTEsXG4gICAgICAgICAgICBsMiA9IGFycjIubGVuZ3RoIC0gMTtcbiAgICAgICAgICB3aGlsZSAoaTIgPCBsMikge1xuICAgICAgICAgICAgJHByb3BlcnR5S2V5ID0gYXJyMltpMiArPSAxXTtcbiAgICAgICAgICAgIHZhciAkcHJvcCA9IGl0LnV0aWwuZ2V0UHJvcGVydHkoJHByb3BlcnR5S2V5KSxcbiAgICAgICAgICAgICAgJG1pc3NpbmdQcm9wZXJ0eSA9IGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSksXG4gICAgICAgICAgICAgICR1c2VEYXRhID0gJGRhdGEgKyAkcHJvcDtcbiAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgaXQuZXJyb3JQYXRoID0gaXQudXRpbC5nZXRQYXRoKCRjdXJyZW50RXJyb3JQYXRoLCAkcHJvcGVydHlLZXksIGl0Lm9wdHMuanNvblBvaW50ZXJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnIGlmICggJyArICgkdXNlRGF0YSkgKyAnID09PSB1bmRlZmluZWQgJztcbiAgICAgICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB8fCAhIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCgnICsgKCRkYXRhKSArICcsIFxcJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5S2V5KSkgKyAnXFwnKSAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICcpIHsgIHZhciBlcnIgPSAgICc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ2RlcGVuZGVuY2llcycpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgcHJvcGVydHk6IFxcJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5KSkgKyAnXFwnLCBtaXNzaW5nUHJvcGVydHk6IFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFwnLCBkZXBzQ291bnQ6ICcgKyAoJGRlcHMubGVuZ3RoKSArICcsIGRlcHM6IFxcJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJGRlcHMubGVuZ3RoID09IDEgPyAkZGVwc1swXSA6ICRkZXBzLmpvaW4oXCIsIFwiKSkpICsgJ1xcJyB9ICc7XG4gICAgICAgICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGhhdmUgJztcbiAgICAgICAgICAgICAgICBpZiAoJGRlcHMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAncHJvcGVydHkgJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkZGVwc1swXSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJ3Byb3BlcnRpZXMgJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkZGVwcy5qb2luKFwiLCBcIikpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgd2hlbiBwcm9wZXJ0eSAnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eSkpICsgJyBpcyBwcmVzZW50XFwnICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7IH0gJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gICAnO1xuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgICAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaXQuZXJyb3JQYXRoID0gJGN1cnJlbnRFcnJvclBhdGg7XG4gIHZhciAkY3VycmVudEJhc2VJZCA9ICRpdC5iYXNlSWQ7XG4gIGZvciAodmFyICRwcm9wZXJ0eSBpbiAkc2NoZW1hRGVwcykge1xuICAgIHZhciAkc2NoID0gJHNjaGVtYURlcHNbJHByb3BlcnR5XTtcbiAgICBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2ggPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaCkubGVuZ3RoID4gMCkgfHwgJHNjaCA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2gsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCRuZXh0VmFsaWQpICsgJyA9IHRydWU7IGlmICggJyArICgkZGF0YSkgKyAoaXQudXRpbC5nZXRQcm9wZXJ0eSgkcHJvcGVydHkpKSArICcgIT09IHVuZGVmaW5lZCAnO1xuICAgICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICAgIG91dCArPSAnICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCgnICsgKCRkYXRhKSArICcsIFxcJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5KSkgKyAnXFwnKSAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcpIHsgJztcbiAgICAgICRpdC5zY2hlbWEgPSAkc2NoO1xuICAgICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJHByb3BlcnR5KTtcbiAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGggKyAnLycgKyBpdC51dGlsLmVzY2FwZUZyYWdtZW50KCRwcm9wZXJ0eSk7XG4gICAgICBvdXQgKz0gJyAgJyArIChpdC52YWxpZGF0ZSgkaXQpKSArICcgJztcbiAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgIG91dCArPSAnIH0gICc7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICBvdXQgKz0gJyBpZiAoJyArICgkbmV4dFZhbGlkKSArICcpIHsgJztcbiAgICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnICAgJyArICgkY2xvc2luZ0JyYWNlcykgKyAnIGlmICgnICsgKCRlcnJzKSArICcgPT0gZXJyb3JzKSB7JztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2RlcGVuZGVuY2llcy5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9lbnVtKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkdmFsaWQgPSAndmFsaWQnICsgJGx2bDtcbiAgdmFyICRpc0RhdGEgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWEgJiYgJHNjaGVtYS4kZGF0YSxcbiAgICAkc2NoZW1hVmFsdWU7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLmdldERhdGEoJHNjaGVtYS4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgfSBlbHNlIHtcbiAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hO1xuICB9XG4gIHZhciAkaSA9ICdpJyArICRsdmwsXG4gICAgJHZTY2hlbWEgPSAnc2NoZW1hJyArICRsdmw7XG4gIGlmICghJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciAnICsgKCR2U2NoZW1hKSArICcgPSB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICc7JztcbiAgfVxuICBvdXQgKz0gJ3ZhciAnICsgKCR2YWxpZCkgKyAnOyc7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgaWYgKHNjaGVtYScgKyAoJGx2bCkgKyAnID09PSB1bmRlZmluZWQpICcgKyAoJHZhbGlkKSArICcgPSB0cnVlOyBlbHNlIGlmICghQXJyYXkuaXNBcnJheShzY2hlbWEnICsgKCRsdmwpICsgJykpICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgZWxzZSB7JztcbiAgfVxuICBvdXQgKz0gJycgKyAoJHZhbGlkKSArICcgPSBmYWxzZTtmb3IgKHZhciAnICsgKCRpKSArICc9MDsgJyArICgkaSkgKyAnPCcgKyAoJHZTY2hlbWEpICsgJy5sZW5ndGg7ICcgKyAoJGkpICsgJysrKSBpZiAoZXF1YWwoJyArICgkZGF0YSkgKyAnLCAnICsgKCR2U2NoZW1hKSArICdbJyArICgkaSkgKyAnXSkpIHsgJyArICgkdmFsaWQpICsgJyA9IHRydWU7IGJyZWFrOyB9JztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAgfSAgJztcbiAgfVxuICBvdXQgKz0gJyBpZiAoIScgKyAoJHZhbGlkKSArICcpIHsgICAnO1xuICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ2VudW0nKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGFsbG93ZWRWYWx1ZXM6IHNjaGVtYScgKyAoJGx2bCkgKyAnIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGJlIGVxdWFsIHRvIG9uZSBvZiB0aGUgYWxsb3dlZCB2YWx1ZXNcXCcgJztcbiAgICB9XG4gICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHt9ICc7XG4gIH1cbiAgdmFyIF9fZXJyID0gb3V0O1xuICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgIGlmIChpdC5hc3luYykge1xuICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgfVxuICBvdXQgKz0gJyB9JztcbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2VudW0uanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfZm9ybWF0KGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIGlmIChpdC5vcHRzLmZvcm1hdCA9PT0gZmFsc2UpIHtcbiAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgb3V0ICs9ICcgaWYgKHRydWUpIHsgJztcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgdmFyICR1bmtub3duRm9ybWF0cyA9IGl0Lm9wdHMudW5rbm93bkZvcm1hdHMsXG4gICAgJGFsbG93VW5rbm93biA9IEFycmF5LmlzQXJyYXkoJHVua25vd25Gb3JtYXRzKTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICB2YXIgJGZvcm1hdCA9ICdmb3JtYXQnICsgJGx2bCxcbiAgICAgICRpc09iamVjdCA9ICdpc09iamVjdCcgKyAkbHZsLFxuICAgICAgJGZvcm1hdFR5cGUgPSAnZm9ybWF0VHlwZScgKyAkbHZsO1xuICAgIG91dCArPSAnIHZhciAnICsgKCRmb3JtYXQpICsgJyA9IGZvcm1hdHNbJyArICgkc2NoZW1hVmFsdWUpICsgJ107IHZhciAnICsgKCRpc09iamVjdCkgKyAnID0gdHlwZW9mICcgKyAoJGZvcm1hdCkgKyAnID09IFxcJ29iamVjdFxcJyAmJiAhKCcgKyAoJGZvcm1hdCkgKyAnIGluc3RhbmNlb2YgUmVnRXhwKSAmJiAnICsgKCRmb3JtYXQpICsgJy52YWxpZGF0ZTsgdmFyICcgKyAoJGZvcm1hdFR5cGUpICsgJyA9ICcgKyAoJGlzT2JqZWN0KSArICcgJiYgJyArICgkZm9ybWF0KSArICcudHlwZSB8fCBcXCdzdHJpbmdcXCc7IGlmICgnICsgKCRpc09iamVjdCkgKyAnKSB7ICc7XG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB2YXIgYXN5bmMnICsgKCRsdmwpICsgJyA9ICcgKyAoJGZvcm1hdCkgKyAnLmFzeW5jOyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyAnICsgKCRmb3JtYXQpICsgJyA9ICcgKyAoJGZvcm1hdCkgKyAnLnZhbGlkYXRlOyB9IGlmICggICc7XG4gICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgIG91dCArPSAnICgnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mICcgKyAoJHNjaGVtYVZhbHVlKSArICcgIT0gXFwnc3RyaW5nXFwnKSB8fCAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyAoJztcbiAgICBpZiAoJHVua25vd25Gb3JtYXRzICE9ICdpZ25vcmUnKSB7XG4gICAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAmJiAhJyArICgkZm9ybWF0KSArICcgJztcbiAgICAgIGlmICgkYWxsb3dVbmtub3duKSB7XG4gICAgICAgIG91dCArPSAnICYmIHNlbGYuX29wdHMudW5rbm93bkZvcm1hdHMuaW5kZXhPZignICsgKCRzY2hlbWFWYWx1ZSkgKyAnKSA9PSAtMSAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcpIHx8ICc7XG4gICAgfVxuICAgIG91dCArPSAnICgnICsgKCRmb3JtYXQpICsgJyAmJiAnICsgKCRmb3JtYXRUeXBlKSArICcgPT0gXFwnJyArICgkcnVsZVR5cGUpICsgJ1xcJyAmJiAhKHR5cGVvZiAnICsgKCRmb3JtYXQpICsgJyA9PSBcXCdmdW5jdGlvblxcJyA/ICc7XG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyAoYXN5bmMnICsgKCRsdmwpICsgJyA/IGF3YWl0ICcgKyAoJGZvcm1hdCkgKyAnKCcgKyAoJGRhdGEpICsgJykgOiAnICsgKCRmb3JtYXQpICsgJygnICsgKCRkYXRhKSArICcpKSAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCRmb3JtYXQpICsgJygnICsgKCRkYXRhKSArICcpICc7XG4gICAgfVxuICAgIG91dCArPSAnIDogJyArICgkZm9ybWF0KSArICcudGVzdCgnICsgKCRkYXRhKSArICcpKSkpKSB7JztcbiAgfSBlbHNlIHtcbiAgICB2YXIgJGZvcm1hdCA9IGl0LmZvcm1hdHNbJHNjaGVtYV07XG4gICAgaWYgKCEkZm9ybWF0KSB7XG4gICAgICBpZiAoJHVua25vd25Gb3JtYXRzID09ICdpZ25vcmUnKSB7XG4gICAgICAgIGl0LmxvZ2dlci53YXJuKCd1bmtub3duIGZvcm1hdCBcIicgKyAkc2NoZW1hICsgJ1wiIGlnbm9yZWQgaW4gc2NoZW1hIGF0IHBhdGggXCInICsgaXQuZXJyU2NoZW1hUGF0aCArICdcIicpO1xuICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgIH0gZWxzZSBpZiAoJGFsbG93VW5rbm93biAmJiAkdW5rbm93bkZvcm1hdHMuaW5kZXhPZigkc2NoZW1hKSA+PSAwKSB7XG4gICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKHRydWUpIHsgJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bmtub3duIGZvcm1hdCBcIicgKyAkc2NoZW1hICsgJ1wiIGlzIHVzZWQgaW4gc2NoZW1hIGF0IHBhdGggXCInICsgaXQuZXJyU2NoZW1hUGF0aCArICdcIicpO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgJGlzT2JqZWN0ID0gdHlwZW9mICRmb3JtYXQgPT0gJ29iamVjdCcgJiYgISgkZm9ybWF0IGluc3RhbmNlb2YgUmVnRXhwKSAmJiAkZm9ybWF0LnZhbGlkYXRlO1xuICAgIHZhciAkZm9ybWF0VHlwZSA9ICRpc09iamVjdCAmJiAkZm9ybWF0LnR5cGUgfHwgJ3N0cmluZyc7XG4gICAgaWYgKCRpc09iamVjdCkge1xuICAgICAgdmFyICRhc3luYyA9ICRmb3JtYXQuYXN5bmMgPT09IHRydWU7XG4gICAgICAkZm9ybWF0ID0gJGZvcm1hdC52YWxpZGF0ZTtcbiAgICB9XG4gICAgaWYgKCRmb3JtYXRUeXBlICE9ICRydWxlVHlwZSkge1xuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKHRydWUpIHsgJztcbiAgICAgIH1cbiAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuICAgIGlmICgkYXN5bmMpIHtcbiAgICAgIGlmICghaXQuYXN5bmMpIHRocm93IG5ldyBFcnJvcignYXN5bmMgZm9ybWF0IGluIHN5bmMgc2NoZW1hJyk7XG4gICAgICB2YXIgJGZvcm1hdFJlZiA9ICdmb3JtYXRzJyArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJHNjaGVtYSkgKyAnLnZhbGlkYXRlJztcbiAgICAgIG91dCArPSAnIGlmICghKGF3YWl0ICcgKyAoJGZvcm1hdFJlZikgKyAnKCcgKyAoJGRhdGEpICsgJykpKSB7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIGlmICghICc7XG4gICAgICB2YXIgJGZvcm1hdFJlZiA9ICdmb3JtYXRzJyArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJHNjaGVtYSk7XG4gICAgICBpZiAoJGlzT2JqZWN0KSAkZm9ybWF0UmVmICs9ICcudmFsaWRhdGUnO1xuICAgICAgaWYgKHR5cGVvZiAkZm9ybWF0ID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb3V0ICs9ICcgJyArICgkZm9ybWF0UmVmKSArICcoJyArICgkZGF0YSkgKyAnKSAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgJyArICgkZm9ybWF0UmVmKSArICcudGVzdCgnICsgKCRkYXRhKSArICcpICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJykgeyAnO1xuICAgIH1cbiAgfVxuICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ2Zvcm1hdCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgZm9ybWF0OiAgJztcbiAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgb3V0ICs9ICcnICsgKCRzY2hlbWFWYWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRzY2hlbWEpKTtcbiAgICB9XG4gICAgb3V0ICs9ICcgIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIG1hdGNoIGZvcm1hdCBcIic7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ1xcJyArICcgKyAoJHNjaGVtYVZhbHVlKSArICcgKyBcXCcnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRzY2hlbWEpKTtcbiAgICAgIH1cbiAgICAgIG91dCArPSAnXCJcXCcgJztcbiAgICB9XG4gICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6ICAnO1xuICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgb3V0ICs9ICd2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRzY2hlbWEpKTtcbiAgICAgIH1cbiAgICAgIG91dCArPSAnICAgICAgICAgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB7fSAnO1xuICB9XG4gIHZhciBfX2VyciA9IG91dDtcbiAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gIH1cbiAgb3V0ICs9ICcgfSAnO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvZm9ybWF0LmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2lmKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkdmFsaWQgPSAndmFsaWQnICsgJGx2bDtcbiAgdmFyICRlcnJzID0gJ2VycnNfXycgKyAkbHZsO1xuICB2YXIgJGl0ID0gaXQudXRpbC5jb3B5KGl0KTtcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgdmFyICR0aGVuU2NoID0gaXQuc2NoZW1hWyd0aGVuJ10sXG4gICAgJGVsc2VTY2ggPSBpdC5zY2hlbWFbJ2Vsc2UnXSxcbiAgICAkdGhlblByZXNlbnQgPSAkdGhlblNjaCAhPT0gdW5kZWZpbmVkICYmIChpdC5vcHRzLnN0cmljdEtleXdvcmRzID8gKHR5cGVvZiAkdGhlblNjaCA9PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cygkdGhlblNjaCkubGVuZ3RoID4gMCkgfHwgJHRoZW5TY2ggPT09IGZhbHNlIDogaXQudXRpbC5zY2hlbWFIYXNSdWxlcygkdGhlblNjaCwgaXQuUlVMRVMuYWxsKSksXG4gICAgJGVsc2VQcmVzZW50ID0gJGVsc2VTY2ggIT09IHVuZGVmaW5lZCAmJiAoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJGVsc2VTY2ggPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJGVsc2VTY2gpLmxlbmd0aCA+IDApIHx8ICRlbHNlU2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJGVsc2VTY2gsIGl0LlJVTEVTLmFsbCkpLFxuICAgICRjdXJyZW50QmFzZUlkID0gJGl0LmJhc2VJZDtcbiAgaWYgKCR0aGVuUHJlc2VudCB8fCAkZWxzZVByZXNlbnQpIHtcbiAgICB2YXIgJGlmQ2xhdXNlO1xuICAgICRpdC5jcmVhdGVFcnJvcnMgPSBmYWxzZTtcbiAgICAkaXQuc2NoZW1hID0gJHNjaGVtYTtcbiAgICAkaXQuc2NoZW1hUGF0aCA9ICRzY2hlbWFQYXRoO1xuICAgICRpdC5lcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGg7XG4gICAgb3V0ICs9ICcgdmFyICcgKyAoJGVycnMpICsgJyA9IGVycm9yczsgdmFyICcgKyAoJHZhbGlkKSArICcgPSB0cnVlOyAgJztcbiAgICB2YXIgJHdhc0NvbXBvc2l0ZSA9IGl0LmNvbXBvc2l0ZVJ1bGU7XG4gICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gdHJ1ZTtcbiAgICBvdXQgKz0gJyAgJyArIChpdC52YWxpZGF0ZSgkaXQpKSArICcgJztcbiAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgJGl0LmNyZWF0ZUVycm9ycyA9IHRydWU7XG4gICAgb3V0ICs9ICcgIGVycm9ycyA9ICcgKyAoJGVycnMpICsgJzsgaWYgKHZFcnJvcnMgIT09IG51bGwpIHsgaWYgKCcgKyAoJGVycnMpICsgJykgdkVycm9ycy5sZW5ndGggPSAnICsgKCRlcnJzKSArICc7IGVsc2UgdkVycm9ycyA9IG51bGw7IH0gICc7XG4gICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gJHdhc0NvbXBvc2l0ZTtcbiAgICBpZiAoJHRoZW5QcmVzZW50KSB7XG4gICAgICBvdXQgKz0gJyBpZiAoJyArICgkbmV4dFZhbGlkKSArICcpIHsgICc7XG4gICAgICAkaXQuc2NoZW1hID0gaXQuc2NoZW1hWyd0aGVuJ107XG4gICAgICAkaXQuc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyAnLnRoZW4nO1xuICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy90aGVuJztcbiAgICAgIG91dCArPSAnICAnICsgKGl0LnZhbGlkYXRlKCRpdCkpICsgJyAnO1xuICAgICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgICAgb3V0ICs9ICcgJyArICgkdmFsaWQpICsgJyA9ICcgKyAoJG5leHRWYWxpZCkgKyAnOyAnO1xuICAgICAgaWYgKCR0aGVuUHJlc2VudCAmJiAkZWxzZVByZXNlbnQpIHtcbiAgICAgICAgJGlmQ2xhdXNlID0gJ2lmQ2xhdXNlJyArICRsdmw7XG4gICAgICAgIG91dCArPSAnIHZhciAnICsgKCRpZkNsYXVzZSkgKyAnID0gXFwndGhlblxcJzsgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRpZkNsYXVzZSA9ICdcXCd0aGVuXFwnJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gJztcbiAgICAgIGlmICgkZWxzZVByZXNlbnQpIHtcbiAgICAgICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIGlmICghJyArICgkbmV4dFZhbGlkKSArICcpIHsgJztcbiAgICB9XG4gICAgaWYgKCRlbHNlUHJlc2VudCkge1xuICAgICAgJGl0LnNjaGVtYSA9IGl0LnNjaGVtYVsnZWxzZSddO1xuICAgICAgJGl0LnNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgJy5lbHNlJztcbiAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvZWxzZSc7XG4gICAgICBvdXQgKz0gJyAgJyArIChpdC52YWxpZGF0ZSgkaXQpKSArICcgJztcbiAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgIG91dCArPSAnICcgKyAoJHZhbGlkKSArICcgPSAnICsgKCRuZXh0VmFsaWQpICsgJzsgJztcbiAgICAgIGlmICgkdGhlblByZXNlbnQgJiYgJGVsc2VQcmVzZW50KSB7XG4gICAgICAgICRpZkNsYXVzZSA9ICdpZkNsYXVzZScgKyAkbHZsO1xuICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkaWZDbGF1c2UpICsgJyA9IFxcJ2Vsc2VcXCc7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkaWZDbGF1c2UgPSAnXFwnZWxzZVxcJyc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfVxuICAgIG91dCArPSAnIGlmICghJyArICgkdmFsaWQpICsgJykgeyAgIHZhciBlcnIgPSAgICc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnaWYnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGZhaWxpbmdLZXl3b3JkOiAnICsgKCRpZkNsYXVzZSkgKyAnIH0gJztcbiAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBtYXRjaCBcIlxcJyArICcgKyAoJGlmQ2xhdXNlKSArICcgKyBcXCdcIiBzY2hlbWFcXCcgJztcbiAgICAgIH1cbiAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcge30gJztcbiAgICB9XG4gICAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcih2RXJyb3JzKTsgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IHZFcnJvcnM7IHJldHVybiBmYWxzZTsgJztcbiAgICAgIH1cbiAgICB9XG4gICAgb3V0ICs9ICcgfSAgICc7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgb3V0ICs9ICcgaWYgKHRydWUpIHsgJztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9pZi5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG4vL2FsbCByZXF1aXJlcyBtdXN0IGJlIGV4cGxpY2l0IGJlY2F1c2UgYnJvd3NlcmlmeSB3b24ndCB3b3JrIHdpdGggZHluYW1pYyByZXF1aXJlc1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICckcmVmJzogcmVxdWlyZSgnLi9yZWYnKSxcbiAgYWxsT2Y6IHJlcXVpcmUoJy4vYWxsT2YnKSxcbiAgYW55T2Y6IHJlcXVpcmUoJy4vYW55T2YnKSxcbiAgJyRjb21tZW50JzogcmVxdWlyZSgnLi9jb21tZW50JyksXG4gIGNvbnN0OiByZXF1aXJlKCcuL2NvbnN0JyksXG4gIGNvbnRhaW5zOiByZXF1aXJlKCcuL2NvbnRhaW5zJyksXG4gIGRlcGVuZGVuY2llczogcmVxdWlyZSgnLi9kZXBlbmRlbmNpZXMnKSxcbiAgJ2VudW0nOiByZXF1aXJlKCcuL2VudW0nKSxcbiAgZm9ybWF0OiByZXF1aXJlKCcuL2Zvcm1hdCcpLFxuICAnaWYnOiByZXF1aXJlKCcuL2lmJyksXG4gIGl0ZW1zOiByZXF1aXJlKCcuL2l0ZW1zJyksXG4gIG1heGltdW06IHJlcXVpcmUoJy4vX2xpbWl0JyksXG4gIG1pbmltdW06IHJlcXVpcmUoJy4vX2xpbWl0JyksXG4gIG1heEl0ZW1zOiByZXF1aXJlKCcuL19saW1pdEl0ZW1zJyksXG4gIG1pbkl0ZW1zOiByZXF1aXJlKCcuL19saW1pdEl0ZW1zJyksXG4gIG1heExlbmd0aDogcmVxdWlyZSgnLi9fbGltaXRMZW5ndGgnKSxcbiAgbWluTGVuZ3RoOiByZXF1aXJlKCcuL19saW1pdExlbmd0aCcpLFxuICBtYXhQcm9wZXJ0aWVzOiByZXF1aXJlKCcuL19saW1pdFByb3BlcnRpZXMnKSxcbiAgbWluUHJvcGVydGllczogcmVxdWlyZSgnLi9fbGltaXRQcm9wZXJ0aWVzJyksXG4gIG11bHRpcGxlT2Y6IHJlcXVpcmUoJy4vbXVsdGlwbGVPZicpLFxuICBub3Q6IHJlcXVpcmUoJy4vbm90JyksXG4gIG9uZU9mOiByZXF1aXJlKCcuL29uZU9mJyksXG4gIHBhdHRlcm46IHJlcXVpcmUoJy4vcGF0dGVybicpLFxuICBwcm9wZXJ0aWVzOiByZXF1aXJlKCcuL3Byb3BlcnRpZXMnKSxcbiAgcHJvcGVydHlOYW1lczogcmVxdWlyZSgnLi9wcm9wZXJ0eU5hbWVzJyksXG4gIHJlcXVpcmVkOiByZXF1aXJlKCcuL3JlcXVpcmVkJyksXG4gIHVuaXF1ZUl0ZW1zOiByZXF1aXJlKCcuL3VuaXF1ZUl0ZW1zJyksXG4gIHZhbGlkYXRlOiByZXF1aXJlKCcuL3ZhbGlkYXRlJylcbn07XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvaW5kZXguanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfaXRlbXMoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICB2YXIgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgdmFyICRpZHggPSAnaScgKyAkbHZsLFxuICAgICRkYXRhTnh0ID0gJGl0LmRhdGFMZXZlbCA9IGl0LmRhdGFMZXZlbCArIDEsXG4gICAgJG5leHREYXRhID0gJ2RhdGEnICsgJGRhdGFOeHQsXG4gICAgJGN1cnJlbnRCYXNlSWQgPSBpdC5iYXNlSWQ7XG4gIG91dCArPSAndmFyICcgKyAoJGVycnMpICsgJyA9IGVycm9yczt2YXIgJyArICgkdmFsaWQpICsgJzsnO1xuICBpZiAoQXJyYXkuaXNBcnJheSgkc2NoZW1hKSkge1xuICAgIHZhciAkYWRkaXRpb25hbEl0ZW1zID0gaXQuc2NoZW1hLmFkZGl0aW9uYWxJdGVtcztcbiAgICBpZiAoJGFkZGl0aW9uYWxJdGVtcyA9PT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICcgKyAoJHZhbGlkKSArICcgPSAnICsgKCRkYXRhKSArICcubGVuZ3RoIDw9ICcgKyAoJHNjaGVtYS5sZW5ndGgpICsgJzsgJztcbiAgICAgIHZhciAkY3VyckVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aDtcbiAgICAgICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvYWRkaXRpb25hbEl0ZW1zJztcbiAgICAgIG91dCArPSAnICBpZiAoIScgKyAoJHZhbGlkKSArICcpIHsgICAnO1xuICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnYWRkaXRpb25hbEl0ZW1zJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBsaW1pdDogJyArICgkc2NoZW1hLmxlbmd0aCkgKyAnIH0gJztcbiAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgTk9UIGhhdmUgbW9yZSB0aGFuICcgKyAoJHNjaGVtYS5sZW5ndGgpICsgJyBpdGVtc1xcJyAnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogZmFsc2UgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgIH1cbiAgICAgIHZhciBfX2VyciA9IG91dDtcbiAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgJGVyclNjaGVtYVBhdGggPSAkY3VyckVyclNjaGVtYVBhdGg7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgYXJyMSA9ICRzY2hlbWE7XG4gICAgaWYgKGFycjEpIHtcbiAgICAgIHZhciAkc2NoLCAkaSA9IC0xLFxuICAgICAgICBsMSA9IGFycjEubGVuZ3RoIC0gMTtcbiAgICAgIHdoaWxlICgkaSA8IGwxKSB7XG4gICAgICAgICRzY2ggPSBhcnIxWyRpICs9IDFdO1xuICAgICAgICBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2ggPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaCkubGVuZ3RoID4gMCkgfHwgJHNjaCA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2gsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgICAgICAgb3V0ICs9ICcgJyArICgkbmV4dFZhbGlkKSArICcgPSB0cnVlOyBpZiAoJyArICgkZGF0YSkgKyAnLmxlbmd0aCA+ICcgKyAoJGkpICsgJykgeyAnO1xuICAgICAgICAgIHZhciAkcGFzc0RhdGEgPSAkZGF0YSArICdbJyArICRpICsgJ10nO1xuICAgICAgICAgICRpdC5zY2hlbWEgPSAkc2NoO1xuICAgICAgICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGggKyAnWycgKyAkaSArICddJztcbiAgICAgICAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoICsgJy8nICsgJGk7XG4gICAgICAgICAgJGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAkaSwgaXQub3B0cy5qc29uUG9pbnRlcnMsIHRydWUpO1xuICAgICAgICAgICRpdC5kYXRhUGF0aEFyclskZGF0YU54dF0gPSAkaTtcbiAgICAgICAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpO1xuICAgICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgICAgICBpZiAoaXQudXRpbC52YXJPY2N1cmVuY2VzKCRjb2RlLCAkbmV4dERhdGEpIDwgMikge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51dGlsLnZhclJlcGxhY2UoJGNvZGUsICRuZXh0RGF0YSwgJHBhc3NEYXRhKSkgKyAnICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJyArICgkY29kZSkgKyAnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnIH0gICc7XG4gICAgICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJykgeyAnO1xuICAgICAgICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHlwZW9mICRhZGRpdGlvbmFsSXRlbXMgPT0gJ29iamVjdCcgJiYgKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRhZGRpdGlvbmFsSXRlbXMgPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJGFkZGl0aW9uYWxJdGVtcykubGVuZ3RoID4gMCkgfHwgJGFkZGl0aW9uYWxJdGVtcyA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRhZGRpdGlvbmFsSXRlbXMsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgICAkaXQuc2NoZW1hID0gJGFkZGl0aW9uYWxJdGVtcztcbiAgICAgICRpdC5zY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArICcuYWRkaXRpb25hbEl0ZW1zJztcbiAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvYWRkaXRpb25hbEl0ZW1zJztcbiAgICAgIG91dCArPSAnICcgKyAoJG5leHRWYWxpZCkgKyAnID0gdHJ1ZTsgaWYgKCcgKyAoJGRhdGEpICsgJy5sZW5ndGggPiAnICsgKCRzY2hlbWEubGVuZ3RoKSArICcpIHsgIGZvciAodmFyICcgKyAoJGlkeCkgKyAnID0gJyArICgkc2NoZW1hLmxlbmd0aCkgKyAnOyAnICsgKCRpZHgpICsgJyA8ICcgKyAoJGRhdGEpICsgJy5sZW5ndGg7ICcgKyAoJGlkeCkgKyAnKyspIHsgJztcbiAgICAgICRpdC5lcnJvclBhdGggPSBpdC51dGlsLmdldFBhdGhFeHByKGl0LmVycm9yUGF0aCwgJGlkeCwgaXQub3B0cy5qc29uUG9pbnRlcnMsIHRydWUpO1xuICAgICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgJ1snICsgJGlkeCArICddJztcbiAgICAgICRpdC5kYXRhUGF0aEFyclskZGF0YU54dF0gPSAkaWR4O1xuICAgICAgdmFyICRjb2RlID0gaXQudmFsaWRhdGUoJGl0KTtcbiAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgIGlmIChpdC51dGlsLnZhck9jY3VyZW5jZXMoJGNvZGUsICRuZXh0RGF0YSkgPCAyKSB7XG4gICAgICAgIG91dCArPSAnICcgKyAoaXQudXRpbC52YXJSZXBsYWNlKCRjb2RlLCAkbmV4dERhdGEsICRwYXNzRGF0YSkpICsgJyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJG5leHREYXRhKSArICcgPSAnICsgKCRwYXNzRGF0YSkgKyAnOyAnICsgKCRjb2RlKSArICcgJztcbiAgICAgIH1cbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnIGlmICghJyArICgkbmV4dFZhbGlkKSArICcpIGJyZWFrOyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSB9ICAnO1xuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgICAgICRjbG9zaW5nQnJhY2VzICs9ICd9JztcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2hlbWEgPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaGVtYSkubGVuZ3RoID4gMCkgfHwgJHNjaGVtYSA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2hlbWEsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgJGl0LnNjaGVtYSA9ICRzY2hlbWE7XG4gICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aDtcbiAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoO1xuICAgIG91dCArPSAnICBmb3IgKHZhciAnICsgKCRpZHgpICsgJyA9ICcgKyAoMCkgKyAnOyAnICsgKCRpZHgpICsgJyA8ICcgKyAoJGRhdGEpICsgJy5sZW5ndGg7ICcgKyAoJGlkeCkgKyAnKyspIHsgJztcbiAgICAkaXQuZXJyb3JQYXRoID0gaXQudXRpbC5nZXRQYXRoRXhwcihpdC5lcnJvclBhdGgsICRpZHgsIGl0Lm9wdHMuanNvblBvaW50ZXJzLCB0cnVlKTtcbiAgICB2YXIgJHBhc3NEYXRhID0gJGRhdGEgKyAnWycgKyAkaWR4ICsgJ10nO1xuICAgICRpdC5kYXRhUGF0aEFyclskZGF0YU54dF0gPSAkaWR4O1xuICAgIHZhciAkY29kZSA9IGl0LnZhbGlkYXRlKCRpdCk7XG4gICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgIGlmIChpdC51dGlsLnZhck9jY3VyZW5jZXMoJGNvZGUsICRuZXh0RGF0YSkgPCAyKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKGl0LnV0aWwudmFyUmVwbGFjZSgkY29kZSwgJG5leHREYXRhLCAkcGFzc0RhdGEpKSArICcgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJG5leHREYXRhKSArICcgPSAnICsgKCRwYXNzRGF0YSkgKyAnOyAnICsgKCRjb2RlKSArICcgJztcbiAgICB9XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICghJyArICgkbmV4dFZhbGlkKSArICcpIGJyZWFrOyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9JztcbiAgfVxuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnICcgKyAoJGNsb3NpbmdCcmFjZXMpICsgJyBpZiAoJyArICgkZXJycykgKyAnID09IGVycm9ycykgeyc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9pdGVtcy5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9tdWx0aXBsZU9mKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkaXNEYXRhID0gaXQub3B0cy4kZGF0YSAmJiAkc2NoZW1hICYmICRzY2hlbWEuJGRhdGEsXG4gICAgJHNjaGVtYVZhbHVlO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciBzY2hlbWEnICsgKCRsdmwpICsgJyA9ICcgKyAoaXQudXRpbC5nZXREYXRhKCRzY2hlbWEuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFycikpICsgJzsgJztcbiAgICAkc2NoZW1hVmFsdWUgPSAnc2NoZW1hJyArICRsdmw7XG4gIH0gZWxzZSB7XG4gICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYTtcbiAgfVxuICBpZiAoISgkaXNEYXRhIHx8IHR5cGVvZiAkc2NoZW1hID09ICdudW1iZXInKSkge1xuICAgIHRocm93IG5ldyBFcnJvcigka2V5d29yZCArICcgbXVzdCBiZSBudW1iZXInKTtcbiAgfVxuICBvdXQgKz0gJ3ZhciBkaXZpc2lvbicgKyAoJGx2bCkgKyAnO2lmICgnO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnICcgKyAoJHNjaGVtYVZhbHVlKSArICcgIT09IHVuZGVmaW5lZCAmJiAoIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ251bWJlclxcJyB8fCAnO1xuICB9XG4gIG91dCArPSAnIChkaXZpc2lvbicgKyAoJGx2bCkgKyAnID0gJyArICgkZGF0YSkgKyAnIC8gJyArICgkc2NoZW1hVmFsdWUpICsgJywgJztcbiAgaWYgKGl0Lm9wdHMubXVsdGlwbGVPZlByZWNpc2lvbikge1xuICAgIG91dCArPSAnIE1hdGguYWJzKE1hdGgucm91bmQoZGl2aXNpb24nICsgKCRsdmwpICsgJykgLSBkaXZpc2lvbicgKyAoJGx2bCkgKyAnKSA+IDFlLScgKyAoaXQub3B0cy5tdWx0aXBsZU9mUHJlY2lzaW9uKSArICcgJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyBkaXZpc2lvbicgKyAoJGx2bCkgKyAnICE9PSBwYXJzZUludChkaXZpc2lvbicgKyAoJGx2bCkgKyAnKSAnO1xuICB9XG4gIG91dCArPSAnICkgJztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAgKSAgJztcbiAgfVxuICBvdXQgKz0gJyApIHsgICAnO1xuICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ211bHRpcGxlT2YnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IG11bHRpcGxlT2Y6ICcgKyAoJHNjaGVtYVZhbHVlKSArICcgfSAnO1xuICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgYmUgbXVsdGlwbGUgb2YgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAnXFwnICsgJyArICgkc2NoZW1hVmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKCRzY2hlbWFWYWx1ZSkgKyAnXFwnJztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6ICAnO1xuICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgb3V0ICs9ICd2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArICgkc2NoZW1hKTtcbiAgICAgIH1cbiAgICAgIG91dCArPSAnICAgICAgICAgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB7fSAnO1xuICB9XG4gIHZhciBfX2VyciA9IG91dDtcbiAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gIH1cbiAgb3V0ICs9ICd9ICc7XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9tdWx0aXBsZU9mLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX25vdChpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICAkaXQubGV2ZWwrKztcbiAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2hlbWEgPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaGVtYSkubGVuZ3RoID4gMCkgfHwgJHNjaGVtYSA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2hlbWEsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgJGl0LnNjaGVtYSA9ICRzY2hlbWE7XG4gICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aDtcbiAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoO1xuICAgIG91dCArPSAnIHZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7ICAnO1xuICAgIHZhciAkd2FzQ29tcG9zaXRlID0gaXQuY29tcG9zaXRlUnVsZTtcbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICAgICRpdC5jcmVhdGVFcnJvcnMgPSBmYWxzZTtcbiAgICB2YXIgJGFsbEVycm9yc09wdGlvbjtcbiAgICBpZiAoJGl0Lm9wdHMuYWxsRXJyb3JzKSB7XG4gICAgICAkYWxsRXJyb3JzT3B0aW9uID0gJGl0Lm9wdHMuYWxsRXJyb3JzO1xuICAgICAgJGl0Lm9wdHMuYWxsRXJyb3JzID0gZmFsc2U7XG4gICAgfVxuICAgIG91dCArPSAnICcgKyAoaXQudmFsaWRhdGUoJGl0KSkgKyAnICc7XG4gICAgJGl0LmNyZWF0ZUVycm9ycyA9IHRydWU7XG4gICAgaWYgKCRhbGxFcnJvcnNPcHRpb24pICRpdC5vcHRzLmFsbEVycm9ycyA9ICRhbGxFcnJvcnNPcHRpb247XG4gICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gJHdhc0NvbXBvc2l0ZTtcbiAgICBvdXQgKz0gJyBpZiAoJyArICgkbmV4dFZhbGlkKSArICcpIHsgICAnO1xuICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdub3QnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7fSAnO1xuICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIE5PVCBiZSB2YWxpZFxcJyAnO1xuICAgICAgfVxuICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB7fSAnO1xuICAgIH1cbiAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gZWxzZSB7ICBlcnJvcnMgPSAnICsgKCRlcnJzKSArICc7IGlmICh2RXJyb3JzICE9PSBudWxsKSB7IGlmICgnICsgKCRlcnJzKSArICcpIHZFcnJvcnMubGVuZ3RoID0gJyArICgkZXJycykgKyAnOyBlbHNlIHZFcnJvcnMgPSBudWxsOyB9ICc7XG4gICAgaWYgKGl0Lm9wdHMuYWxsRXJyb3JzKSB7XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnICB2YXIgZXJyID0gICAnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ25vdCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHt9ICc7XG4gICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgTk9UIGJlIHZhbGlkXFwnICc7XG4gICAgICB9XG4gICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgfVxuICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmIChmYWxzZSkgeyAnO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL25vdC5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9vbmVPZihpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmw7XG4gIHZhciAkZXJycyA9ICdlcnJzX18nICsgJGx2bDtcbiAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gIHZhciAkY2xvc2luZ0JyYWNlcyA9ICcnO1xuICAkaXQubGV2ZWwrKztcbiAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICB2YXIgJGN1cnJlbnRCYXNlSWQgPSAkaXQuYmFzZUlkLFxuICAgICRwcmV2VmFsaWQgPSAncHJldlZhbGlkJyArICRsdmwsXG4gICAgJHBhc3NpbmdTY2hlbWFzID0gJ3Bhc3NpbmdTY2hlbWFzJyArICRsdmw7XG4gIG91dCArPSAndmFyICcgKyAoJGVycnMpICsgJyA9IGVycm9ycyAsICcgKyAoJHByZXZWYWxpZCkgKyAnID0gZmFsc2UgLCAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2UgLCAnICsgKCRwYXNzaW5nU2NoZW1hcykgKyAnID0gbnVsbDsgJztcbiAgdmFyICR3YXNDb21wb3NpdGUgPSBpdC5jb21wb3NpdGVSdWxlO1xuICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICB2YXIgYXJyMSA9ICRzY2hlbWE7XG4gIGlmIChhcnIxKSB7XG4gICAgdmFyICRzY2gsICRpID0gLTEsXG4gICAgICBsMSA9IGFycjEubGVuZ3RoIC0gMTtcbiAgICB3aGlsZSAoJGkgPCBsMSkge1xuICAgICAgJHNjaCA9IGFycjFbJGkgKz0gMV07XG4gICAgICBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2ggPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaCkubGVuZ3RoID4gMCkgfHwgJHNjaCA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2gsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgICAgICRpdC5zY2hlbWEgPSAkc2NoO1xuICAgICAgICAkaXQuc2NoZW1hUGF0aCA9ICRzY2hlbWFQYXRoICsgJ1snICsgJGkgKyAnXSc7XG4gICAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGggKyAnLycgKyAkaTtcbiAgICAgICAgb3V0ICs9ICcgICcgKyAoaXQudmFsaWRhdGUoJGl0KSkgKyAnICc7XG4gICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0VmFsaWQpICsgJyA9IHRydWU7ICc7XG4gICAgICB9XG4gICAgICBpZiAoJGkpIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnICYmICcgKyAoJHByZXZWYWxpZCkgKyAnKSB7ICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgJyArICgkcGFzc2luZ1NjaGVtYXMpICsgJyA9IFsnICsgKCRwYXNzaW5nU2NoZW1hcykgKyAnLCAnICsgKCRpKSArICddOyB9IGVsc2UgeyAnO1xuICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyBpZiAoJyArICgkbmV4dFZhbGlkKSArICcpIHsgJyArICgkdmFsaWQpICsgJyA9ICcgKyAoJHByZXZWYWxpZCkgKyAnID0gdHJ1ZTsgJyArICgkcGFzc2luZ1NjaGVtYXMpICsgJyA9ICcgKyAoJGkpICsgJzsgfSc7XG4gICAgfVxuICB9XG4gIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9ICR3YXNDb21wb3NpdGU7XG4gIG91dCArPSAnJyArICgkY2xvc2luZ0JyYWNlcykgKyAnaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ29uZU9mJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBwYXNzaW5nU2NoZW1hczogJyArICgkcGFzc2luZ1NjaGVtYXMpICsgJyB9ICc7XG4gICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBtYXRjaCBleGFjdGx5IG9uZSBzY2hlbWEgaW4gb25lT2ZcXCcgJztcbiAgICB9XG4gICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHt9ICc7XG4gIH1cbiAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IodkVycm9ycyk7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IHZFcnJvcnM7IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH1cbiAgb3V0ICs9ICd9IGVsc2UgeyAgZXJyb3JzID0gJyArICgkZXJycykgKyAnOyBpZiAodkVycm9ycyAhPT0gbnVsbCkgeyBpZiAoJyArICgkZXJycykgKyAnKSB2RXJyb3JzLmxlbmd0aCA9ICcgKyAoJGVycnMpICsgJzsgZWxzZSB2RXJyb3JzID0gbnVsbDsgfSc7XG4gIGlmIChpdC5vcHRzLmFsbEVycm9ycykge1xuICAgIG91dCArPSAnIH0gJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL29uZU9mLmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX3BhdHRlcm4oaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICRpc0RhdGEgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWEgJiYgJHNjaGVtYS4kZGF0YSxcbiAgICAkc2NoZW1hVmFsdWU7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLmdldERhdGEoJHNjaGVtYS4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgfSBlbHNlIHtcbiAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hO1xuICB9XG4gIHZhciAkcmVnZXhwID0gJGlzRGF0YSA/ICcobmV3IFJlZ0V4cCgnICsgJHNjaGVtYVZhbHVlICsgJykpJyA6IGl0LnVzZVBhdHRlcm4oJHNjaGVtYSk7XG4gIG91dCArPSAnaWYgKCAnO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnICgnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mICcgKyAoJHNjaGVtYVZhbHVlKSArICcgIT0gXFwnc3RyaW5nXFwnKSB8fCAnO1xuICB9XG4gIG91dCArPSAnICEnICsgKCRyZWdleHApICsgJy50ZXN0KCcgKyAoJGRhdGEpICsgJykgKSB7ICAgJztcbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdwYXR0ZXJuJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBwYXR0ZXJuOiAgJztcbiAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgb3V0ICs9ICcnICsgKCRzY2hlbWFWYWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRzY2hlbWEpKTtcbiAgICB9XG4gICAgb3V0ICs9ICcgIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIG1hdGNoIHBhdHRlcm4gXCInO1xuICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgb3V0ICs9ICdcXCcgKyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICsgXFwnJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArIChpdC51dGlsLmVzY2FwZVF1b3Rlcygkc2NoZW1hKSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJ1wiXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkc2NoZW1hKSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnfSAnO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvcGF0dGVybi5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9wcm9wZXJ0aWVzKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkZXJycyA9ICdlcnJzX18nICsgJGx2bDtcbiAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gIHZhciAkY2xvc2luZ0JyYWNlcyA9ICcnO1xuICAkaXQubGV2ZWwrKztcbiAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICB2YXIgJGtleSA9ICdrZXknICsgJGx2bCxcbiAgICAkaWR4ID0gJ2lkeCcgKyAkbHZsLFxuICAgICRkYXRhTnh0ID0gJGl0LmRhdGFMZXZlbCA9IGl0LmRhdGFMZXZlbCArIDEsXG4gICAgJG5leHREYXRhID0gJ2RhdGEnICsgJGRhdGFOeHQsXG4gICAgJGRhdGFQcm9wZXJ0aWVzID0gJ2RhdGFQcm9wZXJ0aWVzJyArICRsdmw7XG4gIHZhciAkc2NoZW1hS2V5cyA9IE9iamVjdC5rZXlzKCRzY2hlbWEgfHwge30pLmZpbHRlcihub3RQcm90byksXG4gICAgJHBQcm9wZXJ0aWVzID0gaXQuc2NoZW1hLnBhdHRlcm5Qcm9wZXJ0aWVzIHx8IHt9LFxuICAgICRwUHJvcGVydHlLZXlzID0gT2JqZWN0LmtleXMoJHBQcm9wZXJ0aWVzKS5maWx0ZXIobm90UHJvdG8pLFxuICAgICRhUHJvcGVydGllcyA9IGl0LnNjaGVtYS5hZGRpdGlvbmFsUHJvcGVydGllcyxcbiAgICAkc29tZVByb3BlcnRpZXMgPSAkc2NoZW1hS2V5cy5sZW5ndGggfHwgJHBQcm9wZXJ0eUtleXMubGVuZ3RoLFxuICAgICRub0FkZGl0aW9uYWwgPSAkYVByb3BlcnRpZXMgPT09IGZhbHNlLFxuICAgICRhZGRpdGlvbmFsSXNTY2hlbWEgPSB0eXBlb2YgJGFQcm9wZXJ0aWVzID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRhUHJvcGVydGllcykubGVuZ3RoLFxuICAgICRyZW1vdmVBZGRpdGlvbmFsID0gaXQub3B0cy5yZW1vdmVBZGRpdGlvbmFsLFxuICAgICRjaGVja0FkZGl0aW9uYWwgPSAkbm9BZGRpdGlvbmFsIHx8ICRhZGRpdGlvbmFsSXNTY2hlbWEgfHwgJHJlbW92ZUFkZGl0aW9uYWwsXG4gICAgJG93blByb3BlcnRpZXMgPSBpdC5vcHRzLm93blByb3BlcnRpZXMsXG4gICAgJGN1cnJlbnRCYXNlSWQgPSBpdC5iYXNlSWQ7XG4gIHZhciAkcmVxdWlyZWQgPSBpdC5zY2hlbWEucmVxdWlyZWQ7XG4gIGlmICgkcmVxdWlyZWQgJiYgIShpdC5vcHRzLiRkYXRhICYmICRyZXF1aXJlZC4kZGF0YSkgJiYgJHJlcXVpcmVkLmxlbmd0aCA8IGl0Lm9wdHMubG9vcFJlcXVpcmVkKSB7XG4gICAgdmFyICRyZXF1aXJlZEhhc2ggPSBpdC51dGlsLnRvSGFzaCgkcmVxdWlyZWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gbm90UHJvdG8ocCkge1xuICAgIHJldHVybiBwICE9PSAnX19wcm90b19fJztcbiAgfVxuICBvdXQgKz0gJ3ZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7dmFyICcgKyAoJG5leHRWYWxpZCkgKyAnID0gdHJ1ZTsnO1xuICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICBvdXQgKz0gJyB2YXIgJyArICgkZGF0YVByb3BlcnRpZXMpICsgJyA9IHVuZGVmaW5lZDsnO1xuICB9XG4gIGlmICgkY2hlY2tBZGRpdGlvbmFsKSB7XG4gICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnID0gJyArICgkZGF0YVByb3BlcnRpZXMpICsgJyB8fCBPYmplY3Qua2V5cygnICsgKCRkYXRhKSArICcpOyBmb3IgKHZhciAnICsgKCRpZHgpICsgJz0wOyAnICsgKCRpZHgpICsgJzwnICsgKCRkYXRhUHJvcGVydGllcykgKyAnLmxlbmd0aDsgJyArICgkaWR4KSArICcrKykgeyB2YXIgJyArICgka2V5KSArICcgPSAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnWycgKyAoJGlkeCkgKyAnXTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgZm9yICh2YXIgJyArICgka2V5KSArICcgaW4gJyArICgkZGF0YSkgKyAnKSB7ICc7XG4gICAgfVxuICAgIGlmICgkc29tZVByb3BlcnRpZXMpIHtcbiAgICAgIG91dCArPSAnIHZhciBpc0FkZGl0aW9uYWwnICsgKCRsdmwpICsgJyA9ICEoZmFsc2UgJztcbiAgICAgIGlmICgkc2NoZW1hS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKCRzY2hlbWFLZXlzLmxlbmd0aCA+IDgpIHtcbiAgICAgICAgICBvdXQgKz0gJyB8fCB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcuaGFzT3duUHJvcGVydHkoJyArICgka2V5KSArICcpICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGFycjEgPSAkc2NoZW1hS2V5cztcbiAgICAgICAgICBpZiAoYXJyMSkge1xuICAgICAgICAgICAgdmFyICRwcm9wZXJ0eUtleSwgaTEgPSAtMSxcbiAgICAgICAgICAgICAgbDEgPSBhcnIxLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICB3aGlsZSAoaTEgPCBsMSkge1xuICAgICAgICAgICAgICAkcHJvcGVydHlLZXkgPSBhcnIxW2kxICs9IDFdO1xuICAgICAgICAgICAgICBvdXQgKz0gJyB8fCAnICsgKCRrZXkpICsgJyA9PSAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJHByb3BlcnR5S2V5KSkgKyAnICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoJHBQcm9wZXJ0eUtleXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBhcnIyID0gJHBQcm9wZXJ0eUtleXM7XG4gICAgICAgIGlmIChhcnIyKSB7XG4gICAgICAgICAgdmFyICRwUHJvcGVydHksICRpID0gLTEsXG4gICAgICAgICAgICBsMiA9IGFycjIubGVuZ3RoIC0gMTtcbiAgICAgICAgICB3aGlsZSAoJGkgPCBsMikge1xuICAgICAgICAgICAgJHBQcm9wZXJ0eSA9IGFycjJbJGkgKz0gMV07XG4gICAgICAgICAgICBvdXQgKz0gJyB8fCAnICsgKGl0LnVzZVBhdHRlcm4oJHBQcm9wZXJ0eSkpICsgJy50ZXN0KCcgKyAoJGtleSkgKyAnKSAnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb3V0ICs9ICcgKTsgaWYgKGlzQWRkaXRpb25hbCcgKyAoJGx2bCkgKyAnKSB7ICc7XG4gICAgfVxuICAgIGlmICgkcmVtb3ZlQWRkaXRpb25hbCA9PSAnYWxsJykge1xuICAgICAgb3V0ICs9ICcgZGVsZXRlICcgKyAoJGRhdGEpICsgJ1snICsgKCRrZXkpICsgJ107ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciAkY3VycmVudEVycm9yUGF0aCA9IGl0LmVycm9yUGF0aDtcbiAgICAgIHZhciAkYWRkaXRpb25hbFByb3BlcnR5ID0gJ1xcJyArICcgKyAka2V5ICsgJyArIFxcJyc7XG4gICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgIGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAka2V5LCBpdC5vcHRzLmpzb25Qb2ludGVycyk7XG4gICAgICB9XG4gICAgICBpZiAoJG5vQWRkaXRpb25hbCkge1xuICAgICAgICBpZiAoJHJlbW92ZUFkZGl0aW9uYWwpIHtcbiAgICAgICAgICBvdXQgKz0gJyBkZWxldGUgJyArICgkZGF0YSkgKyAnWycgKyAoJGtleSkgKyAnXTsgJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXQgKz0gJyAnICsgKCRuZXh0VmFsaWQpICsgJyA9IGZhbHNlOyAnO1xuICAgICAgICAgIHZhciAkY3VyckVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aDtcbiAgICAgICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnL2FkZGl0aW9uYWxQcm9wZXJ0aWVzJztcbiAgICAgICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAgICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnYWRkaXRpb25hbFByb3BlcnRpZXMnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGFkZGl0aW9uYWxQcm9wZXJ0eTogXFwnJyArICgkYWRkaXRpb25hbFByb3BlcnR5KSArICdcXCcgfSAnO1xuICAgICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnJztcbiAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIG91dCArPSAnaXMgYW4gaW52YWxpZCBhZGRpdGlvbmFsIHByb3BlcnR5JztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBOT1QgaGF2ZSBhZGRpdGlvbmFsIHByb3BlcnRpZXMnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG91dCArPSAnXFwnICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiBmYWxzZSAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICAkZXJyU2NoZW1hUGF0aCA9ICRjdXJyRXJyU2NoZW1hUGF0aDtcbiAgICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgb3V0ICs9ICcgYnJlYWs7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCRhZGRpdGlvbmFsSXNTY2hlbWEpIHtcbiAgICAgICAgaWYgKCRyZW1vdmVBZGRpdGlvbmFsID09ICdmYWlsaW5nJykge1xuICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7ICAnO1xuICAgICAgICAgIHZhciAkd2FzQ29tcG9zaXRlID0gaXQuY29tcG9zaXRlUnVsZTtcbiAgICAgICAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICAgICAgICAgICRpdC5zY2hlbWEgPSAkYVByb3BlcnRpZXM7XG4gICAgICAgICAgJGl0LnNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgJy5hZGRpdGlvbmFsUHJvcGVydGllcyc7XG4gICAgICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy9hZGRpdGlvbmFsUHJvcGVydGllcyc7XG4gICAgICAgICAgJGl0LmVycm9yUGF0aCA9IGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSA/IGl0LmVycm9yUGF0aCA6IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAka2V5LCBpdC5vcHRzLmpzb25Qb2ludGVycyk7XG4gICAgICAgICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgJ1snICsgJGtleSArICddJztcbiAgICAgICAgICAkaXQuZGF0YVBhdGhBcnJbJGRhdGFOeHRdID0gJGtleTtcbiAgICAgICAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpO1xuICAgICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgICAgICBpZiAoaXQudXRpbC52YXJPY2N1cmVuY2VzKCRjb2RlLCAkbmV4dERhdGEpIDwgMikge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51dGlsLnZhclJlcGxhY2UoJGNvZGUsICRuZXh0RGF0YSwgJHBhc3NEYXRhKSkgKyAnICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJyArICgkY29kZSkgKyAnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnIGlmICghJyArICgkbmV4dFZhbGlkKSArICcpIHsgZXJyb3JzID0gJyArICgkZXJycykgKyAnOyBpZiAodmFsaWRhdGUuZXJyb3JzICE9PSBudWxsKSB7IGlmIChlcnJvcnMpIHZhbGlkYXRlLmVycm9ycy5sZW5ndGggPSBlcnJvcnM7IGVsc2UgdmFsaWRhdGUuZXJyb3JzID0gbnVsbDsgfSBkZWxldGUgJyArICgkZGF0YSkgKyAnWycgKyAoJGtleSkgKyAnXTsgfSAgJztcbiAgICAgICAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSAkd2FzQ29tcG9zaXRlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRpdC5zY2hlbWEgPSAkYVByb3BlcnRpZXM7XG4gICAgICAgICAgJGl0LnNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgJy5hZGRpdGlvbmFsUHJvcGVydGllcyc7XG4gICAgICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy9hZGRpdGlvbmFsUHJvcGVydGllcyc7XG4gICAgICAgICAgJGl0LmVycm9yUGF0aCA9IGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSA/IGl0LmVycm9yUGF0aCA6IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAka2V5LCBpdC5vcHRzLmpzb25Qb2ludGVycyk7XG4gICAgICAgICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgJ1snICsgJGtleSArICddJztcbiAgICAgICAgICAkaXQuZGF0YVBhdGhBcnJbJGRhdGFOeHRdID0gJGtleTtcbiAgICAgICAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpO1xuICAgICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgICAgICBpZiAoaXQudXRpbC52YXJPY2N1cmVuY2VzKCRjb2RlLCAkbmV4dERhdGEpIDwgMikge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51dGlsLnZhclJlcGxhY2UoJGNvZGUsICRuZXh0RGF0YSwgJHBhc3NEYXRhKSkgKyAnICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJyArICgkY29kZSkgKyAnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSBicmVhazsgJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGl0LmVycm9yUGF0aCA9ICRjdXJyZW50RXJyb3JQYXRoO1xuICAgIH1cbiAgICBpZiAoJHNvbWVQcm9wZXJ0aWVzKSB7XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gICc7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJykgeyAnO1xuICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgIH1cbiAgfVxuICB2YXIgJHVzZURlZmF1bHRzID0gaXQub3B0cy51c2VEZWZhdWx0cyAmJiAhaXQuY29tcG9zaXRlUnVsZTtcbiAgaWYgKCRzY2hlbWFLZXlzLmxlbmd0aCkge1xuICAgIHZhciBhcnIzID0gJHNjaGVtYUtleXM7XG4gICAgaWYgKGFycjMpIHtcbiAgICAgIHZhciAkcHJvcGVydHlLZXksIGkzID0gLTEsXG4gICAgICAgIGwzID0gYXJyMy5sZW5ndGggLSAxO1xuICAgICAgd2hpbGUgKGkzIDwgbDMpIHtcbiAgICAgICAgJHByb3BlcnR5S2V5ID0gYXJyM1tpMyArPSAxXTtcbiAgICAgICAgdmFyICRzY2ggPSAkc2NoZW1hWyRwcm9wZXJ0eUtleV07XG4gICAgICAgIGlmICgoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHNjaCA9PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cygkc2NoKS5sZW5ndGggPiAwKSB8fCAkc2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHNjaCwgaXQuUlVMRVMuYWxsKSkpIHtcbiAgICAgICAgICB2YXIgJHByb3AgPSBpdC51dGlsLmdldFByb3BlcnR5KCRwcm9wZXJ0eUtleSksXG4gICAgICAgICAgICAkcGFzc0RhdGEgPSAkZGF0YSArICRwcm9wLFxuICAgICAgICAgICAgJGhhc0RlZmF1bHQgPSAkdXNlRGVmYXVsdHMgJiYgJHNjaC5kZWZhdWx0ICE9PSB1bmRlZmluZWQ7XG4gICAgICAgICAgJGl0LnNjaGVtYSA9ICRzY2g7XG4gICAgICAgICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aCArICRwcm9wO1xuICAgICAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGggKyAnLycgKyBpdC51dGlsLmVzY2FwZUZyYWdtZW50KCRwcm9wZXJ0eUtleSk7XG4gICAgICAgICAgJGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aChpdC5lcnJvclBhdGgsICRwcm9wZXJ0eUtleSwgaXQub3B0cy5qc29uUG9pbnRlcnMpO1xuICAgICAgICAgICRpdC5kYXRhUGF0aEFyclskZGF0YU54dF0gPSBpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRwcm9wZXJ0eUtleSk7XG4gICAgICAgICAgdmFyICRjb2RlID0gaXQudmFsaWRhdGUoJGl0KTtcbiAgICAgICAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgICAgICAgaWYgKGl0LnV0aWwudmFyT2NjdXJlbmNlcygkY29kZSwgJG5leHREYXRhKSA8IDIpIHtcbiAgICAgICAgICAgICRjb2RlID0gaXQudXRpbC52YXJSZXBsYWNlKCRjb2RlLCAkbmV4dERhdGEsICRwYXNzRGF0YSk7XG4gICAgICAgICAgICB2YXIgJHVzZURhdGEgPSAkcGFzc0RhdGE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciAkdXNlRGF0YSA9ICRuZXh0RGF0YTtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCRoYXNEZWZhdWx0KSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAnICsgKCRjb2RlKSArICcgJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCRyZXF1aXJlZEhhc2ggJiYgJHJlcXVpcmVkSGFzaFskcHJvcGVydHlLZXldKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIGlmICggJyArICgkdXNlRGF0YSkgKyAnID09PSB1bmRlZmluZWQgJztcbiAgICAgICAgICAgICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgISBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSkpICsgJ1xcJykgJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBvdXQgKz0gJykgeyAnICsgKCRuZXh0VmFsaWQpICsgJyA9IGZhbHNlOyAnO1xuICAgICAgICAgICAgICB2YXIgJGN1cnJlbnRFcnJvclBhdGggPSBpdC5lcnJvclBhdGgsXG4gICAgICAgICAgICAgICAgJGN1cnJFcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGgsXG4gICAgICAgICAgICAgICAgJG1pc3NpbmdQcm9wZXJ0eSA9IGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSk7XG4gICAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICBpdC5lcnJvclBhdGggPSBpdC51dGlsLmdldFBhdGgoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eUtleSwgaXQub3B0cy5qc29uUG9pbnRlcnMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvcmVxdWlyZWQnO1xuICAgICAgICAgICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAgICAgICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgICAgICAgICAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ3JlcXVpcmVkJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBtaXNzaW5nUHJvcGVydHk6IFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFwnIH0gJztcbiAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnJztcbiAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICdpcyBhIHJlcXVpcmVkIHByb3BlcnR5JztcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSAnc2hvdWxkIGhhdmUgcmVxdWlyZWQgcHJvcGVydHkgXFxcXFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFxcXFxcJyc7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJ1xcJyAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICAgICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgICAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICRlcnJTY2hlbWFQYXRoID0gJGN1cnJFcnJTY2hlbWFQYXRoO1xuICAgICAgICAgICAgICBpdC5lcnJvclBhdGggPSAkY3VycmVudEVycm9yUGF0aDtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgfSBlbHNlIHsgJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgaWYgKCAnICsgKCR1c2VEYXRhKSArICcgPT09IHVuZGVmaW5lZCAnO1xuICAgICAgICAgICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgISBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSkpICsgJ1xcJykgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcpIHsgJyArICgkbmV4dFZhbGlkKSArICcgPSB0cnVlOyB9IGVsc2UgeyAnO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCR1c2VEYXRhKSArICcgIT09IHVuZGVmaW5lZCAnO1xuICAgICAgICAgICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgJiYgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSkpICsgJ1xcJykgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgKSB7ICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnICcgKyAoJGNvZGUpICsgJyB9ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICgkcFByb3BlcnR5S2V5cy5sZW5ndGgpIHtcbiAgICB2YXIgYXJyNCA9ICRwUHJvcGVydHlLZXlzO1xuICAgIGlmIChhcnI0KSB7XG4gICAgICB2YXIgJHBQcm9wZXJ0eSwgaTQgPSAtMSxcbiAgICAgICAgbDQgPSBhcnI0Lmxlbmd0aCAtIDE7XG4gICAgICB3aGlsZSAoaTQgPCBsNCkge1xuICAgICAgICAkcFByb3BlcnR5ID0gYXJyNFtpNCArPSAxXTtcbiAgICAgICAgdmFyICRzY2ggPSAkcFByb3BlcnRpZXNbJHBQcm9wZXJ0eV07XG4gICAgICAgIGlmICgoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHNjaCA9PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cygkc2NoKS5sZW5ndGggPiAwKSB8fCAkc2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHNjaCwgaXQuUlVMRVMuYWxsKSkpIHtcbiAgICAgICAgICAkaXQuc2NoZW1hID0gJHNjaDtcbiAgICAgICAgICAkaXQuc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyAnLnBhdHRlcm5Qcm9wZXJ0aWVzJyArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJHBQcm9wZXJ0eSk7XG4gICAgICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy9wYXR0ZXJuUHJvcGVydGllcy8nICsgaXQudXRpbC5lc2NhcGVGcmFnbWVudCgkcFByb3BlcnR5KTtcbiAgICAgICAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIG91dCArPSAnICcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICcgPSAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnIHx8IE9iamVjdC5rZXlzKCcgKyAoJGRhdGEpICsgJyk7IGZvciAodmFyICcgKyAoJGlkeCkgKyAnPTA7ICcgKyAoJGlkeCkgKyAnPCcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICcubGVuZ3RoOyAnICsgKCRpZHgpICsgJysrKSB7IHZhciAnICsgKCRrZXkpICsgJyA9ICcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICdbJyArICgkaWR4KSArICddOyAnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBmb3IgKHZhciAnICsgKCRrZXkpICsgJyBpbiAnICsgKCRkYXRhKSArICcpIHsgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoaXQudXNlUGF0dGVybigkcFByb3BlcnR5KSkgKyAnLnRlc3QoJyArICgka2V5KSArICcpKSB7ICc7XG4gICAgICAgICAgJGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAka2V5LCBpdC5vcHRzLmpzb25Qb2ludGVycyk7XG4gICAgICAgICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgJ1snICsgJGtleSArICddJztcbiAgICAgICAgICAkaXQuZGF0YVBhdGhBcnJbJGRhdGFOeHRdID0gJGtleTtcbiAgICAgICAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpO1xuICAgICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgICAgICBpZiAoaXQudXRpbC52YXJPY2N1cmVuY2VzKCRjb2RlLCAkbmV4dERhdGEpIDwgMikge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51dGlsLnZhclJlcGxhY2UoJGNvZGUsICRuZXh0RGF0YSwgJHBhc3NEYXRhKSkgKyAnICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJyArICgkY29kZSkgKyAnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSBicmVhazsgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBlbHNlICcgKyAoJG5leHRWYWxpZCkgKyAnID0gdHJ1ZTsgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAgJztcbiAgICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgJyArICgkY2xvc2luZ0JyYWNlcykgKyAnIGlmICgnICsgKCRlcnJzKSArICcgPT0gZXJyb3JzKSB7JztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL3Byb3BlcnRpZXMuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfcHJvcGVydHlOYW1lcyhpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICB2YXIgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgb3V0ICs9ICd2YXIgJyArICgkZXJycykgKyAnID0gZXJyb3JzOyc7XG4gIGlmICgoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHNjaGVtYSA9PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cygkc2NoZW1hKS5sZW5ndGggPiAwKSB8fCAkc2NoZW1hID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHNjaGVtYSwgaXQuUlVMRVMuYWxsKSkpIHtcbiAgICAkaXQuc2NoZW1hID0gJHNjaGVtYTtcbiAgICAkaXQuc2NoZW1hUGF0aCA9ICRzY2hlbWFQYXRoO1xuICAgICRpdC5lcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGg7XG4gICAgdmFyICRrZXkgPSAna2V5JyArICRsdmwsXG4gICAgICAkaWR4ID0gJ2lkeCcgKyAkbHZsLFxuICAgICAgJGkgPSAnaScgKyAkbHZsLFxuICAgICAgJGludmFsaWROYW1lID0gJ1xcJyArICcgKyAka2V5ICsgJyArIFxcJycsXG4gICAgICAkZGF0YU54dCA9ICRpdC5kYXRhTGV2ZWwgPSBpdC5kYXRhTGV2ZWwgKyAxLFxuICAgICAgJG5leHREYXRhID0gJ2RhdGEnICsgJGRhdGFOeHQsXG4gICAgICAkZGF0YVByb3BlcnRpZXMgPSAnZGF0YVByb3BlcnRpZXMnICsgJGx2bCxcbiAgICAgICRvd25Qcm9wZXJ0aWVzID0gaXQub3B0cy5vd25Qcm9wZXJ0aWVzLFxuICAgICAgJGN1cnJlbnRCYXNlSWQgPSBpdC5iYXNlSWQ7XG4gICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICBvdXQgKz0gJyB2YXIgJyArICgkZGF0YVByb3BlcnRpZXMpICsgJyA9IHVuZGVmaW5lZDsgJztcbiAgICB9XG4gICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnID0gJyArICgkZGF0YVByb3BlcnRpZXMpICsgJyB8fCBPYmplY3Qua2V5cygnICsgKCRkYXRhKSArICcpOyBmb3IgKHZhciAnICsgKCRpZHgpICsgJz0wOyAnICsgKCRpZHgpICsgJzwnICsgKCRkYXRhUHJvcGVydGllcykgKyAnLmxlbmd0aDsgJyArICgkaWR4KSArICcrKykgeyB2YXIgJyArICgka2V5KSArICcgPSAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnWycgKyAoJGlkeCkgKyAnXTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgZm9yICh2YXIgJyArICgka2V5KSArICcgaW4gJyArICgkZGF0YSkgKyAnKSB7ICc7XG4gICAgfVxuICAgIG91dCArPSAnIHZhciBzdGFydEVycnMnICsgKCRsdmwpICsgJyA9IGVycm9yczsgJztcbiAgICB2YXIgJHBhc3NEYXRhID0gJGtleTtcbiAgICB2YXIgJHdhc0NvbXBvc2l0ZSA9IGl0LmNvbXBvc2l0ZVJ1bGU7XG4gICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gdHJ1ZTtcbiAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpO1xuICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICBpZiAoaXQudXRpbC52YXJPY2N1cmVuY2VzKCRjb2RlLCAkbmV4dERhdGEpIDwgMikge1xuICAgICAgb3V0ICs9ICcgJyArIChpdC51dGlsLnZhclJlcGxhY2UoJGNvZGUsICRuZXh0RGF0YSwgJHBhc3NEYXRhKSkgKyAnICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJyArICgkY29kZSkgKyAnICc7XG4gICAgfVxuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9ICR3YXNDb21wb3NpdGU7XG4gICAgb3V0ICs9ICcgaWYgKCEnICsgKCRuZXh0VmFsaWQpICsgJykgeyBmb3IgKHZhciAnICsgKCRpKSArICc9c3RhcnRFcnJzJyArICgkbHZsKSArICc7ICcgKyAoJGkpICsgJzxlcnJvcnM7ICcgKyAoJGkpICsgJysrKSB7IHZFcnJvcnNbJyArICgkaSkgKyAnXS5wcm9wZXJ0eU5hbWUgPSAnICsgKCRrZXkpICsgJzsgfSAgIHZhciBlcnIgPSAgICc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgncHJvcGVydHlOYW1lcycpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgcHJvcGVydHlOYW1lOiBcXCcnICsgKCRpbnZhbGlkTmFtZSkgKyAnXFwnIH0gJztcbiAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Byb3BlcnR5IG5hbWUgXFxcXFxcJycgKyAoJGludmFsaWROYW1lKSArICdcXFxcXFwnIGlzIGludmFsaWRcXCcgJztcbiAgICAgIH1cbiAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcge30gJztcbiAgICB9XG4gICAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcih2RXJyb3JzKTsgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IHZFcnJvcnM7IHJldHVybiBmYWxzZTsgJztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGJyZWFrOyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9IH0nO1xuICB9XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgJyArICgkY2xvc2luZ0JyYWNlcykgKyAnIGlmICgnICsgKCRlcnJzKSArICcgPT0gZXJyb3JzKSB7JztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL3Byb3BlcnR5TmFtZXMuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfcmVmKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmw7XG4gIHZhciAkYXN5bmMsICRyZWZDb2RlO1xuICBpZiAoJHNjaGVtYSA9PSAnIycgfHwgJHNjaGVtYSA9PSAnIy8nKSB7XG4gICAgaWYgKGl0LmlzUm9vdCkge1xuICAgICAgJGFzeW5jID0gaXQuYXN5bmM7XG4gICAgICAkcmVmQ29kZSA9ICd2YWxpZGF0ZSc7XG4gICAgfSBlbHNlIHtcbiAgICAgICRhc3luYyA9IGl0LnJvb3Quc2NoZW1hLiRhc3luYyA9PT0gdHJ1ZTtcbiAgICAgICRyZWZDb2RlID0gJ3Jvb3QucmVmVmFsWzBdJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyICRyZWZWYWwgPSBpdC5yZXNvbHZlUmVmKGl0LmJhc2VJZCwgJHNjaGVtYSwgaXQuaXNSb290KTtcbiAgICBpZiAoJHJlZlZhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YXIgJG1lc3NhZ2UgPSBpdC5NaXNzaW5nUmVmRXJyb3IubWVzc2FnZShpdC5iYXNlSWQsICRzY2hlbWEpO1xuICAgICAgaWYgKGl0Lm9wdHMubWlzc2luZ1JlZnMgPT0gJ2ZhaWwnKSB7XG4gICAgICAgIGl0LmxvZ2dlci5lcnJvcigkbWVzc2FnZSk7XG4gICAgICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAgICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgICAgIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnJHJlZicpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgcmVmOiBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRzY2hlbWEpKSArICdcXCcgfSAnO1xuICAgICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdjYW5cXFxcXFwndCByZXNvbHZlIHJlZmVyZW5jZSAnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRzY2hlbWEpKSArICdcXCcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkc2NoZW1hKSkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICB9XG4gICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKGZhbHNlKSB7ICc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaXQub3B0cy5taXNzaW5nUmVmcyA9PSAnaWdub3JlJykge1xuICAgICAgICBpdC5sb2dnZXIud2FybigkbWVzc2FnZSk7XG4gICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKHRydWUpIHsgJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IGl0Lk1pc3NpbmdSZWZFcnJvcihpdC5iYXNlSWQsICRzY2hlbWEsICRtZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCRyZWZWYWwuaW5saW5lKSB7XG4gICAgICB2YXIgJGl0ID0gaXQudXRpbC5jb3B5KGl0KTtcbiAgICAgICRpdC5sZXZlbCsrO1xuICAgICAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICAgICAgJGl0LnNjaGVtYSA9ICRyZWZWYWwuc2NoZW1hO1xuICAgICAgJGl0LnNjaGVtYVBhdGggPSAnJztcbiAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gJHNjaGVtYTtcbiAgICAgIHZhciAkY29kZSA9IGl0LnZhbGlkYXRlKCRpdCkucmVwbGFjZSgvdmFsaWRhdGVcXC5zY2hlbWEvZywgJHJlZlZhbC5jb2RlKTtcbiAgICAgIG91dCArPSAnICcgKyAoJGNvZGUpICsgJyAnO1xuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICRhc3luYyA9ICRyZWZWYWwuJGFzeW5jID09PSB0cnVlIHx8IChpdC5hc3luYyAmJiAkcmVmVmFsLiRhc3luYyAhPT0gZmFsc2UpO1xuICAgICAgJHJlZkNvZGUgPSAkcmVmVmFsLmNvZGU7XG4gICAgfVxuICB9XG4gIGlmICgkcmVmQ29kZSkge1xuICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICBvdXQgPSAnJztcbiAgICBpZiAoaXQub3B0cy5wYXNzQ29udGV4dCkge1xuICAgICAgb3V0ICs9ICcgJyArICgkcmVmQ29kZSkgKyAnLmNhbGwodGhpcywgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgJyArICgkcmVmQ29kZSkgKyAnKCAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyAnICsgKCRkYXRhKSArICcsIChkYXRhUGF0aCB8fCBcXCdcXCcpJztcbiAgICBpZiAoaXQuZXJyb3JQYXRoICE9ICdcIlwiJykge1xuICAgICAgb3V0ICs9ICcgKyAnICsgKGl0LmVycm9yUGF0aCk7XG4gICAgfVxuICAgIHZhciAkcGFyZW50RGF0YSA9ICRkYXRhTHZsID8gJ2RhdGEnICsgKCgkZGF0YUx2bCAtIDEpIHx8ICcnKSA6ICdwYXJlbnREYXRhJyxcbiAgICAgICRwYXJlbnREYXRhUHJvcGVydHkgPSAkZGF0YUx2bCA/IGl0LmRhdGFQYXRoQXJyWyRkYXRhTHZsXSA6ICdwYXJlbnREYXRhUHJvcGVydHknO1xuICAgIG91dCArPSAnICwgJyArICgkcGFyZW50RGF0YSkgKyAnICwgJyArICgkcGFyZW50RGF0YVByb3BlcnR5KSArICcsIHJvb3REYXRhKSAgJztcbiAgICB2YXIgX19jYWxsVmFsaWRhdGUgPSBvdXQ7XG4gICAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgICBpZiAoJGFzeW5jKSB7XG4gICAgICBpZiAoIWl0LmFzeW5jKSB0aHJvdyBuZXcgRXJyb3IoJ2FzeW5jIHNjaGVtYSByZWZlcmVuY2VkIGJ5IHN5bmMgc2NoZW1hJyk7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkdmFsaWQpICsgJzsgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIHRyeSB7IGF3YWl0ICcgKyAoX19jYWxsVmFsaWRhdGUpICsgJzsgJztcbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnICcgKyAoJHZhbGlkKSArICcgPSB0cnVlOyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSBjYXRjaCAoZSkgeyBpZiAoIShlIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSkgdGhyb3cgZTsgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBlLmVycm9yczsgZWxzZSB2RXJyb3JzID0gdkVycm9ycy5jb25jYXQoZS5lcnJvcnMpOyBlcnJvcnMgPSB2RXJyb3JzLmxlbmd0aDsgJztcbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gJztcbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnIGlmICgnICsgKCR2YWxpZCkgKyAnKSB7ICc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIGlmICghJyArIChfX2NhbGxWYWxpZGF0ZSkgKyAnKSB7IGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gJyArICgkcmVmQ29kZSkgKyAnLmVycm9yczsgZWxzZSB2RXJyb3JzID0gdkVycm9ycy5jb25jYXQoJyArICgkcmVmQ29kZSkgKyAnLmVycm9ycyk7IGVycm9ycyA9IHZFcnJvcnMubGVuZ3RoOyB9ICc7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9yZWYuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfcmVxdWlyZWQoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgdmFyICR2U2NoZW1hID0gJ3NjaGVtYScgKyAkbHZsO1xuICBpZiAoISRpc0RhdGEpIHtcbiAgICBpZiAoJHNjaGVtYS5sZW5ndGggPCBpdC5vcHRzLmxvb3BSZXF1aXJlZCAmJiBpdC5zY2hlbWEucHJvcGVydGllcyAmJiBPYmplY3Qua2V5cyhpdC5zY2hlbWEucHJvcGVydGllcykubGVuZ3RoKSB7XG4gICAgICB2YXIgJHJlcXVpcmVkID0gW107XG4gICAgICB2YXIgYXJyMSA9ICRzY2hlbWE7XG4gICAgICBpZiAoYXJyMSkge1xuICAgICAgICB2YXIgJHByb3BlcnR5LCBpMSA9IC0xLFxuICAgICAgICAgIGwxID0gYXJyMS5sZW5ndGggLSAxO1xuICAgICAgICB3aGlsZSAoaTEgPCBsMSkge1xuICAgICAgICAgICRwcm9wZXJ0eSA9IGFycjFbaTEgKz0gMV07XG4gICAgICAgICAgdmFyICRwcm9wZXJ0eVNjaCA9IGl0LnNjaGVtYS5wcm9wZXJ0aWVzWyRwcm9wZXJ0eV07XG4gICAgICAgICAgaWYgKCEoJHByb3BlcnR5U2NoICYmIChpdC5vcHRzLnN0cmljdEtleXdvcmRzID8gKHR5cGVvZiAkcHJvcGVydHlTY2ggPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHByb3BlcnR5U2NoKS5sZW5ndGggPiAwKSB8fCAkcHJvcGVydHlTY2ggPT09IGZhbHNlIDogaXQudXRpbC5zY2hlbWFIYXNSdWxlcygkcHJvcGVydHlTY2gsIGl0LlJVTEVTLmFsbCkpKSkge1xuICAgICAgICAgICAgJHJlcXVpcmVkWyRyZXF1aXJlZC5sZW5ndGhdID0gJHByb3BlcnR5O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgJHJlcXVpcmVkID0gJHNjaGVtYTtcbiAgICB9XG4gIH1cbiAgaWYgKCRpc0RhdGEgfHwgJHJlcXVpcmVkLmxlbmd0aCkge1xuICAgIHZhciAkY3VycmVudEVycm9yUGF0aCA9IGl0LmVycm9yUGF0aCxcbiAgICAgICRsb29wUmVxdWlyZWQgPSAkaXNEYXRhIHx8ICRyZXF1aXJlZC5sZW5ndGggPj0gaXQub3B0cy5sb29wUmVxdWlyZWQsXG4gICAgICAkb3duUHJvcGVydGllcyA9IGl0Lm9wdHMub3duUHJvcGVydGllcztcbiAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgb3V0ICs9ICcgdmFyIG1pc3NpbmcnICsgKCRsdmwpICsgJzsgJztcbiAgICAgIGlmICgkbG9vcFJlcXVpcmVkKSB7XG4gICAgICAgIGlmICghJGlzRGF0YSkge1xuICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCR2U2NoZW1hKSArICcgPSB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICc7ICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyICRpID0gJ2knICsgJGx2bCxcbiAgICAgICAgICAkcHJvcGVydHlQYXRoID0gJ3NjaGVtYScgKyAkbHZsICsgJ1snICsgJGkgKyAnXScsXG4gICAgICAgICAgJG1pc3NpbmdQcm9wZXJ0eSA9ICdcXCcgKyAnICsgJHByb3BlcnR5UGF0aCArICcgKyBcXCcnO1xuICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgaXQuZXJyb3JQYXRoID0gaXQudXRpbC5nZXRQYXRoRXhwcigkY3VycmVudEVycm9yUGF0aCwgJHByb3BlcnR5UGF0aCwgaXQub3B0cy5qc29uUG9pbnRlcnMpO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIHZhciAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZTsgJztcbiAgICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgICBvdXQgKz0gJyBpZiAoc2NoZW1hJyArICgkbHZsKSArICcgPT09IHVuZGVmaW5lZCkgJyArICgkdmFsaWQpICsgJyA9IHRydWU7IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KHNjaGVtYScgKyAoJGx2bCkgKyAnKSkgJyArICgkdmFsaWQpICsgJyA9IGZhbHNlOyBlbHNlIHsnO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIGZvciAodmFyICcgKyAoJGkpICsgJyA9IDA7ICcgKyAoJGkpICsgJyA8ICcgKyAoJHZTY2hlbWEpICsgJy5sZW5ndGg7ICcgKyAoJGkpICsgJysrKSB7ICcgKyAoJHZhbGlkKSArICcgPSAnICsgKCRkYXRhKSArICdbJyArICgkdlNjaGVtYSkgKyAnWycgKyAoJGkpICsgJ11dICE9PSB1bmRlZmluZWQgJztcbiAgICAgICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgb3V0ICs9ICcgJiYgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCAnICsgKCR2U2NoZW1hKSArICdbJyArICgkaSkgKyAnXSkgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJzsgaWYgKCEnICsgKCR2YWxpZCkgKyAnKSBicmVhazsgfSAnO1xuICAgICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICAgIG91dCArPSAnICB9ICAnO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnICBpZiAoIScgKyAoJHZhbGlkKSArICcpIHsgICAnO1xuICAgICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgICAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ3JlcXVpcmVkJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBtaXNzaW5nUHJvcGVydHk6IFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFwnIH0gJztcbiAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnJztcbiAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICdpcyBhIHJlcXVpcmVkIHByb3BlcnR5JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG91dCArPSAnc2hvdWxkIGhhdmUgcmVxdWlyZWQgcHJvcGVydHkgXFxcXFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFxcXFxcJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJ1xcJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIH0gZWxzZSB7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyBpZiAoICc7XG4gICAgICAgIHZhciBhcnIyID0gJHJlcXVpcmVkO1xuICAgICAgICBpZiAoYXJyMikge1xuICAgICAgICAgIHZhciAkcHJvcGVydHlLZXksICRpID0gLTEsXG4gICAgICAgICAgICBsMiA9IGFycjIubGVuZ3RoIC0gMTtcbiAgICAgICAgICB3aGlsZSAoJGkgPCBsMikge1xuICAgICAgICAgICAgJHByb3BlcnR5S2V5ID0gYXJyMlskaSArPSAxXTtcbiAgICAgICAgICAgIGlmICgkaSkge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB8fCAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyICRwcm9wID0gaXQudXRpbC5nZXRQcm9wZXJ0eSgkcHJvcGVydHlLZXkpLFxuICAgICAgICAgICAgICAkdXNlRGF0YSA9ICRkYXRhICsgJHByb3A7XG4gICAgICAgICAgICBvdXQgKz0gJyAoICggJyArICgkdXNlRGF0YSkgKyAnID09PSB1bmRlZmluZWQgJztcbiAgICAgICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB8fCAhIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCgnICsgKCRkYXRhKSArICcsIFxcJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5S2V5KSkgKyAnXFwnKSAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICcpICYmIChtaXNzaW5nJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoaXQub3B0cy5qc29uUG9pbnRlcnMgPyAkcHJvcGVydHlLZXkgOiAkcHJvcCkpICsgJykgKSAnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJykgeyAgJztcbiAgICAgICAgdmFyICRwcm9wZXJ0eVBhdGggPSAnbWlzc2luZycgKyAkbHZsLFxuICAgICAgICAgICRtaXNzaW5nUHJvcGVydHkgPSAnXFwnICsgJyArICRwcm9wZXJ0eVBhdGggKyAnICsgXFwnJztcbiAgICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICAgIGl0LmVycm9yUGF0aCA9IGl0Lm9wdHMuanNvblBvaW50ZXJzID8gaXQudXRpbC5nZXRQYXRoRXhwcigkY3VycmVudEVycm9yUGF0aCwgJHByb3BlcnR5UGF0aCwgdHJ1ZSkgOiAkY3VycmVudEVycm9yUGF0aCArICcgKyAnICsgJHByb3BlcnR5UGF0aDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgICAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ3JlcXVpcmVkJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBtaXNzaW5nUHJvcGVydHk6IFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFwnIH0gJztcbiAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnJztcbiAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICdpcyBhIHJlcXVpcmVkIHByb3BlcnR5JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG91dCArPSAnc2hvdWxkIGhhdmUgcmVxdWlyZWQgcHJvcGVydHkgXFxcXFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFxcXFxcJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJ1xcJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIH0gZWxzZSB7ICc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICgkbG9vcFJlcXVpcmVkKSB7XG4gICAgICAgIGlmICghJGlzRGF0YSkge1xuICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCR2U2NoZW1hKSArICcgPSB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICc7ICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyICRpID0gJ2knICsgJGx2bCxcbiAgICAgICAgICAkcHJvcGVydHlQYXRoID0gJ3NjaGVtYScgKyAkbHZsICsgJ1snICsgJGkgKyAnXScsXG4gICAgICAgICAgJG1pc3NpbmdQcm9wZXJ0eSA9ICdcXCcgKyAnICsgJHByb3BlcnR5UGF0aCArICcgKyBcXCcnO1xuICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgaXQuZXJyb3JQYXRoID0gaXQudXRpbC5nZXRQYXRoRXhwcigkY3VycmVudEVycm9yUGF0aCwgJHByb3BlcnR5UGF0aCwgaXQub3B0cy5qc29uUG9pbnRlcnMpO1xuICAgICAgICB9XG4gICAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJHZTY2hlbWEpICsgJyAmJiAhQXJyYXkuaXNBcnJheSgnICsgKCR2U2NoZW1hKSArICcpKSB7ICB2YXIgZXJyID0gICAnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ3JlcXVpcmVkJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBtaXNzaW5nUHJvcGVydHk6IFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFwnIH0gJztcbiAgICAgICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJyc7XG4gICAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJ2lzIGEgcmVxdWlyZWQgcHJvcGVydHknO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCArPSAnc2hvdWxkIGhhdmUgcmVxdWlyZWQgcHJvcGVydHkgXFxcXFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFxcXFxcJyc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgfSBlbHNlIGlmICgnICsgKCR2U2NoZW1hKSArICcgIT09IHVuZGVmaW5lZCkgeyAnO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIGZvciAodmFyICcgKyAoJGkpICsgJyA9IDA7ICcgKyAoJGkpICsgJyA8ICcgKyAoJHZTY2hlbWEpICsgJy5sZW5ndGg7ICcgKyAoJGkpICsgJysrKSB7IGlmICgnICsgKCRkYXRhKSArICdbJyArICgkdlNjaGVtYSkgKyAnWycgKyAoJGkpICsgJ11dID09PSB1bmRlZmluZWQgJztcbiAgICAgICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgb3V0ICs9ICcgfHwgISBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCAnICsgKCR2U2NoZW1hKSArICdbJyArICgkaSkgKyAnXSkgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJykgeyAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ3JlcXVpcmVkJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBtaXNzaW5nUHJvcGVydHk6IFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFwnIH0gJztcbiAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnJztcbiAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICdpcyBhIHJlcXVpcmVkIHByb3BlcnR5JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG91dCArPSAnc2hvdWxkIGhhdmUgcmVxdWlyZWQgcHJvcGVydHkgXFxcXFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFxcXFxcJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJ1xcJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyB9IH0gJztcbiAgICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgICBvdXQgKz0gJyAgfSAgJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGFycjMgPSAkcmVxdWlyZWQ7XG4gICAgICAgIGlmIChhcnIzKSB7XG4gICAgICAgICAgdmFyICRwcm9wZXJ0eUtleSwgaTMgPSAtMSxcbiAgICAgICAgICAgIGwzID0gYXJyMy5sZW5ndGggLSAxO1xuICAgICAgICAgIHdoaWxlIChpMyA8IGwzKSB7XG4gICAgICAgICAgICAkcHJvcGVydHlLZXkgPSBhcnIzW2kzICs9IDFdO1xuICAgICAgICAgICAgdmFyICRwcm9wID0gaXQudXRpbC5nZXRQcm9wZXJ0eSgkcHJvcGVydHlLZXkpLFxuICAgICAgICAgICAgICAkbWlzc2luZ1Byb3BlcnR5ID0gaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5S2V5KSxcbiAgICAgICAgICAgICAgJHVzZURhdGEgPSAkZGF0YSArICRwcm9wO1xuICAgICAgICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICAgICAgICBpdC5lcnJvclBhdGggPSBpdC51dGlsLmdldFBhdGgoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eUtleSwgaXQub3B0cy5qc29uUG9pbnRlcnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICcgaWYgKCAnICsgKCR1c2VEYXRhKSArICcgPT09IHVuZGVmaW5lZCAnO1xuICAgICAgICAgICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIHx8ICEgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHlLZXkpKSArICdcXCcpICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJykgeyAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgncmVxdWlyZWQnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IG1pc3NpbmdQcm9wZXJ0eTogXFwnJyArICgkbWlzc2luZ1Byb3BlcnR5KSArICdcXCcgfSAnO1xuICAgICAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJyc7XG4gICAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICdpcyBhIHJlcXVpcmVkIHByb3BlcnR5JztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICdzaG91bGQgaGF2ZSByZXF1aXJlZCBwcm9wZXJ0eSBcXFxcXFwnJyArICgkbWlzc2luZ1Byb3BlcnR5KSArICdcXFxcXFwnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB7fSAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgfSAnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpdC5lcnJvclBhdGggPSAkY3VycmVudEVycm9yUGF0aDtcbiAgfSBlbHNlIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgaWYgKHRydWUpIHsnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvcmVxdWlyZWQuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfdW5pcXVlSXRlbXMoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgaWYgKCgkc2NoZW1hIHx8ICRpc0RhdGEpICYmIGl0Lm9wdHMudW5pcXVlSXRlbXMgIT09IGZhbHNlKSB7XG4gICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgIG91dCArPSAnIHZhciAnICsgKCR2YWxpZCkgKyAnOyBpZiAoJyArICgkc2NoZW1hVmFsdWUpICsgJyA9PT0gZmFsc2UgfHwgJyArICgkc2NoZW1hVmFsdWUpICsgJyA9PT0gdW5kZWZpbmVkKSAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZTsgZWxzZSBpZiAodHlwZW9mICcgKyAoJHNjaGVtYVZhbHVlKSArICcgIT0gXFwnYm9vbGVhblxcJykgJyArICgkdmFsaWQpICsgJyA9IGZhbHNlOyBlbHNlIHsgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgdmFyIGkgPSAnICsgKCRkYXRhKSArICcubGVuZ3RoICwgJyArICgkdmFsaWQpICsgJyA9IHRydWUgLCBqOyBpZiAoaSA+IDEpIHsgJztcbiAgICB2YXIgJGl0ZW1UeXBlID0gaXQuc2NoZW1hLml0ZW1zICYmIGl0LnNjaGVtYS5pdGVtcy50eXBlLFxuICAgICAgJHR5cGVJc0FycmF5ID0gQXJyYXkuaXNBcnJheSgkaXRlbVR5cGUpO1xuICAgIGlmICghJGl0ZW1UeXBlIHx8ICRpdGVtVHlwZSA9PSAnb2JqZWN0JyB8fCAkaXRlbVR5cGUgPT0gJ2FycmF5JyB8fCAoJHR5cGVJc0FycmF5ICYmICgkaXRlbVR5cGUuaW5kZXhPZignb2JqZWN0JykgPj0gMCB8fCAkaXRlbVR5cGUuaW5kZXhPZignYXJyYXknKSA+PSAwKSkpIHtcbiAgICAgIG91dCArPSAnIG91dGVyOiBmb3IgKDtpLS07KSB7IGZvciAoaiA9IGk7IGotLTspIHsgaWYgKGVxdWFsKCcgKyAoJGRhdGEpICsgJ1tpXSwgJyArICgkZGF0YSkgKyAnW2pdKSkgeyAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7IGJyZWFrIG91dGVyOyB9IH0gfSAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YXIgaXRlbUluZGljZXMgPSB7fSwgaXRlbTsgZm9yICg7aS0tOykgeyB2YXIgaXRlbSA9ICcgKyAoJGRhdGEpICsgJ1tpXTsgJztcbiAgICAgIHZhciAkbWV0aG9kID0gJ2NoZWNrRGF0YVR5cGUnICsgKCR0eXBlSXNBcnJheSA/ICdzJyA6ICcnKTtcbiAgICAgIG91dCArPSAnIGlmICgnICsgKGl0LnV0aWxbJG1ldGhvZF0oJGl0ZW1UeXBlLCAnaXRlbScsIGl0Lm9wdHMuc3RyaWN0TnVtYmVycywgdHJ1ZSkpICsgJykgY29udGludWU7ICc7XG4gICAgICBpZiAoJHR5cGVJc0FycmF5KSB7XG4gICAgICAgIG91dCArPSAnIGlmICh0eXBlb2YgaXRlbSA9PSBcXCdzdHJpbmdcXCcpIGl0ZW0gPSBcXCdcIlxcJyArIGl0ZW07ICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyBpZiAodHlwZW9mIGl0ZW1JbmRpY2VzW2l0ZW1dID09IFxcJ251bWJlclxcJykgeyAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7IGogPSBpdGVtSW5kaWNlc1tpdGVtXTsgYnJlYWs7IH0gaXRlbUluZGljZXNbaXRlbV0gPSBpOyB9ICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgb3V0ICs9ICcgIH0gICc7XG4gICAgfVxuICAgIG91dCArPSAnIGlmICghJyArICgkdmFsaWQpICsgJykgeyAgICc7XG4gICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ3VuaXF1ZUl0ZW1zJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBpOiBpLCBqOiBqIH0gJztcbiAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBOT1QgaGF2ZSBkdXBsaWNhdGUgaXRlbXMgKGl0ZW1zICMjIFxcJyArIGogKyBcXCcgYW5kIFxcJyArIGkgKyBcXCcgYXJlIGlkZW50aWNhbClcXCcgJztcbiAgICAgIH1cbiAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6ICAnO1xuICAgICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcnICsgKCRzY2hlbWEpO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnICAgICAgICAgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgfVxuICAgIHZhciBfX2VyciA9IG91dDtcbiAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvdW5pcXVlSXRlbXMuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfdmFsaWRhdGUoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcnO1xuICB2YXIgJGFzeW5jID0gaXQuc2NoZW1hLiRhc3luYyA9PT0gdHJ1ZSxcbiAgICAkcmVmS2V5d29yZHMgPSBpdC51dGlsLnNjaGVtYUhhc1J1bGVzRXhjZXB0KGl0LnNjaGVtYSwgaXQuUlVMRVMuYWxsLCAnJHJlZicpLFxuICAgICRpZCA9IGl0LnNlbGYuX2dldElkKGl0LnNjaGVtYSk7XG4gIGlmIChpdC5vcHRzLnN0cmljdEtleXdvcmRzKSB7XG4gICAgdmFyICR1bmtub3duS3dkID0gaXQudXRpbC5zY2hlbWFVbmtub3duUnVsZXMoaXQuc2NoZW1hLCBpdC5SVUxFUy5rZXl3b3Jkcyk7XG4gICAgaWYgKCR1bmtub3duS3dkKSB7XG4gICAgICB2YXIgJGtleXdvcmRzTXNnID0gJ3Vua25vd24ga2V5d29yZDogJyArICR1bmtub3duS3dkO1xuICAgICAgaWYgKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPT09ICdsb2cnKSBpdC5sb2dnZXIud2Fybigka2V5d29yZHNNc2cpO1xuICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJGtleXdvcmRzTXNnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGl0LmlzVG9wKSB7XG4gICAgb3V0ICs9ICcgdmFyIHZhbGlkYXRlID0gJztcbiAgICBpZiAoJGFzeW5jKSB7XG4gICAgICBpdC5hc3luYyA9IHRydWU7XG4gICAgICBvdXQgKz0gJ2FzeW5jICc7XG4gICAgfVxuICAgIG91dCArPSAnZnVuY3Rpb24oZGF0YSwgZGF0YVBhdGgsIHBhcmVudERhdGEsIHBhcmVudERhdGFQcm9wZXJ0eSwgcm9vdERhdGEpIHsgXFwndXNlIHN0cmljdFxcJzsgJztcbiAgICBpZiAoJGlkICYmIChpdC5vcHRzLnNvdXJjZUNvZGUgfHwgaXQub3B0cy5wcm9jZXNzQ29kZSkpIHtcbiAgICAgIG91dCArPSAnICcgKyAoJy9cXCojIHNvdXJjZVVSTD0nICsgJGlkICsgJyAqLycpICsgJyAnO1xuICAgIH1cbiAgfVxuICBpZiAodHlwZW9mIGl0LnNjaGVtYSA9PSAnYm9vbGVhbicgfHwgISgkcmVmS2V5d29yZHMgfHwgaXQuc2NoZW1hLiRyZWYpKSB7XG4gICAgdmFyICRrZXl3b3JkID0gJ2ZhbHNlIHNjaGVtYSc7XG4gICAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gICAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICAgIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gICAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gICAgdmFyICRlcnJvcktleXdvcmQ7XG4gICAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmw7XG4gICAgaWYgKGl0LnNjaGVtYSA9PT0gZmFsc2UpIHtcbiAgICAgIGlmIChpdC5pc1RvcCkge1xuICAgICAgICAkYnJlYWtPbkVycm9yID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhciAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7ICc7XG4gICAgICB9XG4gICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ2ZhbHNlIHNjaGVtYScpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHt9ICc7XG4gICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnYm9vbGVhbiBzY2hlbWEgaXMgZmFsc2VcXCcgJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IGZhbHNlICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICB9XG4gICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGl0LmlzVG9wKSB7XG4gICAgICAgIGlmICgkYXN5bmMpIHtcbiAgICAgICAgICBvdXQgKz0gJyByZXR1cm4gZGF0YTsgJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBudWxsOyByZXR1cm4gdHJ1ZTsgJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJHZhbGlkKSArICcgPSB0cnVlOyAnO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXQuaXNUb3ApIHtcbiAgICAgIG91dCArPSAnIH07IHJldHVybiB2YWxpZGF0ZTsgJztcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuICBpZiAoaXQuaXNUb3ApIHtcbiAgICB2YXIgJHRvcCA9IGl0LmlzVG9wLFxuICAgICAgJGx2bCA9IGl0LmxldmVsID0gMCxcbiAgICAgICRkYXRhTHZsID0gaXQuZGF0YUxldmVsID0gMCxcbiAgICAgICRkYXRhID0gJ2RhdGEnO1xuICAgIGl0LnJvb3RJZCA9IGl0LnJlc29sdmUuZnVsbFBhdGgoaXQuc2VsZi5fZ2V0SWQoaXQucm9vdC5zY2hlbWEpKTtcbiAgICBpdC5iYXNlSWQgPSBpdC5iYXNlSWQgfHwgaXQucm9vdElkO1xuICAgIGRlbGV0ZSBpdC5pc1RvcDtcbiAgICBpdC5kYXRhUGF0aEFyciA9IFtcIlwiXTtcbiAgICBpZiAoaXQuc2NoZW1hLmRlZmF1bHQgIT09IHVuZGVmaW5lZCAmJiBpdC5vcHRzLnVzZURlZmF1bHRzICYmIGl0Lm9wdHMuc3RyaWN0RGVmYXVsdHMpIHtcbiAgICAgIHZhciAkZGVmYXVsdE1zZyA9ICdkZWZhdWx0IGlzIGlnbm9yZWQgaW4gdGhlIHNjaGVtYSByb290JztcbiAgICAgIGlmIChpdC5vcHRzLnN0cmljdERlZmF1bHRzID09PSAnbG9nJykgaXQubG9nZ2VyLndhcm4oJGRlZmF1bHRNc2cpO1xuICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJGRlZmF1bHRNc2cpO1xuICAgIH1cbiAgICBvdXQgKz0gJyB2YXIgdkVycm9ycyA9IG51bGw7ICc7XG4gICAgb3V0ICs9ICcgdmFyIGVycm9ycyA9IDA7ICAgICAnO1xuICAgIG91dCArPSAnIGlmIChyb290RGF0YSA9PT0gdW5kZWZpbmVkKSByb290RGF0YSA9IGRhdGE7ICc7XG4gIH0gZWxzZSB7XG4gICAgdmFyICRsdmwgPSBpdC5sZXZlbCxcbiAgICAgICRkYXRhTHZsID0gaXQuZGF0YUxldmVsLFxuICAgICAgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICAgIGlmICgkaWQpIGl0LmJhc2VJZCA9IGl0LnJlc29sdmUudXJsKGl0LmJhc2VJZCwgJGlkKTtcbiAgICBpZiAoJGFzeW5jICYmICFpdC5hc3luYykgdGhyb3cgbmV3IEVycm9yKCdhc3luYyBzY2hlbWEgaW4gc3luYyBzY2hlbWEnKTtcbiAgICBvdXQgKz0gJyB2YXIgZXJyc18nICsgKCRsdmwpICsgJyA9IGVycm9yczsnO1xuICB9XG4gIHZhciAkdmFsaWQgPSAndmFsaWQnICsgJGx2bCxcbiAgICAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzLFxuICAgICRjbG9zaW5nQnJhY2VzMSA9ICcnLFxuICAgICRjbG9zaW5nQnJhY2VzMiA9ICcnO1xuICB2YXIgJGVycm9yS2V5d29yZDtcbiAgdmFyICR0eXBlU2NoZW1hID0gaXQuc2NoZW1hLnR5cGUsXG4gICAgJHR5cGVJc0FycmF5ID0gQXJyYXkuaXNBcnJheSgkdHlwZVNjaGVtYSk7XG4gIGlmICgkdHlwZVNjaGVtYSAmJiBpdC5vcHRzLm51bGxhYmxlICYmIGl0LnNjaGVtYS5udWxsYWJsZSA9PT0gdHJ1ZSkge1xuICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgIGlmICgkdHlwZVNjaGVtYS5pbmRleE9mKCdudWxsJykgPT0gLTEpICR0eXBlU2NoZW1hID0gJHR5cGVTY2hlbWEuY29uY2F0KCdudWxsJyk7XG4gICAgfSBlbHNlIGlmICgkdHlwZVNjaGVtYSAhPSAnbnVsbCcpIHtcbiAgICAgICR0eXBlU2NoZW1hID0gWyR0eXBlU2NoZW1hLCAnbnVsbCddO1xuICAgICAgJHR5cGVJc0FycmF5ID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgaWYgKCR0eXBlSXNBcnJheSAmJiAkdHlwZVNjaGVtYS5sZW5ndGggPT0gMSkge1xuICAgICR0eXBlU2NoZW1hID0gJHR5cGVTY2hlbWFbMF07XG4gICAgJHR5cGVJc0FycmF5ID0gZmFsc2U7XG4gIH1cbiAgaWYgKGl0LnNjaGVtYS4kcmVmICYmICRyZWZLZXl3b3Jkcykge1xuICAgIGlmIChpdC5vcHRzLmV4dGVuZFJlZnMgPT0gJ2ZhaWwnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJyRyZWY6IHZhbGlkYXRpb24ga2V5d29yZHMgdXNlZCBpbiBzY2hlbWEgYXQgcGF0aCBcIicgKyBpdC5lcnJTY2hlbWFQYXRoICsgJ1wiIChzZWUgb3B0aW9uIGV4dGVuZFJlZnMpJyk7XG4gICAgfSBlbHNlIGlmIChpdC5vcHRzLmV4dGVuZFJlZnMgIT09IHRydWUpIHtcbiAgICAgICRyZWZLZXl3b3JkcyA9IGZhbHNlO1xuICAgICAgaXQubG9nZ2VyLndhcm4oJyRyZWY6IGtleXdvcmRzIGlnbm9yZWQgaW4gc2NoZW1hIGF0IHBhdGggXCInICsgaXQuZXJyU2NoZW1hUGF0aCArICdcIicpO1xuICAgIH1cbiAgfVxuICBpZiAoaXQuc2NoZW1hLiRjb21tZW50ICYmIGl0Lm9wdHMuJGNvbW1lbnQpIHtcbiAgICBvdXQgKz0gJyAnICsgKGl0LlJVTEVTLmFsbC4kY29tbWVudC5jb2RlKGl0LCAnJGNvbW1lbnQnKSk7XG4gIH1cbiAgaWYgKCR0eXBlU2NoZW1hKSB7XG4gICAgaWYgKGl0Lm9wdHMuY29lcmNlVHlwZXMpIHtcbiAgICAgIHZhciAkY29lcmNlVG9UeXBlcyA9IGl0LnV0aWwuY29lcmNlVG9UeXBlcyhpdC5vcHRzLmNvZXJjZVR5cGVzLCAkdHlwZVNjaGVtYSk7XG4gICAgfVxuICAgIHZhciAkcnVsZXNHcm91cCA9IGl0LlJVTEVTLnR5cGVzWyR0eXBlU2NoZW1hXTtcbiAgICBpZiAoJGNvZXJjZVRvVHlwZXMgfHwgJHR5cGVJc0FycmF5IHx8ICRydWxlc0dyb3VwID09PSB0cnVlIHx8ICgkcnVsZXNHcm91cCAmJiAhJHNob3VsZFVzZUdyb3VwKCRydWxlc0dyb3VwKSkpIHtcbiAgICAgIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyAnLnR5cGUnLFxuICAgICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnL3R5cGUnO1xuICAgICAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArICcudHlwZScsXG4gICAgICAgICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvdHlwZScsXG4gICAgICAgICRtZXRob2QgPSAkdHlwZUlzQXJyYXkgPyAnY2hlY2tEYXRhVHlwZXMnIDogJ2NoZWNrRGF0YVR5cGUnO1xuICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoaXQudXRpbFskbWV0aG9kXSgkdHlwZVNjaGVtYSwgJGRhdGEsIGl0Lm9wdHMuc3RyaWN0TnVtYmVycywgdHJ1ZSkpICsgJykgeyAnO1xuICAgICAgaWYgKCRjb2VyY2VUb1R5cGVzKSB7XG4gICAgICAgIHZhciAkZGF0YVR5cGUgPSAnZGF0YVR5cGUnICsgJGx2bCxcbiAgICAgICAgICAkY29lcmNlZCA9ICdjb2VyY2VkJyArICRsdmw7XG4gICAgICAgIG91dCArPSAnIHZhciAnICsgKCRkYXRhVHlwZSkgKyAnID0gdHlwZW9mICcgKyAoJGRhdGEpICsgJzsgdmFyICcgKyAoJGNvZXJjZWQpICsgJyA9IHVuZGVmaW5lZDsgJztcbiAgICAgICAgaWYgKGl0Lm9wdHMuY29lcmNlVHlwZXMgPT0gJ2FycmF5Jykge1xuICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCRkYXRhVHlwZSkgKyAnID09IFxcJ29iamVjdFxcJyAmJiBBcnJheS5pc0FycmF5KCcgKyAoJGRhdGEpICsgJykgJiYgJyArICgkZGF0YSkgKyAnLmxlbmd0aCA9PSAxKSB7ICcgKyAoJGRhdGEpICsgJyA9ICcgKyAoJGRhdGEpICsgJ1swXTsgJyArICgkZGF0YVR5cGUpICsgJyA9IHR5cGVvZiAnICsgKCRkYXRhKSArICc7IGlmICgnICsgKGl0LnV0aWwuY2hlY2tEYXRhVHlwZShpdC5zY2hlbWEudHlwZSwgJGRhdGEsIGl0Lm9wdHMuc3RyaWN0TnVtYmVycykpICsgJykgJyArICgkY29lcmNlZCkgKyAnID0gJyArICgkZGF0YSkgKyAnOyB9ICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJGNvZXJjZWQpICsgJyAhPT0gdW5kZWZpbmVkKSA7ICc7XG4gICAgICAgIHZhciBhcnIxID0gJGNvZXJjZVRvVHlwZXM7XG4gICAgICAgIGlmIChhcnIxKSB7XG4gICAgICAgICAgdmFyICR0eXBlLCAkaSA9IC0xLFxuICAgICAgICAgICAgbDEgPSBhcnIxLmxlbmd0aCAtIDE7XG4gICAgICAgICAgd2hpbGUgKCRpIDwgbDEpIHtcbiAgICAgICAgICAgICR0eXBlID0gYXJyMVskaSArPSAxXTtcbiAgICAgICAgICAgIGlmICgkdHlwZSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyBlbHNlIGlmICgnICsgKCRkYXRhVHlwZSkgKyAnID09IFxcJ251bWJlclxcJyB8fCAnICsgKCRkYXRhVHlwZSkgKyAnID09IFxcJ2Jvb2xlYW5cXCcpICcgKyAoJGNvZXJjZWQpICsgJyA9IFxcJ1xcJyArICcgKyAoJGRhdGEpICsgJzsgZWxzZSBpZiAoJyArICgkZGF0YSkgKyAnID09PSBudWxsKSAnICsgKCRjb2VyY2VkKSArICcgPSBcXCdcXCc7ICc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCR0eXBlID09ICdudW1iZXInIHx8ICR0eXBlID09ICdpbnRlZ2VyJykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyBlbHNlIGlmICgnICsgKCRkYXRhVHlwZSkgKyAnID09IFxcJ2Jvb2xlYW5cXCcgfHwgJyArICgkZGF0YSkgKyAnID09PSBudWxsIHx8ICgnICsgKCRkYXRhVHlwZSkgKyAnID09IFxcJ3N0cmluZ1xcJyAmJiAnICsgKCRkYXRhKSArICcgJiYgJyArICgkZGF0YSkgKyAnID09ICsnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICAgICAgaWYgKCR0eXBlID09ICdpbnRlZ2VyJykge1xuICAgICAgICAgICAgICAgIG91dCArPSAnICYmICEoJyArICgkZGF0YSkgKyAnICUgMSknO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG91dCArPSAnKSkgJyArICgkY29lcmNlZCkgKyAnID0gKycgKyAoJGRhdGEpICsgJzsgJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJHR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIGVsc2UgaWYgKCcgKyAoJGRhdGEpICsgJyA9PT0gXFwnZmFsc2VcXCcgfHwgJyArICgkZGF0YSkgKyAnID09PSAwIHx8ICcgKyAoJGRhdGEpICsgJyA9PT0gbnVsbCkgJyArICgkY29lcmNlZCkgKyAnID0gZmFsc2U7IGVsc2UgaWYgKCcgKyAoJGRhdGEpICsgJyA9PT0gXFwndHJ1ZVxcJyB8fCAnICsgKCRkYXRhKSArICcgPT09IDEpICcgKyAoJGNvZXJjZWQpICsgJyA9IHRydWU7ICc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCR0eXBlID09ICdudWxsJykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyBlbHNlIGlmICgnICsgKCRkYXRhKSArICcgPT09IFxcJ1xcJyB8fCAnICsgKCRkYXRhKSArICcgPT09IDAgfHwgJyArICgkZGF0YSkgKyAnID09PSBmYWxzZSkgJyArICgkY29lcmNlZCkgKyAnID0gbnVsbDsgJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXQub3B0cy5jb2VyY2VUeXBlcyA9PSAnYXJyYXknICYmICR0eXBlID09ICdhcnJheScpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgZWxzZSBpZiAoJyArICgkZGF0YVR5cGUpICsgJyA9PSBcXCdzdHJpbmdcXCcgfHwgJyArICgkZGF0YVR5cGUpICsgJyA9PSBcXCdudW1iZXJcXCcgfHwgJyArICgkZGF0YVR5cGUpICsgJyA9PSBcXCdib29sZWFuXFwnIHx8ICcgKyAoJGRhdGEpICsgJyA9PSBudWxsKSAnICsgKCRjb2VyY2VkKSArICcgPSBbJyArICgkZGF0YSkgKyAnXTsgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgZWxzZSB7ICAgJztcbiAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ3R5cGUnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IHR5cGU6IFxcJyc7XG4gICAgICAgICAgaWYgKCR0eXBlSXNBcnJheSkge1xuICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hLmpvaW4oXCIsXCIpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICdcXCcgfSAnO1xuICAgICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgYmUgJztcbiAgICAgICAgICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hLmpvaW4oXCIsXCIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJ1xcJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIH0gaWYgKCcgKyAoJGNvZXJjZWQpICsgJyAhPT0gdW5kZWZpbmVkKSB7ICAnO1xuICAgICAgICB2YXIgJHBhcmVudERhdGEgPSAkZGF0YUx2bCA/ICdkYXRhJyArICgoJGRhdGFMdmwgLSAxKSB8fCAnJykgOiAncGFyZW50RGF0YScsXG4gICAgICAgICAgJHBhcmVudERhdGFQcm9wZXJ0eSA9ICRkYXRhTHZsID8gaXQuZGF0YVBhdGhBcnJbJGRhdGFMdmxdIDogJ3BhcmVudERhdGFQcm9wZXJ0eSc7XG4gICAgICAgIG91dCArPSAnICcgKyAoJGRhdGEpICsgJyA9ICcgKyAoJGNvZXJjZWQpICsgJzsgJztcbiAgICAgICAgaWYgKCEkZGF0YUx2bCkge1xuICAgICAgICAgIG91dCArPSAnaWYgKCcgKyAoJHBhcmVudERhdGEpICsgJyAhPT0gdW5kZWZpbmVkKSc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgJyArICgkcGFyZW50RGF0YSkgKyAnWycgKyAoJHBhcmVudERhdGFQcm9wZXJ0eSkgKyAnXSA9ICcgKyAoJGNvZXJjZWQpICsgJzsgfSAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ3R5cGUnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IHR5cGU6IFxcJyc7XG4gICAgICAgICAgaWYgKCR0eXBlSXNBcnJheSkge1xuICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hLmpvaW4oXCIsXCIpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICdcXCcgfSAnO1xuICAgICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgYmUgJztcbiAgICAgICAgICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hLmpvaW4oXCIsXCIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJ1xcJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfVxuICB9XG4gIGlmIChpdC5zY2hlbWEuJHJlZiAmJiAhJHJlZktleXdvcmRzKSB7XG4gICAgb3V0ICs9ICcgJyArIChpdC5SVUxFUy5hbGwuJHJlZi5jb2RlKGl0LCAnJHJlZicpKSArICcgJztcbiAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgb3V0ICs9ICcgfSBpZiAoZXJyb3JzID09PSAnO1xuICAgICAgaWYgKCR0b3ApIHtcbiAgICAgICAgb3V0ICs9ICcwJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnZXJyc18nICsgKCRsdmwpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcpIHsgJztcbiAgICAgICRjbG9zaW5nQnJhY2VzMiArPSAnfSc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBhcnIyID0gaXQuUlVMRVM7XG4gICAgaWYgKGFycjIpIHtcbiAgICAgIHZhciAkcnVsZXNHcm91cCwgaTIgPSAtMSxcbiAgICAgICAgbDIgPSBhcnIyLmxlbmd0aCAtIDE7XG4gICAgICB3aGlsZSAoaTIgPCBsMikge1xuICAgICAgICAkcnVsZXNHcm91cCA9IGFycjJbaTIgKz0gMV07XG4gICAgICAgIGlmICgkc2hvdWxkVXNlR3JvdXAoJHJ1bGVzR3JvdXApKSB7XG4gICAgICAgICAgaWYgKCRydWxlc0dyb3VwLnR5cGUpIHtcbiAgICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKGl0LnV0aWwuY2hlY2tEYXRhVHlwZSgkcnVsZXNHcm91cC50eXBlLCAkZGF0YSwgaXQub3B0cy5zdHJpY3ROdW1iZXJzKSkgKyAnKSB7ICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpdC5vcHRzLnVzZURlZmF1bHRzKSB7XG4gICAgICAgICAgICBpZiAoJHJ1bGVzR3JvdXAudHlwZSA9PSAnb2JqZWN0JyAmJiBpdC5zY2hlbWEucHJvcGVydGllcykge1xuICAgICAgICAgICAgICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYS5wcm9wZXJ0aWVzLFxuICAgICAgICAgICAgICAgICRzY2hlbWFLZXlzID0gT2JqZWN0LmtleXMoJHNjaGVtYSk7XG4gICAgICAgICAgICAgIHZhciBhcnIzID0gJHNjaGVtYUtleXM7XG4gICAgICAgICAgICAgIGlmIChhcnIzKSB7XG4gICAgICAgICAgICAgICAgdmFyICRwcm9wZXJ0eUtleSwgaTMgPSAtMSxcbiAgICAgICAgICAgICAgICAgIGwzID0gYXJyMy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgIHdoaWxlIChpMyA8IGwzKSB7XG4gICAgICAgICAgICAgICAgICAkcHJvcGVydHlLZXkgPSBhcnIzW2kzICs9IDFdO1xuICAgICAgICAgICAgICAgICAgdmFyICRzY2ggPSAkc2NoZW1hWyRwcm9wZXJ0eUtleV07XG4gICAgICAgICAgICAgICAgICBpZiAoJHNjaC5kZWZhdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgkcHJvcGVydHlLZXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXQuY29tcG9zaXRlUnVsZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLnN0cmljdERlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgJGRlZmF1bHRNc2cgPSAnZGVmYXVsdCBpcyBpZ25vcmVkIGZvcjogJyArICRwYXNzRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLnN0cmljdERlZmF1bHRzID09PSAnbG9nJykgaXQubG9nZ2VyLndhcm4oJGRlZmF1bHRNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJGRlZmF1bHRNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJyBpZiAoJyArICgkcGFzc0RhdGEpICsgJyA9PT0gdW5kZWZpbmVkICc7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudXNlRGVmYXVsdHMgPT0gJ2VtcHR5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgJyArICgkcGFzc0RhdGEpICsgJyA9PT0gbnVsbCB8fCAnICsgKCRwYXNzRGF0YSkgKyAnID09PSBcXCdcXCcgJztcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgKSAnICsgKCRwYXNzRGF0YSkgKyAnID0gJztcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy51c2VEZWZhdWx0cyA9PSAnc2hhcmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51c2VEZWZhdWx0KCRzY2guZGVmYXVsdCkpICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJyAnICsgKEpTT04uc3RyaW5naWZ5KCRzY2guZGVmYXVsdCkpICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJzsgJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICgkcnVsZXNHcm91cC50eXBlID09ICdhcnJheScgJiYgQXJyYXkuaXNBcnJheShpdC5zY2hlbWEuaXRlbXMpKSB7XG4gICAgICAgICAgICAgIHZhciBhcnI0ID0gaXQuc2NoZW1hLml0ZW1zO1xuICAgICAgICAgICAgICBpZiAoYXJyNCkge1xuICAgICAgICAgICAgICAgIHZhciAkc2NoLCAkaSA9IC0xLFxuICAgICAgICAgICAgICAgICAgbDQgPSBhcnI0Lmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgd2hpbGUgKCRpIDwgbDQpIHtcbiAgICAgICAgICAgICAgICAgICRzY2ggPSBhcnI0WyRpICs9IDFdO1xuICAgICAgICAgICAgICAgICAgaWYgKCRzY2guZGVmYXVsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkcGFzc0RhdGEgPSAkZGF0YSArICdbJyArICRpICsgJ10nO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXQuY29tcG9zaXRlUnVsZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLnN0cmljdERlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgJGRlZmF1bHRNc2cgPSAnZGVmYXVsdCBpcyBpZ25vcmVkIGZvcjogJyArICRwYXNzRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLnN0cmljdERlZmF1bHRzID09PSAnbG9nJykgaXQubG9nZ2VyLndhcm4oJGRlZmF1bHRNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJGRlZmF1bHRNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJyBpZiAoJyArICgkcGFzc0RhdGEpICsgJyA9PT0gdW5kZWZpbmVkICc7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudXNlRGVmYXVsdHMgPT0gJ2VtcHR5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgJyArICgkcGFzc0RhdGEpICsgJyA9PT0gbnVsbCB8fCAnICsgKCRwYXNzRGF0YSkgKyAnID09PSBcXCdcXCcgJztcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgKSAnICsgKCRwYXNzRGF0YSkgKyAnID0gJztcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy51c2VEZWZhdWx0cyA9PSAnc2hhcmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51c2VEZWZhdWx0KCRzY2guZGVmYXVsdCkpICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJyAnICsgKEpTT04uc3RyaW5naWZ5KCRzY2guZGVmYXVsdCkpICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJzsgJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgYXJyNSA9ICRydWxlc0dyb3VwLnJ1bGVzO1xuICAgICAgICAgIGlmIChhcnI1KSB7XG4gICAgICAgICAgICB2YXIgJHJ1bGUsIGk1ID0gLTEsXG4gICAgICAgICAgICAgIGw1ID0gYXJyNS5sZW5ndGggLSAxO1xuICAgICAgICAgICAgd2hpbGUgKGk1IDwgbDUpIHtcbiAgICAgICAgICAgICAgJHJ1bGUgPSBhcnI1W2k1ICs9IDFdO1xuICAgICAgICAgICAgICBpZiAoJHNob3VsZFVzZVJ1bGUoJHJ1bGUpKSB7XG4gICAgICAgICAgICAgICAgdmFyICRjb2RlID0gJHJ1bGUuY29kZShpdCwgJHJ1bGUua2V5d29yZCwgJHJ1bGVzR3JvdXAudHlwZSk7XG4gICAgICAgICAgICAgICAgaWYgKCRjb2RlKSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJyAnICsgKCRjb2RlKSArICcgJztcbiAgICAgICAgICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICRjbG9zaW5nQnJhY2VzMSArPSAnfSc7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAnICsgKCRjbG9zaW5nQnJhY2VzMSkgKyAnICc7XG4gICAgICAgICAgICAkY2xvc2luZ0JyYWNlczEgPSAnJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCRydWxlc0dyb3VwLnR5cGUpIHtcbiAgICAgICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgICAgICAgIGlmICgkdHlwZVNjaGVtYSAmJiAkdHlwZVNjaGVtYSA9PT0gJHJ1bGVzR3JvdXAudHlwZSAmJiAhJGNvZXJjZVRvVHlwZXMpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gICAgICAgICAgICAgIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyAnLnR5cGUnLFxuICAgICAgICAgICAgICAgICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvdHlwZSc7XG4gICAgICAgICAgICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAgICAgICAgICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgICAgICAgICAgIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgICAgICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgkZXJyb3JLZXl3b3JkIHx8ICd0eXBlJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyB0eXBlOiBcXCcnO1xuICAgICAgICAgICAgICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYS5qb2luKFwiLFwiKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dCArPSAnXFwnIH0gJztcbiAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGJlICc7XG4gICAgICAgICAgICAgICAgICBpZiAoJHR5cGVJc0FycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYS5qb2luKFwiLFwiKSk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJycgKyAoJHR5cGVTY2hlbWEpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBpZiAoZXJyb3JzID09PSAnO1xuICAgICAgICAgICAgaWYgKCR0b3ApIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcwJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG91dCArPSAnZXJyc18nICsgKCRsdmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICcpIHsgJztcbiAgICAgICAgICAgICRjbG9zaW5nQnJhY2VzMiArPSAnfSc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgJyArICgkY2xvc2luZ0JyYWNlczIpICsgJyAnO1xuICB9XG4gIGlmICgkdG9wKSB7XG4gICAgaWYgKCRhc3luYykge1xuICAgICAgb3V0ICs9ICcgaWYgKGVycm9ycyA9PT0gMCkgcmV0dXJuIGRhdGE7ICAgICAgICAgICAnO1xuICAgICAgb3V0ICs9ICcgZWxzZSB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKHZFcnJvcnMpOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSB2RXJyb3JzOyAnO1xuICAgICAgb3V0ICs9ICcgcmV0dXJuIGVycm9ycyA9PT0gMDsgICAgICAgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfTsgcmV0dXJuIHZhbGlkYXRlOyc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyICcgKyAoJHZhbGlkKSArICcgPSBlcnJvcnMgPT09IGVycnNfJyArICgkbHZsKSArICc7JztcbiAgfVxuXG4gIGZ1bmN0aW9uICRzaG91bGRVc2VHcm91cCgkcnVsZXNHcm91cCkge1xuICAgIHZhciBydWxlcyA9ICRydWxlc0dyb3VwLnJ1bGVzO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcnVsZXMubGVuZ3RoOyBpKyspXG4gICAgICBpZiAoJHNob3VsZFVzZVJ1bGUocnVsZXNbaV0pKSByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uICRzaG91bGRVc2VSdWxlKCRydWxlKSB7XG4gICAgcmV0dXJuIGl0LnNjaGVtYVskcnVsZS5rZXl3b3JkXSAhPT0gdW5kZWZpbmVkIHx8ICgkcnVsZS5pbXBsZW1lbnRzICYmICRydWxlSW1wbGVtZW50c1NvbWVLZXl3b3JkKCRydWxlKSk7XG4gIH1cblxuICBmdW5jdGlvbiAkcnVsZUltcGxlbWVudHNTb21lS2V5d29yZCgkcnVsZSkge1xuICAgIHZhciBpbXBsID0gJHJ1bGUuaW1wbGVtZW50cztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGltcGwubGVuZ3RoOyBpKyspXG4gICAgICBpZiAoaXQuc2NoZW1hW2ltcGxbaV1dICE9PSB1bmRlZmluZWQpIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvdmFsaWRhdGUuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxudmFyIElERU5USUZJRVIgPSAvXlthLXpfJF1bYS16MC05XyQtXSokL2k7XG52YXIgY3VzdG9tUnVsZUNvZGUgPSByZXF1aXJlKCcuL2RvdGpzL2N1c3RvbScpO1xudmFyIGRlZmluaXRpb25TY2hlbWEgPSByZXF1aXJlKCcuL2RlZmluaXRpb25fc2NoZW1hJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBhZGQ6IGFkZEtleXdvcmQsXG4gIGdldDogZ2V0S2V5d29yZCxcbiAgcmVtb3ZlOiByZW1vdmVLZXl3b3JkLFxuICB2YWxpZGF0ZTogdmFsaWRhdGVLZXl3b3JkXG59O1xuXG5cbi8qKlxuICogRGVmaW5lIGN1c3RvbSBrZXl3b3JkXG4gKiBAdGhpcyAgQWp2XG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5d29yZCBjdXN0b20ga2V5d29yZCwgc2hvdWxkIGJlIHVuaXF1ZSAoaW5jbHVkaW5nIGRpZmZlcmVudCBmcm9tIGFsbCBzdGFuZGFyZCwgY3VzdG9tIGFuZCBtYWNybyBrZXl3b3JkcykuXG4gKiBAcGFyYW0ge09iamVjdH0gZGVmaW5pdGlvbiBrZXl3b3JkIGRlZmluaXRpb24gb2JqZWN0IHdpdGggcHJvcGVydGllcyBgdHlwZWAgKHR5cGUocykgd2hpY2ggdGhlIGtleXdvcmQgYXBwbGllcyB0byksIGB2YWxpZGF0ZWAgb3IgYGNvbXBpbGVgLlxuICogQHJldHVybiB7QWp2fSB0aGlzIGZvciBtZXRob2QgY2hhaW5pbmdcbiAqL1xuZnVuY3Rpb24gYWRkS2V5d29yZChrZXl3b3JkLCBkZWZpbml0aW9uKSB7XG4gIC8qIGpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgLyogZXNsaW50IG5vLXNoYWRvdzogMCAqL1xuICB2YXIgUlVMRVMgPSB0aGlzLlJVTEVTO1xuICBpZiAoUlVMRVMua2V5d29yZHNba2V5d29yZF0pXG4gICAgdGhyb3cgbmV3IEVycm9yKCdLZXl3b3JkICcgKyBrZXl3b3JkICsgJyBpcyBhbHJlYWR5IGRlZmluZWQnKTtcblxuICBpZiAoIUlERU5USUZJRVIudGVzdChrZXl3b3JkKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0tleXdvcmQgJyArIGtleXdvcmQgKyAnIGlzIG5vdCBhIHZhbGlkIGlkZW50aWZpZXInKTtcblxuICBpZiAoZGVmaW5pdGlvbikge1xuICAgIHRoaXMudmFsaWRhdGVLZXl3b3JkKGRlZmluaXRpb24sIHRydWUpO1xuXG4gICAgdmFyIGRhdGFUeXBlID0gZGVmaW5pdGlvbi50eXBlO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGFUeXBlKSkge1xuICAgICAgZm9yICh2YXIgaT0wOyBpPGRhdGFUeXBlLmxlbmd0aDsgaSsrKVxuICAgICAgICBfYWRkUnVsZShrZXl3b3JkLCBkYXRhVHlwZVtpXSwgZGVmaW5pdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9hZGRSdWxlKGtleXdvcmQsIGRhdGFUeXBlLCBkZWZpbml0aW9uKTtcbiAgICB9XG5cbiAgICB2YXIgbWV0YVNjaGVtYSA9IGRlZmluaXRpb24ubWV0YVNjaGVtYTtcbiAgICBpZiAobWV0YVNjaGVtYSkge1xuICAgICAgaWYgKGRlZmluaXRpb24uJGRhdGEgJiYgdGhpcy5fb3B0cy4kZGF0YSkge1xuICAgICAgICBtZXRhU2NoZW1hID0ge1xuICAgICAgICAgIGFueU9mOiBbXG4gICAgICAgICAgICBtZXRhU2NoZW1hLFxuICAgICAgICAgICAgeyAnJHJlZic6ICdodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vYWp2LXZhbGlkYXRvci9hanYvbWFzdGVyL2xpYi9yZWZzL2RhdGEuanNvbiMnIH1cbiAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBkZWZpbml0aW9uLnZhbGlkYXRlU2NoZW1hID0gdGhpcy5jb21waWxlKG1ldGFTY2hlbWEsIHRydWUpO1xuICAgIH1cbiAgfVxuXG4gIFJVTEVTLmtleXdvcmRzW2tleXdvcmRdID0gUlVMRVMuYWxsW2tleXdvcmRdID0gdHJ1ZTtcblxuXG4gIGZ1bmN0aW9uIF9hZGRSdWxlKGtleXdvcmQsIGRhdGFUeXBlLCBkZWZpbml0aW9uKSB7XG4gICAgdmFyIHJ1bGVHcm91cDtcbiAgICBmb3IgKHZhciBpPTA7IGk8UlVMRVMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciByZyA9IFJVTEVTW2ldO1xuICAgICAgaWYgKHJnLnR5cGUgPT0gZGF0YVR5cGUpIHtcbiAgICAgICAgcnVsZUdyb3VwID0gcmc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghcnVsZUdyb3VwKSB7XG4gICAgICBydWxlR3JvdXAgPSB7IHR5cGU6IGRhdGFUeXBlLCBydWxlczogW10gfTtcbiAgICAgIFJVTEVTLnB1c2gocnVsZUdyb3VwKTtcbiAgICB9XG5cbiAgICB2YXIgcnVsZSA9IHtcbiAgICAgIGtleXdvcmQ6IGtleXdvcmQsXG4gICAgICBkZWZpbml0aW9uOiBkZWZpbml0aW9uLFxuICAgICAgY3VzdG9tOiB0cnVlLFxuICAgICAgY29kZTogY3VzdG9tUnVsZUNvZGUsXG4gICAgICBpbXBsZW1lbnRzOiBkZWZpbml0aW9uLmltcGxlbWVudHNcbiAgICB9O1xuICAgIHJ1bGVHcm91cC5ydWxlcy5wdXNoKHJ1bGUpO1xuICAgIFJVTEVTLmN1c3RvbVtrZXl3b3JkXSA9IHJ1bGU7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn1cblxuXG4vKipcbiAqIEdldCBrZXl3b3JkXG4gKiBAdGhpcyAgQWp2XG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5d29yZCBwcmUtZGVmaW5lZCBvciBjdXN0b20ga2V5d29yZC5cbiAqIEByZXR1cm4ge09iamVjdHxCb29sZWFufSBjdXN0b20ga2V5d29yZCBkZWZpbml0aW9uLCBgdHJ1ZWAgaWYgaXQgaXMgYSBwcmVkZWZpbmVkIGtleXdvcmQsIGBmYWxzZWAgb3RoZXJ3aXNlLlxuICovXG5mdW5jdGlvbiBnZXRLZXl3b3JkKGtleXdvcmQpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICB2YXIgcnVsZSA9IHRoaXMuUlVMRVMuY3VzdG9tW2tleXdvcmRdO1xuICByZXR1cm4gcnVsZSA/IHJ1bGUuZGVmaW5pdGlvbiA6IHRoaXMuUlVMRVMua2V5d29yZHNba2V5d29yZF0gfHwgZmFsc2U7XG59XG5cblxuLyoqXG4gKiBSZW1vdmUga2V5d29yZFxuICogQHRoaXMgIEFqdlxuICogQHBhcmFtIHtTdHJpbmd9IGtleXdvcmQgcHJlLWRlZmluZWQgb3IgY3VzdG9tIGtleXdvcmQuXG4gKiBAcmV0dXJuIHtBanZ9IHRoaXMgZm9yIG1ldGhvZCBjaGFpbmluZ1xuICovXG5mdW5jdGlvbiByZW1vdmVLZXl3b3JkKGtleXdvcmQpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICB2YXIgUlVMRVMgPSB0aGlzLlJVTEVTO1xuICBkZWxldGUgUlVMRVMua2V5d29yZHNba2V5d29yZF07XG4gIGRlbGV0ZSBSVUxFUy5hbGxba2V5d29yZF07XG4gIGRlbGV0ZSBSVUxFUy5jdXN0b21ba2V5d29yZF07XG4gIGZvciAodmFyIGk9MDsgaTxSVUxFUy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBydWxlcyA9IFJVTEVTW2ldLnJ1bGVzO1xuICAgIGZvciAodmFyIGo9MDsgajxydWxlcy5sZW5ndGg7IGorKykge1xuICAgICAgaWYgKHJ1bGVzW2pdLmtleXdvcmQgPT0ga2V5d29yZCkge1xuICAgICAgICBydWxlcy5zcGxpY2UoaiwgMSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcztcbn1cblxuXG4vKipcbiAqIFZhbGlkYXRlIGtleXdvcmQgZGVmaW5pdGlvblxuICogQHRoaXMgIEFqdlxuICogQHBhcmFtIHtPYmplY3R9IGRlZmluaXRpb24ga2V5d29yZCBkZWZpbml0aW9uIG9iamVjdC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gdGhyb3dFcnJvciB0cnVlIHRvIHRocm93IGV4Y2VwdGlvbiBpZiBkZWZpbml0aW9uIGlzIGludmFsaWRcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHZhbGlkYXRpb24gcmVzdWx0XG4gKi9cbmZ1bmN0aW9uIHZhbGlkYXRlS2V5d29yZChkZWZpbml0aW9uLCB0aHJvd0Vycm9yKSB7XG4gIHZhbGlkYXRlS2V5d29yZC5lcnJvcnMgPSBudWxsO1xuICB2YXIgdiA9IHRoaXMuX3ZhbGlkYXRlS2V5d29yZCA9IHRoaXMuX3ZhbGlkYXRlS2V5d29yZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHRoaXMuY29tcGlsZShkZWZpbml0aW9uU2NoZW1hLCB0cnVlKTtcblxuICBpZiAodihkZWZpbml0aW9uKSkgcmV0dXJuIHRydWU7XG4gIHZhbGlkYXRlS2V5d29yZC5lcnJvcnMgPSB2LmVycm9ycztcbiAgaWYgKHRocm93RXJyb3IpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdjdXN0b20ga2V5d29yZCBkZWZpbml0aW9uIGlzIGludmFsaWQ6ICcgICsgdGhpcy5lcnJvcnNUZXh0KHYuZXJyb3JzKSk7XG4gIGVsc2VcbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Fqdi9saWIva2V5d29yZC5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9hanYvbGliXCIpIiwibW9kdWxlLmV4cG9ydHM9e1xuICAgIFwiJHNjaGVtYVwiOiBcImh0dHA6Ly9qc29uLXNjaGVtYS5vcmcvZHJhZnQtMDcvc2NoZW1hI1wiLFxuICAgIFwiJGlkXCI6IFwiaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2Fqdi12YWxpZGF0b3IvYWp2L21hc3Rlci9saWIvcmVmcy9kYXRhLmpzb24jXCIsXG4gICAgXCJkZXNjcmlwdGlvblwiOiBcIk1ldGEtc2NoZW1hIGZvciAkZGF0YSByZWZlcmVuY2UgKEpTT04gU2NoZW1hIGV4dGVuc2lvbiBwcm9wb3NhbClcIixcbiAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICBcInJlcXVpcmVkXCI6IFsgXCIkZGF0YVwiIF0sXG4gICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCIkZGF0YVwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgICAgICAgIFwiYW55T2ZcIjogW1xuICAgICAgICAgICAgICAgIHsgXCJmb3JtYXRcIjogXCJyZWxhdGl2ZS1qc29uLXBvaW50ZXJcIiB9LCBcbiAgICAgICAgICAgICAgICB7IFwiZm9ybWF0XCI6IFwianNvbi1wb2ludGVyXCIgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IGZhbHNlXG59XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gICAgXCIkc2NoZW1hXCI6IFwiaHR0cDovL2pzb24tc2NoZW1hLm9yZy9kcmFmdC0wNy9zY2hlbWEjXCIsXG4gICAgXCIkaWRcIjogXCJodHRwOi8vanNvbi1zY2hlbWEub3JnL2RyYWZ0LTA3L3NjaGVtYSNcIixcbiAgICBcInRpdGxlXCI6IFwiQ29yZSBzY2hlbWEgbWV0YS1zY2hlbWFcIixcbiAgICBcImRlZmluaXRpb25zXCI6IHtcbiAgICAgICAgXCJzY2hlbWFBcnJheVwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgXCJtaW5JdGVtc1wiOiAxLFxuICAgICAgICAgICAgXCJpdGVtc1wiOiB7IFwiJHJlZlwiOiBcIiNcIiB9XG4gICAgICAgIH0sXG4gICAgICAgIFwibm9uTmVnYXRpdmVJbnRlZ2VyXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImludGVnZXJcIixcbiAgICAgICAgICAgIFwibWluaW11bVwiOiAwXG4gICAgICAgIH0sXG4gICAgICAgIFwibm9uTmVnYXRpdmVJbnRlZ2VyRGVmYXVsdDBcIjoge1xuICAgICAgICAgICAgXCJhbGxPZlwiOiBbXG4gICAgICAgICAgICAgICAgeyBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL25vbk5lZ2F0aXZlSW50ZWdlclwiIH0sXG4gICAgICAgICAgICAgICAgeyBcImRlZmF1bHRcIjogMCB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwic2ltcGxlVHlwZXNcIjoge1xuICAgICAgICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgICAgICAgICBcImFycmF5XCIsXG4gICAgICAgICAgICAgICAgXCJib29sZWFuXCIsXG4gICAgICAgICAgICAgICAgXCJpbnRlZ2VyXCIsXG4gICAgICAgICAgICAgICAgXCJudWxsXCIsXG4gICAgICAgICAgICAgICAgXCJudW1iZXJcIixcbiAgICAgICAgICAgICAgICBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgIFwic3RyaW5nXCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJpbmdBcnJheVwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgXCJpdGVtc1wiOiB7IFwidHlwZVwiOiBcInN0cmluZ1wiIH0sXG4gICAgICAgICAgICBcInVuaXF1ZUl0ZW1zXCI6IHRydWUsXG4gICAgICAgICAgICBcImRlZmF1bHRcIjogW11cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXCJ0eXBlXCI6IFtcIm9iamVjdFwiLCBcImJvb2xlYW5cIl0sXG4gICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCIkaWRcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICBcImZvcm1hdFwiOiBcInVyaS1yZWZlcmVuY2VcIlxuICAgICAgICB9LFxuICAgICAgICBcIiRzY2hlbWFcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICBcImZvcm1hdFwiOiBcInVyaVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiJHJlZlwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgICAgICAgIFwiZm9ybWF0XCI6IFwidXJpLXJlZmVyZW5jZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiJGNvbW1lbnRcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZVwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGVmYXVsdFwiOiB0cnVlLFxuICAgICAgICBcInJlYWRPbmx5XCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIixcbiAgICAgICAgICAgIFwiZGVmYXVsdFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBcImV4YW1wbGVzXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICBcIml0ZW1zXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgXCJtdWx0aXBsZU9mXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiLFxuICAgICAgICAgICAgXCJleGNsdXNpdmVNaW5pbXVtXCI6IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCJtYXhpbXVtXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZXhjbHVzaXZlTWF4aW11bVwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1pbmltdW1cIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJleGNsdXNpdmVNaW5pbXVtXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWF4TGVuZ3RoXCI6IHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9ub25OZWdhdGl2ZUludGVnZXJcIiB9LFxuICAgICAgICBcIm1pbkxlbmd0aFwiOiB7IFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvbm9uTmVnYXRpdmVJbnRlZ2VyRGVmYXVsdDBcIiB9LFxuICAgICAgICBcInBhdHRlcm5cIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICBcImZvcm1hdFwiOiBcInJlZ2V4XCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJhZGRpdGlvbmFsSXRlbXNcIjogeyBcIiRyZWZcIjogXCIjXCIgfSxcbiAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcImFueU9mXCI6IFtcbiAgICAgICAgICAgICAgICB7IFwiJHJlZlwiOiBcIiNcIiB9LFxuICAgICAgICAgICAgICAgIHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9zY2hlbWFBcnJheVwiIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBcImRlZmF1bHRcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBcIm1heEl0ZW1zXCI6IHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9ub25OZWdhdGl2ZUludGVnZXJcIiB9LFxuICAgICAgICBcIm1pbkl0ZW1zXCI6IHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9ub25OZWdhdGl2ZUludGVnZXJEZWZhdWx0MFwiIH0sXG4gICAgICAgIFwidW5pcXVlSXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiLFxuICAgICAgICAgICAgXCJkZWZhdWx0XCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29udGFpbnNcIjogeyBcIiRyZWZcIjogXCIjXCIgfSxcbiAgICAgICAgXCJtYXhQcm9wZXJ0aWVzXCI6IHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9ub25OZWdhdGl2ZUludGVnZXJcIiB9LFxuICAgICAgICBcIm1pblByb3BlcnRpZXNcIjogeyBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL25vbk5lZ2F0aXZlSW50ZWdlckRlZmF1bHQwXCIgfSxcbiAgICAgICAgXCJyZXF1aXJlZFwiOiB7IFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvc3RyaW5nQXJyYXlcIiB9LFxuICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IHsgXCIkcmVmXCI6IFwiI1wiIH0sXG4gICAgICAgIFwiZGVmaW5pdGlvbnNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IHsgXCIkcmVmXCI6IFwiI1wiIH0sXG4gICAgICAgICAgICBcImRlZmF1bHRcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgXCJhZGRpdGlvbmFsUHJvcGVydGllc1wiOiB7IFwiJHJlZlwiOiBcIiNcIiB9LFxuICAgICAgICAgICAgXCJkZWZhdWx0XCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIFwicGF0dGVyblByb3BlcnRpZXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IHsgXCIkcmVmXCI6IFwiI1wiIH0sXG4gICAgICAgICAgICBcInByb3BlcnR5TmFtZXNcIjogeyBcImZvcm1hdFwiOiBcInJlZ2V4XCIgfSxcbiAgICAgICAgICAgIFwiZGVmYXVsdFwiOiB7fVxuICAgICAgICB9LFxuICAgICAgICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgICAgICAgIFwiYWRkaXRpb25hbFByb3BlcnRpZXNcIjoge1xuICAgICAgICAgICAgICAgIFwiYW55T2ZcIjogW1xuICAgICAgICAgICAgICAgICAgICB7IFwiJHJlZlwiOiBcIiNcIiB9LFxuICAgICAgICAgICAgICAgICAgICB7IFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvc3RyaW5nQXJyYXlcIiB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInByb3BlcnR5TmFtZXNcIjogeyBcIiRyZWZcIjogXCIjXCIgfSxcbiAgICAgICAgXCJjb25zdFwiOiB0cnVlLFxuICAgICAgICBcImVudW1cIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgIFwiaXRlbXNcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwibWluSXRlbXNcIjogMSxcbiAgICAgICAgICAgIFwidW5pcXVlSXRlbXNcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBcInR5cGVcIjoge1xuICAgICAgICAgICAgXCJhbnlPZlwiOiBbXG4gICAgICAgICAgICAgICAgeyBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL3NpbXBsZVR5cGVzXCIgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgICAgICAgIFwiaXRlbXNcIjogeyBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL3NpbXBsZVR5cGVzXCIgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtaW5JdGVtc1wiOiAxLFxuICAgICAgICAgICAgICAgICAgICBcInVuaXF1ZUl0ZW1zXCI6IHRydWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9ybWF0XCI6IHsgXCJ0eXBlXCI6IFwic3RyaW5nXCIgfSxcbiAgICAgICAgXCJjb250ZW50TWVkaWFUeXBlXCI6IHsgXCJ0eXBlXCI6IFwic3RyaW5nXCIgfSxcbiAgICAgICAgXCJjb250ZW50RW5jb2RpbmdcIjogeyBcInR5cGVcIjogXCJzdHJpbmdcIiB9LFxuICAgICAgICBcImlmXCI6IHtcIiRyZWZcIjogXCIjXCJ9LFxuICAgICAgICBcInRoZW5cIjoge1wiJHJlZlwiOiBcIiNcIn0sXG4gICAgICAgIFwiZWxzZVwiOiB7XCIkcmVmXCI6IFwiI1wifSxcbiAgICAgICAgXCJhbGxPZlwiOiB7IFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvc2NoZW1hQXJyYXlcIiB9LFxuICAgICAgICBcImFueU9mXCI6IHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9zY2hlbWFBcnJheVwiIH0sXG4gICAgICAgIFwib25lT2ZcIjogeyBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL3NjaGVtYUFycmF5XCIgfSxcbiAgICAgICAgXCJub3RcIjogeyBcIiRyZWZcIjogXCIjXCIgfVxuICAgIH0sXG4gICAgXCJkZWZhdWx0XCI6IHRydWVcbn1cbiIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbnZhciBsb29rdXAgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG5cbjsoZnVuY3Rpb24gKGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG4gIHZhciBBcnIgPSAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKVxuICAgID8gVWludDhBcnJheVxuICAgIDogQXJyYXlcblxuXHR2YXIgUExVUyAgID0gJysnLmNoYXJDb2RlQXQoMClcblx0dmFyIFNMQVNIICA9ICcvJy5jaGFyQ29kZUF0KDApXG5cdHZhciBOVU1CRVIgPSAnMCcuY2hhckNvZGVBdCgwKVxuXHR2YXIgTE9XRVIgID0gJ2EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFVQUEVSICA9ICdBJy5jaGFyQ29kZUF0KDApXG5cdHZhciBQTFVTX1VSTF9TQUZFID0gJy0nLmNoYXJDb2RlQXQoMClcblx0dmFyIFNMQVNIX1VSTF9TQUZFID0gJ18nLmNoYXJDb2RlQXQoMClcblxuXHRmdW5jdGlvbiBkZWNvZGUgKGVsdCkge1xuXHRcdHZhciBjb2RlID0gZWx0LmNoYXJDb2RlQXQoMClcblx0XHRpZiAoY29kZSA9PT0gUExVUyB8fFxuXHRcdCAgICBjb2RlID09PSBQTFVTX1VSTF9TQUZFKVxuXHRcdFx0cmV0dXJuIDYyIC8vICcrJ1xuXHRcdGlmIChjb2RlID09PSBTTEFTSCB8fFxuXHRcdCAgICBjb2RlID09PSBTTEFTSF9VUkxfU0FGRSlcblx0XHRcdHJldHVybiA2MyAvLyAnLydcblx0XHRpZiAoY29kZSA8IE5VTUJFUilcblx0XHRcdHJldHVybiAtMSAvL25vIG1hdGNoXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIgKyAxMClcblx0XHRcdHJldHVybiBjb2RlIC0gTlVNQkVSICsgMjYgKyAyNlxuXHRcdGlmIChjb2RlIDwgVVBQRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gVVBQRVJcblx0XHRpZiAoY29kZSA8IExPV0VSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIExPV0VSICsgMjZcblx0fVxuXG5cdGZ1bmN0aW9uIGI2NFRvQnl0ZUFycmF5IChiNjQpIHtcblx0XHR2YXIgaSwgaiwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuXG5cdFx0aWYgKGI2NC5sZW5ndGggJSA0ID4gMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0Jylcblx0XHR9XG5cblx0XHQvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuXHRcdC8vIGlmIHRoZXJlIGFyZSB0d28gcGxhY2Vob2xkZXJzLCB0aGFuIHRoZSB0d28gY2hhcmFjdGVycyBiZWZvcmUgaXRcblx0XHQvLyByZXByZXNlbnQgb25lIGJ5dGVcblx0XHQvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcblx0XHQvLyB0aGlzIGlzIGp1c3QgYSBjaGVhcCBoYWNrIHRvIG5vdCBkbyBpbmRleE9mIHR3aWNlXG5cdFx0dmFyIGxlbiA9IGI2NC5sZW5ndGhcblx0XHRwbGFjZUhvbGRlcnMgPSAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMikgPyAyIDogJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDEpID8gMSA6IDBcblxuXHRcdC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuXHRcdGFyciA9IG5ldyBBcnIoYjY0Lmxlbmd0aCAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKVxuXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuXHRcdGwgPSBwbGFjZUhvbGRlcnMgPiAwID8gYjY0Lmxlbmd0aCAtIDQgOiBiNjQubGVuZ3RoXG5cblx0XHR2YXIgTCA9IDBcblxuXHRcdGZ1bmN0aW9uIHB1c2ggKHYpIHtcblx0XHRcdGFycltMKytdID0gdlxuXHRcdH1cblxuXHRcdGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbDsgaSArPSA0LCBqICs9IDMpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTgpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgMTIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPDwgNikgfCBkZWNvZGUoYjY0LmNoYXJBdChpICsgMykpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDAwMCkgPj4gMTYpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDApID4+IDgpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0aWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpID4+IDQpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTApIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgNCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA+PiAyKVxuXHRcdFx0cHVzaCgodG1wID4+IDgpICYgMHhGRilcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRyZXR1cm4gYXJyXG5cdH1cblxuXHRmdW5jdGlvbiB1aW50OFRvQmFzZTY0ICh1aW50OCkge1xuXHRcdHZhciBpLFxuXHRcdFx0ZXh0cmFCeXRlcyA9IHVpbnQ4Lmxlbmd0aCAlIDMsIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG5cdFx0XHRvdXRwdXQgPSBcIlwiLFxuXHRcdFx0dGVtcCwgbGVuZ3RoXG5cblx0XHRmdW5jdGlvbiBlbmNvZGUgKG51bSkge1xuXHRcdFx0cmV0dXJuIGxvb2t1cC5jaGFyQXQobnVtKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG5cdFx0XHRyZXR1cm4gZW5jb2RlKG51bSA+PiAxOCAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiAxMiAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiA2ICYgMHgzRikgKyBlbmNvZGUobnVtICYgMHgzRilcblx0XHR9XG5cblx0XHQvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG5cdFx0Zm9yIChpID0gMCwgbGVuZ3RoID0gdWludDgubGVuZ3RoIC0gZXh0cmFCeXRlczsgaSA8IGxlbmd0aDsgaSArPSAzKSB7XG5cdFx0XHR0ZW1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuXHRcdFx0b3V0cHV0ICs9IHRyaXBsZXRUb0Jhc2U2NCh0ZW1wKVxuXHRcdH1cblxuXHRcdC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcblx0XHRzd2l0Y2ggKGV4dHJhQnl0ZXMpIHtcblx0XHRcdGNhc2UgMTpcblx0XHRcdFx0dGVtcCA9IHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAyKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9PSdcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgMjpcblx0XHRcdFx0dGVtcCA9ICh1aW50OFt1aW50OC5sZW5ndGggLSAyXSA8PCA4KSArICh1aW50OFt1aW50OC5sZW5ndGggLSAxXSlcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDEwKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wID4+IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCAyKSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPSdcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cblx0XHRyZXR1cm4gb3V0cHV0XG5cdH1cblxuXHRleHBvcnRzLnRvQnl0ZUFycmF5ID0gYjY0VG9CeXRlQXJyYXlcblx0ZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gdWludDhUb0Jhc2U2NFxufSh0eXBlb2YgZXhwb3J0cyA9PT0gJ3VuZGVmaW5lZCcgPyAodGhpcy5iYXNlNjRqcyA9IHt9KSA6IGV4cG9ydHMpKVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuQnVmZmVyLnBvb2xTaXplID0gODE5MlxuXG4vKipcbiAqIElmIGBCdWZmZXIuX3VzZVR5cGVkQXJyYXlzYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFVzZSBPYmplY3QgaW1wbGVtZW50YXRpb24gKGNvbXBhdGlibGUgZG93biB0byBJRTYpXG4gKi9cbkJ1ZmZlci5fdXNlVHlwZWRBcnJheXMgPSAoZnVuY3Rpb24gKCkge1xuICAvLyBEZXRlY3QgaWYgYnJvd3NlciBzdXBwb3J0cyBUeXBlZCBBcnJheXMuIFN1cHBvcnRlZCBicm93c2VycyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLFxuICAvLyBDaHJvbWUgNyssIFNhZmFyaSA1LjErLCBPcGVyYSAxMS42KywgaU9TIDQuMisuIElmIHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgYWRkaW5nXG4gIC8vIHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgIGluc3RhbmNlcywgdGhlbiB0aGF0J3MgdGhlIHNhbWUgYXMgbm8gYFVpbnQ4QXJyYXlgIHN1cHBvcnRcbiAgLy8gYmVjYXVzZSB3ZSBuZWVkIHRvIGJlIGFibGUgdG8gYWRkIGFsbCB0aGUgbm9kZSBCdWZmZXIgQVBJIG1ldGhvZHMuIFRoaXMgaXMgYW4gaXNzdWVcbiAgLy8gaW4gRmlyZWZveCA0LTI5LiBOb3cgZml4ZWQ6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY5NTQzOFxuICB0cnkge1xuICAgIHZhciBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMClcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIGFyci5mb28gPSBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9XG4gICAgcmV0dXJuIDQyID09PSBhcnIuZm9vKCkgJiZcbiAgICAgICAgdHlwZW9mIGFyci5zdWJhcnJheSA9PT0gJ2Z1bmN0aW9uJyAvLyBDaHJvbWUgOS0xMCBsYWNrIGBzdWJhcnJheWBcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59KSgpXG5cbi8qKlxuICogQ2xhc3M6IEJ1ZmZlclxuICogPT09PT09PT09PT09PVxuICpcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgYXJlIGF1Z21lbnRlZFxuICogd2l0aCBmdW5jdGlvbiBwcm9wZXJ0aWVzIGZvciBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgQVBJIGZ1bmN0aW9ucy4gV2UgdXNlXG4gKiBgVWludDhBcnJheWAgc28gdGhhdCBzcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdCByZXR1cm5zXG4gKiBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBCeSBhdWdtZW50aW5nIHRoZSBpbnN0YW5jZXMsIHdlIGNhbiBhdm9pZCBtb2RpZnlpbmcgdGhlIGBVaW50OEFycmF5YFxuICogcHJvdG90eXBlLlxuICovXG5mdW5jdGlvbiBCdWZmZXIgKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcikpXG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybylcblxuICB2YXIgdHlwZSA9IHR5cGVvZiBzdWJqZWN0XG5cbiAgLy8gV29ya2Fyb3VuZDogbm9kZSdzIGJhc2U2NCBpbXBsZW1lbnRhdGlvbiBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgc3RyaW5nc1xuICAvLyB3aGlsZSBiYXNlNjQtanMgZG9lcyBub3QuXG4gIGlmIChlbmNvZGluZyA9PT0gJ2Jhc2U2NCcgJiYgdHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBzdWJqZWN0ID0gc3RyaW5ndHJpbShzdWJqZWN0KVxuICAgIHdoaWxlIChzdWJqZWN0Lmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICAgIHN1YmplY3QgPSBzdWJqZWN0ICsgJz0nXG4gICAgfVxuICB9XG5cbiAgLy8gRmluZCB0aGUgbGVuZ3RoXG4gIHZhciBsZW5ndGhcbiAgaWYgKHR5cGUgPT09ICdudW1iZXInKVxuICAgIGxlbmd0aCA9IGNvZXJjZShzdWJqZWN0KVxuICBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJylcbiAgICBsZW5ndGggPSBCdWZmZXIuYnl0ZUxlbmd0aChzdWJqZWN0LCBlbmNvZGluZylcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ29iamVjdCcpXG4gICAgbGVuZ3RoID0gY29lcmNlKHN1YmplY3QubGVuZ3RoKSAvLyBhc3N1bWUgdGhhdCBvYmplY3QgaXMgYXJyYXktbGlrZVxuICBlbHNlXG4gICAgdGhyb3cgbmV3IEVycm9yKCdGaXJzdCBhcmd1bWVudCBuZWVkcyB0byBiZSBhIG51bWJlciwgYXJyYXkgb3Igc3RyaW5nLicpXG5cbiAgdmFyIGJ1ZlxuICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIC8vIFByZWZlcnJlZDogUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2UgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICBidWYgPSBCdWZmZXIuX2F1Z21lbnQobmV3IFVpbnQ4QXJyYXkobGVuZ3RoKSlcbiAgfSBlbHNlIHtcbiAgICAvLyBGYWxsYmFjazogUmV0dXJuIFRISVMgaW5zdGFuY2Ugb2YgQnVmZmVyIChjcmVhdGVkIGJ5IGBuZXdgKVxuICAgIGJ1ZiA9IHRoaXNcbiAgICBidWYubGVuZ3RoID0gbGVuZ3RoXG4gICAgYnVmLl9pc0J1ZmZlciA9IHRydWVcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzICYmIHR5cGVvZiBzdWJqZWN0LmJ5dGVMZW5ndGggPT09ICdudW1iZXInKSB7XG4gICAgLy8gU3BlZWQgb3B0aW1pemF0aW9uIC0tIHVzZSBzZXQgaWYgd2UncmUgY29weWluZyBmcm9tIGEgdHlwZWQgYXJyYXlcbiAgICBidWYuX3NldChzdWJqZWN0KVxuICB9IGVsc2UgaWYgKGlzQXJyYXlpc2goc3ViamVjdCkpIHtcbiAgICAvLyBUcmVhdCBhcnJheS1pc2ggb2JqZWN0cyBhcyBhIGJ5dGUgYXJyYXlcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkpXG4gICAgICAgIGJ1ZltpXSA9IHN1YmplY3QucmVhZFVJbnQ4KGkpXG4gICAgICBlbHNlXG4gICAgICAgIGJ1ZltpXSA9IHN1YmplY3RbaV1cbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBidWYud3JpdGUoc3ViamVjdCwgMCwgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ251bWJlcicgJiYgIUJ1ZmZlci5fdXNlVHlwZWRBcnJheXMgJiYgIW5vWmVybykge1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgYnVmW2ldID0gMFxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBidWZcbn1cblxuLy8gU1RBVElDIE1FVEhPRFNcbi8vID09PT09PT09PT09PT09XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICdyYXcnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiAoYikge1xuICByZXR1cm4gISEoYiAhPT0gbnVsbCAmJiBiICE9PSB1bmRlZmluZWQgJiYgYi5faXNCdWZmZXIpXG59XG5cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gZnVuY3Rpb24gKHN0ciwgZW5jb2RpbmcpIHtcbiAgdmFyIHJldFxuICBzdHIgPSBzdHIgKyAnJ1xuICBzd2l0Y2ggKGVuY29kaW5nIHx8ICd1dGY4Jykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoIC8gMlxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSB1dGY4VG9CeXRlcyhzdHIpLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gYmFzZTY0VG9CeXRlcyhzdHIpLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAqIDJcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gKGxpc3QsIHRvdGFsTGVuZ3RoKSB7XG4gIGFzc2VydChpc0FycmF5KGxpc3QpLCAnVXNhZ2U6IEJ1ZmZlci5jb25jYXQobGlzdCwgW3RvdGFsTGVuZ3RoXSlcXG4nICtcbiAgICAgICdsaXN0IHNob3VsZCBiZSBhbiBBcnJheS4nKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB0b3RhbExlbmd0aCAhPT0gJ251bWJlcicpIHtcbiAgICB0b3RhbExlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxMZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcih0b3RhbExlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGxpc3RbaV1cbiAgICBpdGVtLmNvcHkoYnVmLCBwb3MpXG4gICAgcG9zICs9IGl0ZW0ubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG4vLyBCVUZGRVIgSU5TVEFOQ0UgTUVUSE9EU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gX2hleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgYXNzZXJ0KHN0ckxlbiAlIDIgPT09IDAsICdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYnl0ZSA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBhc3NlcnQoIWlzTmFOKGJ5dGUpLCAnSW52YWxpZCBoZXggc3RyaW5nJylcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBieXRlXG4gIH1cbiAgQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPSBpICogMlxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiBfdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IEJ1ZmZlci5fY2hhcnNXcml0dGVuID1cbiAgICBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gX2FzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gX2JpbmFyeVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIF9hc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gX2Jhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IEJ1ZmZlci5fY2hhcnNXcml0dGVuID1cbiAgICBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfdXRmMTZsZVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IEJ1ZmZlci5fY2hhcnNXcml0dGVuID1cbiAgICBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBTdXBwb3J0IGJvdGggKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKVxuICAvLyBhbmQgdGhlIGxlZ2FjeSAoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpXG4gIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgaWYgKCFpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICB9IGVsc2UgeyAgLy8gbGVnYWN5XG4gICAgdmFyIHN3YXAgPSBlbmNvZGluZ1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgb2Zmc2V0ID0gbGVuZ3RoXG4gICAgbGVuZ3RoID0gc3dhcFxuICB9XG5cbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZyB8fCAndXRmOCcpLnRvTG93ZXJDYXNlKClcblxuICB2YXIgcmV0XG4gIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gX2hleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IF91dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYXNjaWknOlxuICAgICAgcmV0ID0gX2FzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIHJldCA9IF9iaW5hcnlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gX2Jhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSBfdXRmMTZsZVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgc2VsZiA9IHRoaXNcblxuICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZyB8fCAndXRmOCcpLnRvTG93ZXJDYXNlKClcbiAgc3RhcnQgPSBOdW1iZXIoc3RhcnQpIHx8IDBcbiAgZW5kID0gKGVuZCAhPT0gdW5kZWZpbmVkKVxuICAgID8gTnVtYmVyKGVuZClcbiAgICA6IGVuZCA9IHNlbGYubGVuZ3RoXG5cbiAgLy8gRmFzdHBhdGggZW1wdHkgc3RyaW5nc1xuICBpZiAoZW5kID09PSBzdGFydClcbiAgICByZXR1cm4gJydcblxuICB2YXIgcmV0XG4gIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gX2hleFNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IF91dGY4U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYXNjaWknOlxuICAgICAgcmV0ID0gX2FzY2lpU2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIHJldCA9IF9iaW5hcnlTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gX2Jhc2U2NFNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSBfdXRmMTZsZVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gKHRhcmdldCwgdGFyZ2V0X3N0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIHZhciBzb3VyY2UgPSB0aGlzXG5cbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKCF0YXJnZXRfc3RhcnQpIHRhcmdldF9zdGFydCA9IDBcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVyblxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCBzb3VyY2UubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGFzc2VydChlbmQgPj0gc3RhcnQsICdzb3VyY2VFbmQgPCBzb3VyY2VTdGFydCcpXG4gIGFzc2VydCh0YXJnZXRfc3RhcnQgPj0gMCAmJiB0YXJnZXRfc3RhcnQgPCB0YXJnZXQubGVuZ3RoLFxuICAgICAgJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoc3RhcnQgPj0gMCAmJiBzdGFydCA8IHNvdXJjZS5sZW5ndGgsICdzb3VyY2VTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgYXNzZXJ0KGVuZCA+PSAwICYmIGVuZCA8PSBzb3VyY2UubGVuZ3RoLCAnc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aClcbiAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCA8IGVuZCAtIHN0YXJ0KVxuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgKyBzdGFydFxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuXG4gIGlmIChsZW4gPCAxMDAgfHwgIUJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRfc3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0Ll9zZXQodGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLCB0YXJnZXRfc3RhcnQpXG4gIH1cbn1cblxuZnVuY3Rpb24gX2Jhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiBfdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJlcyA9ICcnXG4gIHZhciB0bXAgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBpZiAoYnVmW2ldIDw9IDB4N0YpIHtcbiAgICAgIHJlcyArPSBkZWNvZGVVdGY4Q2hhcih0bXApICsgU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gICAgICB0bXAgPSAnJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0bXAgKz0gJyUnICsgYnVmW2ldLnRvU3RyaW5nKDE2KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXMgKyBkZWNvZGVVdGY4Q2hhcih0bXApXG59XG5cbmZ1bmN0aW9uIF9hc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKylcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gX2JpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIF9hc2NpaVNsaWNlKGJ1Ziwgc3RhcnQsIGVuZClcbn1cblxuZnVuY3Rpb24gX2hleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gX3V0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgYnl0ZXNbaSsxXSAqIDI1NilcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSBjbGFtcChzdGFydCwgbGVuLCAwKVxuICBlbmQgPSBjbGFtcChlbmQsIGxlbiwgbGVuKVxuXG4gIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5fYXVnbWVudCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpKVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgdmFyIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZCwgdHJ1ZSlcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyBpKyspIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgICByZXR1cm4gbmV3QnVmXG4gIH1cbn1cblxuLy8gYGdldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLmdldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMucmVhZFVJbnQ4KG9mZnNldClcbn1cblxuLy8gYHNldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHYsIG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLnNldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMud3JpdGVVSW50OCh2LCBvZmZzZXQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgaWYgKG9mZnNldCA+PSB0aGlzLmxlbmd0aClcbiAgICByZXR1cm5cblxuICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbmZ1bmN0aW9uIF9yZWFkVUludDE2IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbFxuICBpZiAobGl0dGxlRW5kaWFuKSB7XG4gICAgdmFsID0gYnVmW29mZnNldF1cbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV0gPDwgOFxuICB9IGVsc2Uge1xuICAgIHZhbCA9IGJ1ZltvZmZzZXRdIDw8IDhcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV1cbiAgfVxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkVUludDE2KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkVUludDE2KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZFVJbnQzMiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWxcbiAgaWYgKGxpdHRsZUVuZGlhbikge1xuICAgIGlmIChvZmZzZXQgKyAyIDwgbGVuKVxuICAgICAgdmFsID0gYnVmW29mZnNldCArIDJdIDw8IDE2XG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdIDw8IDhcbiAgICB2YWwgfD0gYnVmW29mZnNldF1cbiAgICBpZiAob2Zmc2V0ICsgMyA8IGxlbilcbiAgICAgIHZhbCA9IHZhbCArIChidWZbb2Zmc2V0ICsgM10gPDwgMjQgPj4+IDApXG4gIH0gZWxzZSB7XG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgPSBidWZbb2Zmc2V0ICsgMV0gPDwgMTZcbiAgICBpZiAob2Zmc2V0ICsgMiA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMl0gPDwgOFxuICAgIGlmIChvZmZzZXQgKyAzIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAzXVxuICAgIHZhbCA9IHZhbCArIChidWZbb2Zmc2V0XSA8PCAyNCA+Pj4gMClcbiAgfVxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkVUludDMyKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkVUludDMyKHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgaWYgKG9mZnNldCA+PSB0aGlzLmxlbmd0aClcbiAgICByZXR1cm5cblxuICB2YXIgbmVnID0gdGhpc1tvZmZzZXRdICYgMHg4MFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuZnVuY3Rpb24gX3JlYWRJbnQxNiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWwgPSBfcmVhZFVJbnQxNihidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCB0cnVlKVxuICB2YXIgbmVnID0gdmFsICYgMHg4MDAwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmZmYgLSB2YWwgKyAxKSAqIC0xXG4gIGVsc2VcbiAgICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQxNih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkSW50MzIgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsID0gX3JlYWRVSW50MzIoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgdHJ1ZSlcbiAgdmFyIG5lZyA9IHZhbCAmIDB4ODAwMDAwMDBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmZmZmZmZmYgLSB2YWwgKyAxKSAqIC0xXG4gIGVsc2VcbiAgICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQzMih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkRmxvYXQgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgcmV0dXJuIGllZWU3NTQucmVhZChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEZsb2F0KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRGbG9hdCh0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWREb3VibGUgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCArIDcgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgcmV0dXJuIGllZWU3NTQucmVhZChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWREb3VibGUodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWREb3VibGUodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmKVxuICB9XG5cbiAgaWYgKG9mZnNldCA+PSB0aGlzLmxlbmd0aCkgcmV0dXJuXG5cbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbn1cblxuZnVuY3Rpb24gX3dyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmZmZilcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4obGVuIC0gb2Zmc2V0LCAyKTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9XG4gICAgICAgICh2YWx1ZSAmICgweGZmIDw8ICg4ICogKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkpKSkgPj4+XG4gICAgICAgICAgICAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSAqIDhcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlVUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmZmZmZmZmYpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGxlbiAtIG9mZnNldCwgNCk7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPVxuICAgICAgICAodmFsdWUgPj4+IChsaXR0bGVFbmRpYW4gPyBpIDogMyAtIGkpICogOCkgJiAweGZmXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2YsIC0weDgwKVxuICB9XG5cbiAgaWYgKG9mZnNldCA+PSB0aGlzLmxlbmd0aClcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICB0aGlzLndyaXRlVUludDgodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpXG4gIGVsc2VcbiAgICB0aGlzLndyaXRlVUludDgoMHhmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZmZmLCAtMHg4MDAwKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgX3dyaXRlVUludDE2KGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbiAgZWxzZVxuICAgIF93cml0ZVVJbnQxNihidWYsIDB4ZmZmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIF93cml0ZVVJbnQzMihidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG4gIGVsc2VcbiAgICBfd3JpdGVVSW50MzIoYnVmLCAweGZmZmZmZmZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyA3IDwgYnVmLmxlbmd0aCxcbiAgICAgICAgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZJRUVFNzU0KHZhbHVlLCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBmaWxsKHZhbHVlLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uICh2YWx1ZSwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXZhbHVlKSB2YWx1ZSA9IDBcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kKSBlbmQgPSB0aGlzLmxlbmd0aFxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFsdWUgPSB2YWx1ZS5jaGFyQ29kZUF0KDApXG4gIH1cblxuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiAhaXNOYU4odmFsdWUpLCAndmFsdWUgaXMgbm90IGEgbnVtYmVyJylcbiAgYXNzZXJ0KGVuZCA+PSBzdGFydCwgJ2VuZCA8IHN0YXJ0JylcblxuICAvLyBGaWxsIDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVyblxuICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIGFzc2VydChzdGFydCA+PSAwICYmIHN0YXJ0IDwgdGhpcy5sZW5ndGgsICdzdGFydCBvdXQgb2YgYm91bmRzJylcbiAgYXNzZXJ0KGVuZCA+PSAwICYmIGVuZCA8PSB0aGlzLmxlbmd0aCwgJ2VuZCBvdXQgb2YgYm91bmRzJylcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHRoaXNbaV0gPSB2YWx1ZVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG91dCA9IFtdXG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgb3V0W2ldID0gdG9IZXgodGhpc1tpXSlcbiAgICBpZiAoaSA9PT0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUykge1xuICAgICAgb3V0W2kgKyAxXSA9ICcuLi4nXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIG91dC5qb2luKCcgJykgKyAnPidcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGBBcnJheUJ1ZmZlcmAgd2l0aCB0aGUgKmNvcGllZCogbWVtb3J5IG9mIHRoZSBidWZmZXIgaW5zdGFuY2UuXG4gKiBBZGRlZCBpbiBOb2RlIDAuMTIuIE9ubHkgYXZhaWxhYmxlIGluIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBBcnJheUJ1ZmZlci5cbiAqL1xuQnVmZmVyLnByb3RvdHlwZS50b0FycmF5QnVmZmVyID0gZnVuY3Rpb24gKCkge1xuICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICAgIHJldHVybiAobmV3IEJ1ZmZlcih0aGlzKSkuYnVmZmVyXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBidWYgPSBuZXcgVWludDhBcnJheSh0aGlzLmxlbmd0aClcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBidWYubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDEpXG4gICAgICAgIGJ1ZltpXSA9IHRoaXNbaV1cbiAgICAgIHJldHVybiBidWYuYnVmZmVyXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignQnVmZmVyLnRvQXJyYXlCdWZmZXIgbm90IHN1cHBvcnRlZCBpbiB0aGlzIGJyb3dzZXInKVxuICB9XG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gc3RyaW5ndHJpbSAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKClcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcbn1cblxudmFyIEJQID0gQnVmZmVyLnByb3RvdHlwZVxuXG4vKipcbiAqIEF1Z21lbnQgYSBVaW50OEFycmF5ICppbnN0YW5jZSogKG5vdCB0aGUgVWludDhBcnJheSBjbGFzcyEpIHdpdGggQnVmZmVyIG1ldGhvZHNcbiAqL1xuQnVmZmVyLl9hdWdtZW50ID0gZnVuY3Rpb24gKGFycikge1xuICBhcnIuX2lzQnVmZmVyID0gdHJ1ZVxuXG4gIC8vIHNhdmUgcmVmZXJlbmNlIHRvIG9yaWdpbmFsIFVpbnQ4QXJyYXkgZ2V0L3NldCBtZXRob2RzIGJlZm9yZSBvdmVyd3JpdGluZ1xuICBhcnIuX2dldCA9IGFyci5nZXRcbiAgYXJyLl9zZXQgPSBhcnIuc2V0XG5cbiAgLy8gZGVwcmVjYXRlZCwgd2lsbCBiZSByZW1vdmVkIGluIG5vZGUgMC4xMytcbiAgYXJyLmdldCA9IEJQLmdldFxuICBhcnIuc2V0ID0gQlAuc2V0XG5cbiAgYXJyLndyaXRlID0gQlAud3JpdGVcbiAgYXJyLnRvU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvTG9jYWxlU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvSlNPTiA9IEJQLnRvSlNPTlxuICBhcnIuY29weSA9IEJQLmNvcHlcbiAgYXJyLnNsaWNlID0gQlAuc2xpY2VcbiAgYXJyLnJlYWRVSW50OCA9IEJQLnJlYWRVSW50OFxuICBhcnIucmVhZFVJbnQxNkxFID0gQlAucmVhZFVJbnQxNkxFXG4gIGFyci5yZWFkVUludDE2QkUgPSBCUC5yZWFkVUludDE2QkVcbiAgYXJyLnJlYWRVSW50MzJMRSA9IEJQLnJlYWRVSW50MzJMRVxuICBhcnIucmVhZFVJbnQzMkJFID0gQlAucmVhZFVJbnQzMkJFXG4gIGFyci5yZWFkSW50OCA9IEJQLnJlYWRJbnQ4XG4gIGFyci5yZWFkSW50MTZMRSA9IEJQLnJlYWRJbnQxNkxFXG4gIGFyci5yZWFkSW50MTZCRSA9IEJQLnJlYWRJbnQxNkJFXG4gIGFyci5yZWFkSW50MzJMRSA9IEJQLnJlYWRJbnQzMkxFXG4gIGFyci5yZWFkSW50MzJCRSA9IEJQLnJlYWRJbnQzMkJFXG4gIGFyci5yZWFkRmxvYXRMRSA9IEJQLnJlYWRGbG9hdExFXG4gIGFyci5yZWFkRmxvYXRCRSA9IEJQLnJlYWRGbG9hdEJFXG4gIGFyci5yZWFkRG91YmxlTEUgPSBCUC5yZWFkRG91YmxlTEVcbiAgYXJyLnJlYWREb3VibGVCRSA9IEJQLnJlYWREb3VibGVCRVxuICBhcnIud3JpdGVVSW50OCA9IEJQLndyaXRlVUludDhcbiAgYXJyLndyaXRlVUludDE2TEUgPSBCUC53cml0ZVVJbnQxNkxFXG4gIGFyci53cml0ZVVJbnQxNkJFID0gQlAud3JpdGVVSW50MTZCRVxuICBhcnIud3JpdGVVSW50MzJMRSA9IEJQLndyaXRlVUludDMyTEVcbiAgYXJyLndyaXRlVUludDMyQkUgPSBCUC53cml0ZVVJbnQzMkJFXG4gIGFyci53cml0ZUludDggPSBCUC53cml0ZUludDhcbiAgYXJyLndyaXRlSW50MTZMRSA9IEJQLndyaXRlSW50MTZMRVxuICBhcnIud3JpdGVJbnQxNkJFID0gQlAud3JpdGVJbnQxNkJFXG4gIGFyci53cml0ZUludDMyTEUgPSBCUC53cml0ZUludDMyTEVcbiAgYXJyLndyaXRlSW50MzJCRSA9IEJQLndyaXRlSW50MzJCRVxuICBhcnIud3JpdGVGbG9hdExFID0gQlAud3JpdGVGbG9hdExFXG4gIGFyci53cml0ZUZsb2F0QkUgPSBCUC53cml0ZUZsb2F0QkVcbiAgYXJyLndyaXRlRG91YmxlTEUgPSBCUC53cml0ZURvdWJsZUxFXG4gIGFyci53cml0ZURvdWJsZUJFID0gQlAud3JpdGVEb3VibGVCRVxuICBhcnIuZmlsbCA9IEJQLmZpbGxcbiAgYXJyLmluc3BlY3QgPSBCUC5pbnNwZWN0XG4gIGFyci50b0FycmF5QnVmZmVyID0gQlAudG9BcnJheUJ1ZmZlclxuXG4gIHJldHVybiBhcnJcbn1cblxuLy8gc2xpY2Uoc3RhcnQsIGVuZClcbmZ1bmN0aW9uIGNsYW1wIChpbmRleCwgbGVuLCBkZWZhdWx0VmFsdWUpIHtcbiAgaWYgKHR5cGVvZiBpbmRleCAhPT0gJ251bWJlcicpIHJldHVybiBkZWZhdWx0VmFsdWVcbiAgaW5kZXggPSB+fmluZGV4OyAgLy8gQ29lcmNlIHRvIGludGVnZXIuXG4gIGlmIChpbmRleCA+PSBsZW4pIHJldHVybiBsZW5cbiAgaWYgKGluZGV4ID49IDApIHJldHVybiBpbmRleFxuICBpbmRleCArPSBsZW5cbiAgaWYgKGluZGV4ID49IDApIHJldHVybiBpbmRleFxuICByZXR1cm4gMFxufVxuXG5mdW5jdGlvbiBjb2VyY2UgKGxlbmd0aCkge1xuICAvLyBDb2VyY2UgbGVuZ3RoIHRvIGEgbnVtYmVyIChwb3NzaWJseSBOYU4pLCByb3VuZCB1cFxuICAvLyBpbiBjYXNlIGl0J3MgZnJhY3Rpb25hbCAoZS5nLiAxMjMuNDU2KSB0aGVuIGRvIGFcbiAgLy8gZG91YmxlIG5lZ2F0ZSB0byBjb2VyY2UgYSBOYU4gdG8gMC4gRWFzeSwgcmlnaHQ/XG4gIGxlbmd0aCA9IH5+TWF0aC5jZWlsKCtsZW5ndGgpXG4gIHJldHVybiBsZW5ndGggPCAwID8gMCA6IGxlbmd0aFxufVxuXG5mdW5jdGlvbiBpc0FycmF5IChzdWJqZWN0KSB7XG4gIHJldHVybiAoQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoc3ViamVjdCkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc3ViamVjdCkgPT09ICdbb2JqZWN0IEFycmF5XSdcbiAgfSkoc3ViamVjdClcbn1cblxuZnVuY3Rpb24gaXNBcnJheWlzaCAoc3ViamVjdCkge1xuICByZXR1cm4gaXNBcnJheShzdWJqZWN0KSB8fCBCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkgfHxcbiAgICAgIHN1YmplY3QgJiYgdHlwZW9mIHN1YmplY3QgPT09ICdvYmplY3QnICYmXG4gICAgICB0eXBlb2Ygc3ViamVjdC5sZW5ndGggPT09ICdudW1iZXInXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYiA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaWYgKGIgPD0gMHg3RilcbiAgICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpKVxuICAgIGVsc2Uge1xuICAgICAgdmFyIHN0YXJ0ID0gaVxuICAgICAgaWYgKGIgPj0gMHhEODAwICYmIGIgPD0gMHhERkZGKSBpKytcbiAgICAgIHZhciBoID0gZW5jb2RlVVJJQ29tcG9uZW50KHN0ci5zbGljZShzdGFydCwgaSsxKSkuc3Vic3RyKDEpLnNwbGl0KCclJylcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgaC5sZW5ndGg7IGorKylcbiAgICAgICAgYnl0ZUFycmF5LnB1c2gocGFyc2VJbnQoaFtqXSwgMTYpKVxuICAgIH1cbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShzdHIpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgcG9zXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpXG4gICAgICBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIGRlY29kZVV0ZjhDaGFyIChzdHIpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cilcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoMHhGRkZEKSAvLyBVVEYgOCBpbnZhbGlkIGNoYXJcbiAgfVxufVxuXG4vKlxuICogV2UgaGF2ZSB0byBtYWtlIHN1cmUgdGhhdCB0aGUgdmFsdWUgaXMgYSB2YWxpZCBpbnRlZ2VyLiBUaGlzIG1lYW5zIHRoYXQgaXRcbiAqIGlzIG5vbi1uZWdhdGl2ZS4gSXQgaGFzIG5vIGZyYWN0aW9uYWwgY29tcG9uZW50IGFuZCB0aGF0IGl0IGRvZXMgbm90XG4gKiBleGNlZWQgdGhlIG1heGltdW0gYWxsb3dlZCB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gdmVyaWZ1aW50ICh2YWx1ZSwgbWF4KSB7XG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInLCAnY2Fubm90IHdyaXRlIGEgbm9uLW51bWJlciBhcyBhIG51bWJlcicpXG4gIGFzc2VydCh2YWx1ZSA+PSAwLCAnc3BlY2lmaWVkIGEgbmVnYXRpdmUgdmFsdWUgZm9yIHdyaXRpbmcgYW4gdW5zaWduZWQgdmFsdWUnKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgaXMgbGFyZ2VyIHRoYW4gbWF4aW11bSB2YWx1ZSBmb3IgdHlwZScpXG4gIGFzc2VydChNYXRoLmZsb29yKHZhbHVlKSA9PT0gdmFsdWUsICd2YWx1ZSBoYXMgYSBmcmFjdGlvbmFsIGNvbXBvbmVudCcpXG59XG5cbmZ1bmN0aW9uIHZlcmlmc2ludCAodmFsdWUsIG1heCwgbWluKSB7XG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInLCAnY2Fubm90IHdyaXRlIGEgbm9uLW51bWJlciBhcyBhIG51bWJlcicpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBsYXJnZXIgdGhhbiBtYXhpbXVtIGFsbG93ZWQgdmFsdWUnKVxuICBhc3NlcnQodmFsdWUgPj0gbWluLCAndmFsdWUgc21hbGxlciB0aGFuIG1pbmltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydChNYXRoLmZsb29yKHZhbHVlKSA9PT0gdmFsdWUsICd2YWx1ZSBoYXMgYSBmcmFjdGlvbmFsIGNvbXBvbmVudCcpXG59XG5cbmZ1bmN0aW9uIHZlcmlmSUVFRTc1NCAodmFsdWUsIG1heCwgbWluKSB7XG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInLCAnY2Fubm90IHdyaXRlIGEgbm9uLW51bWJlciBhcyBhIG51bWJlcicpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBsYXJnZXIgdGhhbiBtYXhpbXVtIGFsbG93ZWQgdmFsdWUnKVxuICBhc3NlcnQodmFsdWUgPj0gbWluLCAndmFsdWUgc21hbGxlciB0aGFuIG1pbmltdW0gYWxsb3dlZCB2YWx1ZScpXG59XG5cbmZ1bmN0aW9uIGFzc2VydCAodGVzdCwgbWVzc2FnZSkge1xuICBpZiAoIXRlc3QpIHRocm93IG5ldyBFcnJvcihtZXNzYWdlIHx8ICdGYWlsZWQgYXNzZXJ0aW9uJylcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2J1ZmZlclwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxuLy8gZG8gbm90IGVkaXQgLmpzIGZpbGVzIGRpcmVjdGx5IC0gZWRpdCBzcmMvaW5kZXguanN0XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGVxdWFsKGEsIGIpIHtcbiAgaWYgKGEgPT09IGIpIHJldHVybiB0cnVlO1xuXG4gIGlmIChhICYmIGIgJiYgdHlwZW9mIGEgPT0gJ29iamVjdCcgJiYgdHlwZW9mIGIgPT0gJ29iamVjdCcpIHtcbiAgICBpZiAoYS5jb25zdHJ1Y3RvciAhPT0gYi5jb25zdHJ1Y3RvcikgcmV0dXJuIGZhbHNlO1xuXG4gICAgdmFyIGxlbmd0aCwgaSwga2V5cztcbiAgICBpZiAoQXJyYXkuaXNBcnJheShhKSkge1xuICAgICAgbGVuZ3RoID0gYS5sZW5ndGg7XG4gICAgICBpZiAobGVuZ3RoICE9IGIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gICAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSAhPT0gMDspXG4gICAgICAgIGlmICghZXF1YWwoYVtpXSwgYltpXSkpIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuXG5cbiAgICBpZiAoYS5jb25zdHJ1Y3RvciA9PT0gUmVnRXhwKSByZXR1cm4gYS5zb3VyY2UgPT09IGIuc291cmNlICYmIGEuZmxhZ3MgPT09IGIuZmxhZ3M7XG4gICAgaWYgKGEudmFsdWVPZiAhPT0gT2JqZWN0LnByb3RvdHlwZS52YWx1ZU9mKSByZXR1cm4gYS52YWx1ZU9mKCkgPT09IGIudmFsdWVPZigpO1xuICAgIGlmIChhLnRvU3RyaW5nICE9PSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nKSByZXR1cm4gYS50b1N0cmluZygpID09PSBiLnRvU3RyaW5nKCk7XG5cbiAgICBrZXlzID0gT2JqZWN0LmtleXMoYSk7XG4gICAgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgaWYgKGxlbmd0aCAhPT0gT2JqZWN0LmtleXMoYikubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSAhPT0gMDspXG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChiLCBrZXlzW2ldKSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gIT09IDA7KSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpXTtcblxuICAgICAgaWYgKCFlcXVhbChhW2tleV0sIGJba2V5XSkpIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIHRydWUgaWYgYm90aCBOYU4sIGZhbHNlIG90aGVyd2lzZVxuICByZXR1cm4gYSE9PWEgJiYgYiE9PWI7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9mYXN0LWRlZXAtZXF1YWwvaW5kZXguanNcIixcIi8uLi9ub2RlX21vZHVsZXMvZmFzdC1kZWVwLWVxdWFsXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChkYXRhLCBvcHRzKSB7XG4gICAgaWYgKCFvcHRzKSBvcHRzID0ge307XG4gICAgaWYgKHR5cGVvZiBvcHRzID09PSAnZnVuY3Rpb24nKSBvcHRzID0geyBjbXA6IG9wdHMgfTtcbiAgICB2YXIgY3ljbGVzID0gKHR5cGVvZiBvcHRzLmN5Y2xlcyA9PT0gJ2Jvb2xlYW4nKSA/IG9wdHMuY3ljbGVzIDogZmFsc2U7XG5cbiAgICB2YXIgY21wID0gb3B0cy5jbXAgJiYgKGZ1bmN0aW9uIChmKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFvYmogPSB7IGtleTogYSwgdmFsdWU6IG5vZGVbYV0gfTtcbiAgICAgICAgICAgICAgICB2YXIgYm9iaiA9IHsga2V5OiBiLCB2YWx1ZTogbm9kZVtiXSB9O1xuICAgICAgICAgICAgICAgIHJldHVybiBmKGFvYmosIGJvYmopO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICB9KShvcHRzLmNtcCk7XG5cbiAgICB2YXIgc2VlbiA9IFtdO1xuICAgIHJldHVybiAoZnVuY3Rpb24gc3RyaW5naWZ5IChub2RlKSB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUudG9KU09OICYmIHR5cGVvZiBub2RlLnRvSlNPTiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgbm9kZSA9IG5vZGUudG9KU09OKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobm9kZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gICAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PSAnbnVtYmVyJykgcmV0dXJuIGlzRmluaXRlKG5vZGUpID8gJycgKyBub2RlIDogJ251bGwnO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUgIT09ICdvYmplY3QnKSByZXR1cm4gSlNPTi5zdHJpbmdpZnkobm9kZSk7XG5cbiAgICAgICAgdmFyIGksIG91dDtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobm9kZSkpIHtcbiAgICAgICAgICAgIG91dCA9ICdbJztcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBub2RlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkpIG91dCArPSAnLCc7XG4gICAgICAgICAgICAgICAgb3V0ICs9IHN0cmluZ2lmeShub2RlW2ldKSB8fCAnbnVsbCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb3V0ICsgJ10nO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUgPT09IG51bGwpIHJldHVybiAnbnVsbCc7XG5cbiAgICAgICAgaWYgKHNlZW4uaW5kZXhPZihub2RlKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIGlmIChjeWNsZXMpIHJldHVybiBKU09OLnN0cmluZ2lmeSgnX19jeWNsZV9fJyk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb252ZXJ0aW5nIGNpcmN1bGFyIHN0cnVjdHVyZSB0byBKU09OJyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc2VlbkluZGV4ID0gc2Vlbi5wdXNoKG5vZGUpIC0gMTtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhub2RlKS5zb3J0KGNtcCAmJiBjbXAobm9kZSkpO1xuICAgICAgICBvdXQgPSAnJztcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gc3RyaW5naWZ5KG5vZGVba2V5XSk7XG5cbiAgICAgICAgICAgIGlmICghdmFsdWUpIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYgKG91dCkgb3V0ICs9ICcsJztcbiAgICAgICAgICAgIG91dCArPSBKU09OLnN0cmluZ2lmeShrZXkpICsgJzonICsgdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgc2Vlbi5zcGxpY2Uoc2VlbkluZGV4LCAxKTtcbiAgICAgICAgcmV0dXJuICd7JyArIG91dCArICd9JztcbiAgICB9KShkYXRhKTtcbn07XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2Zhc3QtanNvbi1zdGFibGUtc3RyaW5naWZ5L2luZGV4LmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2Zhc3QtanNvbi1zdGFibGUtc3RyaW5naWZ5XCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSAobkJ5dGVzICogOCkgLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSAoZSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSAobSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gKG5CeXRlcyAqIDgpIC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICgodmFsdWUgKiBjKSAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInBCR3ZBcFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9pZWVlNzU0L2luZGV4LmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2llZWU3NTRcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5cbnZhciB0cmF2ZXJzZSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHNjaGVtYSwgb3B0cywgY2IpIHtcbiAgLy8gTGVnYWN5IHN1cHBvcnQgZm9yIHYwLjMuMSBhbmQgZWFybGllci5cbiAgaWYgKHR5cGVvZiBvcHRzID09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IG9wdHM7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgY2IgPSBvcHRzLmNiIHx8IGNiO1xuICB2YXIgcHJlID0gKHR5cGVvZiBjYiA9PSAnZnVuY3Rpb24nKSA/IGNiIDogY2IucHJlIHx8IGZ1bmN0aW9uKCkge307XG4gIHZhciBwb3N0ID0gY2IucG9zdCB8fCBmdW5jdGlvbigpIHt9O1xuXG4gIF90cmF2ZXJzZShvcHRzLCBwcmUsIHBvc3QsIHNjaGVtYSwgJycsIHNjaGVtYSk7XG59O1xuXG5cbnRyYXZlcnNlLmtleXdvcmRzID0ge1xuICBhZGRpdGlvbmFsSXRlbXM6IHRydWUsXG4gIGl0ZW1zOiB0cnVlLFxuICBjb250YWluczogdHJ1ZSxcbiAgYWRkaXRpb25hbFByb3BlcnRpZXM6IHRydWUsXG4gIHByb3BlcnR5TmFtZXM6IHRydWUsXG4gIG5vdDogdHJ1ZVxufTtcblxudHJhdmVyc2UuYXJyYXlLZXl3b3JkcyA9IHtcbiAgaXRlbXM6IHRydWUsXG4gIGFsbE9mOiB0cnVlLFxuICBhbnlPZjogdHJ1ZSxcbiAgb25lT2Y6IHRydWVcbn07XG5cbnRyYXZlcnNlLnByb3BzS2V5d29yZHMgPSB7XG4gIGRlZmluaXRpb25zOiB0cnVlLFxuICBwcm9wZXJ0aWVzOiB0cnVlLFxuICBwYXR0ZXJuUHJvcGVydGllczogdHJ1ZSxcbiAgZGVwZW5kZW5jaWVzOiB0cnVlXG59O1xuXG50cmF2ZXJzZS5za2lwS2V5d29yZHMgPSB7XG4gIGRlZmF1bHQ6IHRydWUsXG4gIGVudW06IHRydWUsXG4gIGNvbnN0OiB0cnVlLFxuICByZXF1aXJlZDogdHJ1ZSxcbiAgbWF4aW11bTogdHJ1ZSxcbiAgbWluaW11bTogdHJ1ZSxcbiAgZXhjbHVzaXZlTWF4aW11bTogdHJ1ZSxcbiAgZXhjbHVzaXZlTWluaW11bTogdHJ1ZSxcbiAgbXVsdGlwbGVPZjogdHJ1ZSxcbiAgbWF4TGVuZ3RoOiB0cnVlLFxuICBtaW5MZW5ndGg6IHRydWUsXG4gIHBhdHRlcm46IHRydWUsXG4gIGZvcm1hdDogdHJ1ZSxcbiAgbWF4SXRlbXM6IHRydWUsXG4gIG1pbkl0ZW1zOiB0cnVlLFxuICB1bmlxdWVJdGVtczogdHJ1ZSxcbiAgbWF4UHJvcGVydGllczogdHJ1ZSxcbiAgbWluUHJvcGVydGllczogdHJ1ZVxufTtcblxuXG5mdW5jdGlvbiBfdHJhdmVyc2Uob3B0cywgcHJlLCBwb3N0LCBzY2hlbWEsIGpzb25QdHIsIHJvb3RTY2hlbWEsIHBhcmVudEpzb25QdHIsIHBhcmVudEtleXdvcmQsIHBhcmVudFNjaGVtYSwga2V5SW5kZXgpIHtcbiAgaWYgKHNjaGVtYSAmJiB0eXBlb2Ygc2NoZW1hID09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KHNjaGVtYSkpIHtcbiAgICBwcmUoc2NoZW1hLCBqc29uUHRyLCByb290U2NoZW1hLCBwYXJlbnRKc29uUHRyLCBwYXJlbnRLZXl3b3JkLCBwYXJlbnRTY2hlbWEsIGtleUluZGV4KTtcbiAgICBmb3IgKHZhciBrZXkgaW4gc2NoZW1hKSB7XG4gICAgICB2YXIgc2NoID0gc2NoZW1hW2tleV07XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShzY2gpKSB7XG4gICAgICAgIGlmIChrZXkgaW4gdHJhdmVyc2UuYXJyYXlLZXl3b3Jkcykge1xuICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxzY2gubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICBfdHJhdmVyc2Uob3B0cywgcHJlLCBwb3N0LCBzY2hbaV0sIGpzb25QdHIgKyAnLycgKyBrZXkgKyAnLycgKyBpLCByb290U2NoZW1hLCBqc29uUHRyLCBrZXksIHNjaGVtYSwgaSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoa2V5IGluIHRyYXZlcnNlLnByb3BzS2V5d29yZHMpIHtcbiAgICAgICAgaWYgKHNjaCAmJiB0eXBlb2Ygc2NoID09ICdvYmplY3QnKSB7XG4gICAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzY2gpXG4gICAgICAgICAgICBfdHJhdmVyc2Uob3B0cywgcHJlLCBwb3N0LCBzY2hbcHJvcF0sIGpzb25QdHIgKyAnLycgKyBrZXkgKyAnLycgKyBlc2NhcGVKc29uUHRyKHByb3ApLCByb290U2NoZW1hLCBqc29uUHRyLCBrZXksIHNjaGVtYSwgcHJvcCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoa2V5IGluIHRyYXZlcnNlLmtleXdvcmRzIHx8IChvcHRzLmFsbEtleXMgJiYgIShrZXkgaW4gdHJhdmVyc2Uuc2tpcEtleXdvcmRzKSkpIHtcbiAgICAgICAgX3RyYXZlcnNlKG9wdHMsIHByZSwgcG9zdCwgc2NoLCBqc29uUHRyICsgJy8nICsga2V5LCByb290U2NoZW1hLCBqc29uUHRyLCBrZXksIHNjaGVtYSk7XG4gICAgICB9XG4gICAgfVxuICAgIHBvc3Qoc2NoZW1hLCBqc29uUHRyLCByb290U2NoZW1hLCBwYXJlbnRKc29uUHRyLCBwYXJlbnRLZXl3b3JkLCBwYXJlbnRTY2hlbWEsIGtleUluZGV4KTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGVzY2FwZUpzb25QdHIoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvfi9nLCAnfjAnKS5yZXBsYWNlKC9cXC8vZywgJ34xJyk7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2pzb24tc2NoZW1hLXRyYXZlcnNlL2luZGV4LmpzXCIsXCIvLi4vbm9kZV9tb2R1bGVzL2pzb24tc2NoZW1hLXRyYXZlcnNlXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicEJHdkFwXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9wcm9jZXNzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyoqIEBsaWNlbnNlIFVSSS5qcyB2NC40LjEgKGMpIDIwMTEgR2FyeSBDb3VydC4gTGljZW5zZTogaHR0cDovL2dpdGh1Yi5jb20vZ2FyeWNvdXJ0L3VyaS1qcyAqL1xuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0dHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzKSA6XG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSkgOlxuXHQoZmFjdG9yeSgoZ2xvYmFsLlVSSSA9IGdsb2JhbC5VUkkgfHwge30pKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoZXhwb3J0cykgeyAndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIG1lcmdlKCkge1xuICAgIGZvciAodmFyIF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBzZXRzID0gQXJyYXkoX2xlbiksIF9rZXkgPSAwOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICAgIHNldHNbX2tleV0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgfVxuXG4gICAgaWYgKHNldHMubGVuZ3RoID4gMSkge1xuICAgICAgICBzZXRzWzBdID0gc2V0c1swXS5zbGljZSgwLCAtMSk7XG4gICAgICAgIHZhciB4bCA9IHNldHMubGVuZ3RoIC0gMTtcbiAgICAgICAgZm9yICh2YXIgeCA9IDE7IHggPCB4bDsgKyt4KSB7XG4gICAgICAgICAgICBzZXRzW3hdID0gc2V0c1t4XS5zbGljZSgxLCAtMSk7XG4gICAgICAgIH1cbiAgICAgICAgc2V0c1t4bF0gPSBzZXRzW3hsXS5zbGljZSgxKTtcbiAgICAgICAgcmV0dXJuIHNldHMuam9pbignJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHNldHNbMF07XG4gICAgfVxufVxuZnVuY3Rpb24gc3ViZXhwKHN0cikge1xuICAgIHJldHVybiBcIig/OlwiICsgc3RyICsgXCIpXCI7XG59XG5mdW5jdGlvbiB0eXBlT2Yobykge1xuICAgIHJldHVybiBvID09PSB1bmRlZmluZWQgPyBcInVuZGVmaW5lZFwiIDogbyA9PT0gbnVsbCA/IFwibnVsbFwiIDogT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pLnNwbGl0KFwiIFwiKS5wb3AoKS5zcGxpdChcIl1cIikuc2hpZnQoKS50b0xvd2VyQ2FzZSgpO1xufVxuZnVuY3Rpb24gdG9VcHBlckNhc2Uoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci50b1VwcGVyQ2FzZSgpO1xufVxuZnVuY3Rpb24gdG9BcnJheShvYmopIHtcbiAgICByZXR1cm4gb2JqICE9PSB1bmRlZmluZWQgJiYgb2JqICE9PSBudWxsID8gb2JqIGluc3RhbmNlb2YgQXJyYXkgPyBvYmogOiB0eXBlb2Ygb2JqLmxlbmd0aCAhPT0gXCJudW1iZXJcIiB8fCBvYmouc3BsaXQgfHwgb2JqLnNldEludGVydmFsIHx8IG9iai5jYWxsID8gW29ial0gOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChvYmopIDogW107XG59XG5mdW5jdGlvbiBhc3NpZ24odGFyZ2V0LCBzb3VyY2UpIHtcbiAgICB2YXIgb2JqID0gdGFyZ2V0O1xuICAgIGlmIChzb3VyY2UpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgb2JqW2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG5mdW5jdGlvbiBidWlsZEV4cHMoaXNJUkkpIHtcbiAgICB2YXIgQUxQSEEkJCA9IFwiW0EtWmEtel1cIixcbiAgICAgICAgQ1IkID0gXCJbXFxcXHgwRF1cIixcbiAgICAgICAgRElHSVQkJCA9IFwiWzAtOV1cIixcbiAgICAgICAgRFFVT1RFJCQgPSBcIltcXFxceDIyXVwiLFxuICAgICAgICBIRVhESUckJCA9IG1lcmdlKERJR0lUJCQsIFwiW0EtRmEtZl1cIiksXG4gICAgICAgIC8vY2FzZS1pbnNlbnNpdGl2ZVxuICAgIExGJCQgPSBcIltcXFxceDBBXVwiLFxuICAgICAgICBTUCQkID0gXCJbXFxcXHgyMF1cIixcbiAgICAgICAgUENUX0VOQ09ERUQkID0gc3ViZXhwKHN1YmV4cChcIiVbRUZlZl1cIiArIEhFWERJRyQkICsgXCIlXCIgKyBIRVhESUckJCArIEhFWERJRyQkICsgXCIlXCIgKyBIRVhESUckJCArIEhFWERJRyQkKSArIFwifFwiICsgc3ViZXhwKFwiJVs4OUEtRmEtZl1cIiArIEhFWERJRyQkICsgXCIlXCIgKyBIRVhESUckJCArIEhFWERJRyQkKSArIFwifFwiICsgc3ViZXhwKFwiJVwiICsgSEVYRElHJCQgKyBIRVhESUckJCkpLFxuICAgICAgICAvL2V4cGFuZGVkXG4gICAgR0VOX0RFTElNUyQkID0gXCJbXFxcXDpcXFxcL1xcXFw/XFxcXCNcXFxcW1xcXFxdXFxcXEBdXCIsXG4gICAgICAgIFNVQl9ERUxJTVMkJCA9IFwiW1xcXFwhXFxcXCRcXFxcJlxcXFwnXFxcXChcXFxcKVxcXFwqXFxcXCtcXFxcLFxcXFw7XFxcXD1dXCIsXG4gICAgICAgIFJFU0VSVkVEJCQgPSBtZXJnZShHRU5fREVMSU1TJCQsIFNVQl9ERUxJTVMkJCksXG4gICAgICAgIFVDU0NIQVIkJCA9IGlzSVJJID8gXCJbXFxcXHhBMC1cXFxcdTIwMERcXFxcdTIwMTAtXFxcXHUyMDI5XFxcXHUyMDJGLVxcXFx1RDdGRlxcXFx1RjkwMC1cXFxcdUZEQ0ZcXFxcdUZERjAtXFxcXHVGRkVGXVwiIDogXCJbXVwiLFxuICAgICAgICAvL3N1YnNldCwgZXhjbHVkZXMgYmlkaSBjb250cm9sIGNoYXJhY3RlcnNcbiAgICBJUFJJVkFURSQkID0gaXNJUkkgPyBcIltcXFxcdUUwMDAtXFxcXHVGOEZGXVwiIDogXCJbXVwiLFxuICAgICAgICAvL3N1YnNldFxuICAgIFVOUkVTRVJWRUQkJCA9IG1lcmdlKEFMUEhBJCQsIERJR0lUJCQsIFwiW1xcXFwtXFxcXC5cXFxcX1xcXFx+XVwiLCBVQ1NDSEFSJCQpLFxuICAgICAgICBTQ0hFTUUkID0gc3ViZXhwKEFMUEhBJCQgKyBtZXJnZShBTFBIQSQkLCBESUdJVCQkLCBcIltcXFxcK1xcXFwtXFxcXC5dXCIpICsgXCIqXCIpLFxuICAgICAgICBVU0VSSU5GTyQgPSBzdWJleHAoc3ViZXhwKFBDVF9FTkNPREVEJCArIFwifFwiICsgbWVyZ2UoVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQsIFwiW1xcXFw6XVwiKSkgKyBcIipcIiksXG4gICAgICAgIERFQ19PQ1RFVCQgPSBzdWJleHAoc3ViZXhwKFwiMjVbMC01XVwiKSArIFwifFwiICsgc3ViZXhwKFwiMlswLTRdXCIgKyBESUdJVCQkKSArIFwifFwiICsgc3ViZXhwKFwiMVwiICsgRElHSVQkJCArIERJR0lUJCQpICsgXCJ8XCIgKyBzdWJleHAoXCJbMS05XVwiICsgRElHSVQkJCkgKyBcInxcIiArIERJR0lUJCQpLFxuICAgICAgICBERUNfT0NURVRfUkVMQVhFRCQgPSBzdWJleHAoc3ViZXhwKFwiMjVbMC01XVwiKSArIFwifFwiICsgc3ViZXhwKFwiMlswLTRdXCIgKyBESUdJVCQkKSArIFwifFwiICsgc3ViZXhwKFwiMVwiICsgRElHSVQkJCArIERJR0lUJCQpICsgXCJ8XCIgKyBzdWJleHAoXCIwP1sxLTldXCIgKyBESUdJVCQkKSArIFwifDA/MD9cIiArIERJR0lUJCQpLFxuICAgICAgICAvL3JlbGF4ZWQgcGFyc2luZyBydWxlc1xuICAgIElQVjRBRERSRVNTJCA9IHN1YmV4cChERUNfT0NURVRfUkVMQVhFRCQgKyBcIlxcXFwuXCIgKyBERUNfT0NURVRfUkVMQVhFRCQgKyBcIlxcXFwuXCIgKyBERUNfT0NURVRfUkVMQVhFRCQgKyBcIlxcXFwuXCIgKyBERUNfT0NURVRfUkVMQVhFRCQpLFxuICAgICAgICBIMTYkID0gc3ViZXhwKEhFWERJRyQkICsgXCJ7MSw0fVwiKSxcbiAgICAgICAgTFMzMiQgPSBzdWJleHAoc3ViZXhwKEgxNiQgKyBcIlxcXFw6XCIgKyBIMTYkKSArIFwifFwiICsgSVBWNEFERFJFU1MkKSxcbiAgICAgICAgSVBWNkFERFJFU1MxJCA9IHN1YmV4cChzdWJleHAoSDE2JCArIFwiXFxcXDpcIikgKyBcIns2fVwiICsgTFMzMiQpLFxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgIDYoIGgxNiBcIjpcIiApIGxzMzJcbiAgICBJUFY2QUREUkVTUzIkID0gc3ViZXhwKFwiXFxcXDpcXFxcOlwiICsgc3ViZXhwKEgxNiQgKyBcIlxcXFw6XCIpICsgXCJ7NX1cIiArIExTMzIkKSxcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgXCI6OlwiIDUoIGgxNiBcIjpcIiApIGxzMzJcbiAgICBJUFY2QUREUkVTUzMkID0gc3ViZXhwKHN1YmV4cChIMTYkKSArIFwiP1xcXFw6XFxcXDpcIiArIHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezR9XCIgKyBMUzMyJCksXG4gICAgICAgIC8vWyAgICAgICAgICAgICAgIGgxNiBdIFwiOjpcIiA0KCBoMTYgXCI6XCIgKSBsczMyXG4gICAgSVBWNkFERFJFU1M0JCA9IHN1YmV4cChzdWJleHAoc3ViZXhwKEgxNiQgKyBcIlxcXFw6XCIpICsgXCJ7MCwxfVwiICsgSDE2JCkgKyBcIj9cXFxcOlxcXFw6XCIgKyBzdWJleHAoSDE2JCArIFwiXFxcXDpcIikgKyBcInszfVwiICsgTFMzMiQpLFxuICAgICAgICAvL1sgKjEoIGgxNiBcIjpcIiApIGgxNiBdIFwiOjpcIiAzKCBoMTYgXCI6XCIgKSBsczMyXG4gICAgSVBWNkFERFJFU1M1JCA9IHN1YmV4cChzdWJleHAoc3ViZXhwKEgxNiQgKyBcIlxcXFw6XCIpICsgXCJ7MCwyfVwiICsgSDE2JCkgKyBcIj9cXFxcOlxcXFw6XCIgKyBzdWJleHAoSDE2JCArIFwiXFxcXDpcIikgKyBcInsyfVwiICsgTFMzMiQpLFxuICAgICAgICAvL1sgKjIoIGgxNiBcIjpcIiApIGgxNiBdIFwiOjpcIiAyKCBoMTYgXCI6XCIgKSBsczMyXG4gICAgSVBWNkFERFJFU1M2JCA9IHN1YmV4cChzdWJleHAoc3ViZXhwKEgxNiQgKyBcIlxcXFw6XCIpICsgXCJ7MCwzfVwiICsgSDE2JCkgKyBcIj9cXFxcOlxcXFw6XCIgKyBIMTYkICsgXCJcXFxcOlwiICsgTFMzMiQpLFxuICAgICAgICAvL1sgKjMoIGgxNiBcIjpcIiApIGgxNiBdIFwiOjpcIiAgICBoMTYgXCI6XCIgICBsczMyXG4gICAgSVBWNkFERFJFU1M3JCA9IHN1YmV4cChzdWJleHAoc3ViZXhwKEgxNiQgKyBcIlxcXFw6XCIpICsgXCJ7MCw0fVwiICsgSDE2JCkgKyBcIj9cXFxcOlxcXFw6XCIgKyBMUzMyJCksXG4gICAgICAgIC8vWyAqNCggaDE2IFwiOlwiICkgaDE2IF0gXCI6OlwiICAgICAgICAgICAgICBsczMyXG4gICAgSVBWNkFERFJFU1M4JCA9IHN1YmV4cChzdWJleHAoc3ViZXhwKEgxNiQgKyBcIlxcXFw6XCIpICsgXCJ7MCw1fVwiICsgSDE2JCkgKyBcIj9cXFxcOlxcXFw6XCIgKyBIMTYkKSxcbiAgICAgICAgLy9bICo1KCBoMTYgXCI6XCIgKSBoMTYgXSBcIjo6XCIgICAgICAgICAgICAgIGgxNlxuICAgIElQVjZBRERSRVNTOSQgPSBzdWJleHAoc3ViZXhwKHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezAsNn1cIiArIEgxNiQpICsgXCI/XFxcXDpcXFxcOlwiKSxcbiAgICAgICAgLy9bICo2KCBoMTYgXCI6XCIgKSBoMTYgXSBcIjo6XCJcbiAgICBJUFY2QUREUkVTUyQgPSBzdWJleHAoW0lQVjZBRERSRVNTMSQsIElQVjZBRERSRVNTMiQsIElQVjZBRERSRVNTMyQsIElQVjZBRERSRVNTNCQsIElQVjZBRERSRVNTNSQsIElQVjZBRERSRVNTNiQsIElQVjZBRERSRVNTNyQsIElQVjZBRERSRVNTOCQsIElQVjZBRERSRVNTOSRdLmpvaW4oXCJ8XCIpKSxcbiAgICAgICAgWk9ORUlEJCA9IHN1YmV4cChzdWJleHAoVU5SRVNFUlZFRCQkICsgXCJ8XCIgKyBQQ1RfRU5DT0RFRCQpICsgXCIrXCIpLFxuICAgICAgICAvL1JGQyA2ODc0XG4gICAgSVBWNkFERFJaJCA9IHN1YmV4cChJUFY2QUREUkVTUyQgKyBcIlxcXFwlMjVcIiArIFpPTkVJRCQpLFxuICAgICAgICAvL1JGQyA2ODc0XG4gICAgSVBWNkFERFJaX1JFTEFYRUQkID0gc3ViZXhwKElQVjZBRERSRVNTJCArIHN1YmV4cChcIlxcXFwlMjV8XFxcXCUoPyFcIiArIEhFWERJRyQkICsgXCJ7Mn0pXCIpICsgWk9ORUlEJCksXG4gICAgICAgIC8vUkZDIDY4NzQsIHdpdGggcmVsYXhlZCBwYXJzaW5nIHJ1bGVzXG4gICAgSVBWRlVUVVJFJCA9IHN1YmV4cChcIlt2Vl1cIiArIEhFWERJRyQkICsgXCIrXFxcXC5cIiArIG1lcmdlKFVOUkVTRVJWRUQkJCwgU1VCX0RFTElNUyQkLCBcIltcXFxcOl1cIikgKyBcIitcIiksXG4gICAgICAgIElQX0xJVEVSQUwkID0gc3ViZXhwKFwiXFxcXFtcIiArIHN1YmV4cChJUFY2QUREUlpfUkVMQVhFRCQgKyBcInxcIiArIElQVjZBRERSRVNTJCArIFwifFwiICsgSVBWRlVUVVJFJCkgKyBcIlxcXFxdXCIpLFxuICAgICAgICAvL1JGQyA2ODc0XG4gICAgUkVHX05BTUUkID0gc3ViZXhwKHN1YmV4cChQQ1RfRU5DT0RFRCQgKyBcInxcIiArIG1lcmdlKFVOUkVTRVJWRUQkJCwgU1VCX0RFTElNUyQkKSkgKyBcIipcIiksXG4gICAgICAgIEhPU1QkID0gc3ViZXhwKElQX0xJVEVSQUwkICsgXCJ8XCIgKyBJUFY0QUREUkVTUyQgKyBcIig/IVwiICsgUkVHX05BTUUkICsgXCIpXCIgKyBcInxcIiArIFJFR19OQU1FJCksXG4gICAgICAgIFBPUlQkID0gc3ViZXhwKERJR0lUJCQgKyBcIipcIiksXG4gICAgICAgIEFVVEhPUklUWSQgPSBzdWJleHAoc3ViZXhwKFVTRVJJTkZPJCArIFwiQFwiKSArIFwiP1wiICsgSE9TVCQgKyBzdWJleHAoXCJcXFxcOlwiICsgUE9SVCQpICsgXCI/XCIpLFxuICAgICAgICBQQ0hBUiQgPSBzdWJleHAoUENUX0VOQ09ERUQkICsgXCJ8XCIgKyBtZXJnZShVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCwgXCJbXFxcXDpcXFxcQF1cIikpLFxuICAgICAgICBTRUdNRU5UJCA9IHN1YmV4cChQQ0hBUiQgKyBcIipcIiksXG4gICAgICAgIFNFR01FTlRfTlokID0gc3ViZXhwKFBDSEFSJCArIFwiK1wiKSxcbiAgICAgICAgU0VHTUVOVF9OWl9OQyQgPSBzdWJleHAoc3ViZXhwKFBDVF9FTkNPREVEJCArIFwifFwiICsgbWVyZ2UoVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQsIFwiW1xcXFxAXVwiKSkgKyBcIitcIiksXG4gICAgICAgIFBBVEhfQUJFTVBUWSQgPSBzdWJleHAoc3ViZXhwKFwiXFxcXC9cIiArIFNFR01FTlQkKSArIFwiKlwiKSxcbiAgICAgICAgUEFUSF9BQlNPTFVURSQgPSBzdWJleHAoXCJcXFxcL1wiICsgc3ViZXhwKFNFR01FTlRfTlokICsgUEFUSF9BQkVNUFRZJCkgKyBcIj9cIiksXG4gICAgICAgIC8vc2ltcGxpZmllZFxuICAgIFBBVEhfTk9TQ0hFTUUkID0gc3ViZXhwKFNFR01FTlRfTlpfTkMkICsgUEFUSF9BQkVNUFRZJCksXG4gICAgICAgIC8vc2ltcGxpZmllZFxuICAgIFBBVEhfUk9PVExFU1MkID0gc3ViZXhwKFNFR01FTlRfTlokICsgUEFUSF9BQkVNUFRZJCksXG4gICAgICAgIC8vc2ltcGxpZmllZFxuICAgIFBBVEhfRU1QVFkkID0gXCIoPyFcIiArIFBDSEFSJCArIFwiKVwiLFxuICAgICAgICBQQVRIJCA9IHN1YmV4cChQQVRIX0FCRU1QVFkkICsgXCJ8XCIgKyBQQVRIX0FCU09MVVRFJCArIFwifFwiICsgUEFUSF9OT1NDSEVNRSQgKyBcInxcIiArIFBBVEhfUk9PVExFU1MkICsgXCJ8XCIgKyBQQVRIX0VNUFRZJCksXG4gICAgICAgIFFVRVJZJCA9IHN1YmV4cChzdWJleHAoUENIQVIkICsgXCJ8XCIgKyBtZXJnZShcIltcXFxcL1xcXFw/XVwiLCBJUFJJVkFURSQkKSkgKyBcIipcIiksXG4gICAgICAgIEZSQUdNRU5UJCA9IHN1YmV4cChzdWJleHAoUENIQVIkICsgXCJ8W1xcXFwvXFxcXD9dXCIpICsgXCIqXCIpLFxuICAgICAgICBISUVSX1BBUlQkID0gc3ViZXhwKHN1YmV4cChcIlxcXFwvXFxcXC9cIiArIEFVVEhPUklUWSQgKyBQQVRIX0FCRU1QVFkkKSArIFwifFwiICsgUEFUSF9BQlNPTFVURSQgKyBcInxcIiArIFBBVEhfUk9PVExFU1MkICsgXCJ8XCIgKyBQQVRIX0VNUFRZJCksXG4gICAgICAgIFVSSSQgPSBzdWJleHAoU0NIRU1FJCArIFwiXFxcXDpcIiArIEhJRVJfUEFSVCQgKyBzdWJleHAoXCJcXFxcP1wiICsgUVVFUlkkKSArIFwiP1wiICsgc3ViZXhwKFwiXFxcXCNcIiArIEZSQUdNRU5UJCkgKyBcIj9cIiksXG4gICAgICAgIFJFTEFUSVZFX1BBUlQkID0gc3ViZXhwKHN1YmV4cChcIlxcXFwvXFxcXC9cIiArIEFVVEhPUklUWSQgKyBQQVRIX0FCRU1QVFkkKSArIFwifFwiICsgUEFUSF9BQlNPTFVURSQgKyBcInxcIiArIFBBVEhfTk9TQ0hFTUUkICsgXCJ8XCIgKyBQQVRIX0VNUFRZJCksXG4gICAgICAgIFJFTEFUSVZFJCA9IHN1YmV4cChSRUxBVElWRV9QQVJUJCArIHN1YmV4cChcIlxcXFw/XCIgKyBRVUVSWSQpICsgXCI/XCIgKyBzdWJleHAoXCJcXFxcI1wiICsgRlJBR01FTlQkKSArIFwiP1wiKSxcbiAgICAgICAgVVJJX1JFRkVSRU5DRSQgPSBzdWJleHAoVVJJJCArIFwifFwiICsgUkVMQVRJVkUkKSxcbiAgICAgICAgQUJTT0xVVEVfVVJJJCA9IHN1YmV4cChTQ0hFTUUkICsgXCJcXFxcOlwiICsgSElFUl9QQVJUJCArIHN1YmV4cChcIlxcXFw/XCIgKyBRVUVSWSQpICsgXCI/XCIpLFxuICAgICAgICBHRU5FUklDX1JFRiQgPSBcIl4oXCIgKyBTQ0hFTUUkICsgXCIpXFxcXDpcIiArIHN1YmV4cChzdWJleHAoXCJcXFxcL1xcXFwvKFwiICsgc3ViZXhwKFwiKFwiICsgVVNFUklORk8kICsgXCIpQFwiKSArIFwiPyhcIiArIEhPU1QkICsgXCIpXCIgKyBzdWJleHAoXCJcXFxcOihcIiArIFBPUlQkICsgXCIpXCIpICsgXCI/KVwiKSArIFwiPyhcIiArIFBBVEhfQUJFTVBUWSQgKyBcInxcIiArIFBBVEhfQUJTT0xVVEUkICsgXCJ8XCIgKyBQQVRIX1JPT1RMRVNTJCArIFwifFwiICsgUEFUSF9FTVBUWSQgKyBcIilcIikgKyBzdWJleHAoXCJcXFxcPyhcIiArIFFVRVJZJCArIFwiKVwiKSArIFwiP1wiICsgc3ViZXhwKFwiXFxcXCMoXCIgKyBGUkFHTUVOVCQgKyBcIilcIikgKyBcIj8kXCIsXG4gICAgICAgIFJFTEFUSVZFX1JFRiQgPSBcIl4oKXswfVwiICsgc3ViZXhwKHN1YmV4cChcIlxcXFwvXFxcXC8oXCIgKyBzdWJleHAoXCIoXCIgKyBVU0VSSU5GTyQgKyBcIilAXCIpICsgXCI/KFwiICsgSE9TVCQgKyBcIilcIiArIHN1YmV4cChcIlxcXFw6KFwiICsgUE9SVCQgKyBcIilcIikgKyBcIj8pXCIpICsgXCI/KFwiICsgUEFUSF9BQkVNUFRZJCArIFwifFwiICsgUEFUSF9BQlNPTFVURSQgKyBcInxcIiArIFBBVEhfTk9TQ0hFTUUkICsgXCJ8XCIgKyBQQVRIX0VNUFRZJCArIFwiKVwiKSArIHN1YmV4cChcIlxcXFw/KFwiICsgUVVFUlkkICsgXCIpXCIpICsgXCI/XCIgKyBzdWJleHAoXCJcXFxcIyhcIiArIEZSQUdNRU5UJCArIFwiKVwiKSArIFwiPyRcIixcbiAgICAgICAgQUJTT0xVVEVfUkVGJCA9IFwiXihcIiArIFNDSEVNRSQgKyBcIilcXFxcOlwiICsgc3ViZXhwKHN1YmV4cChcIlxcXFwvXFxcXC8oXCIgKyBzdWJleHAoXCIoXCIgKyBVU0VSSU5GTyQgKyBcIilAXCIpICsgXCI/KFwiICsgSE9TVCQgKyBcIilcIiArIHN1YmV4cChcIlxcXFw6KFwiICsgUE9SVCQgKyBcIilcIikgKyBcIj8pXCIpICsgXCI/KFwiICsgUEFUSF9BQkVNUFRZJCArIFwifFwiICsgUEFUSF9BQlNPTFVURSQgKyBcInxcIiArIFBBVEhfUk9PVExFU1MkICsgXCJ8XCIgKyBQQVRIX0VNUFRZJCArIFwiKVwiKSArIHN1YmV4cChcIlxcXFw/KFwiICsgUVVFUlkkICsgXCIpXCIpICsgXCI/JFwiLFxuICAgICAgICBTQU1FRE9DX1JFRiQgPSBcIl5cIiArIHN1YmV4cChcIlxcXFwjKFwiICsgRlJBR01FTlQkICsgXCIpXCIpICsgXCI/JFwiLFxuICAgICAgICBBVVRIT1JJVFlfUkVGJCA9IFwiXlwiICsgc3ViZXhwKFwiKFwiICsgVVNFUklORk8kICsgXCIpQFwiKSArIFwiPyhcIiArIEhPU1QkICsgXCIpXCIgKyBzdWJleHAoXCJcXFxcOihcIiArIFBPUlQkICsgXCIpXCIpICsgXCI/JFwiO1xuICAgIHJldHVybiB7XG4gICAgICAgIE5PVF9TQ0hFTUU6IG5ldyBSZWdFeHAobWVyZ2UoXCJbXl1cIiwgQUxQSEEkJCwgRElHSVQkJCwgXCJbXFxcXCtcXFxcLVxcXFwuXVwiKSwgXCJnXCIpLFxuICAgICAgICBOT1RfVVNFUklORk86IG5ldyBSZWdFeHAobWVyZ2UoXCJbXlxcXFwlXFxcXDpdXCIsIFVOUkVTRVJWRUQkJCwgU1VCX0RFTElNUyQkKSwgXCJnXCIpLFxuICAgICAgICBOT1RfSE9TVDogbmV3IFJlZ0V4cChtZXJnZShcIlteXFxcXCVcXFxcW1xcXFxdXFxcXDpdXCIsIFVOUkVTRVJWRUQkJCwgU1VCX0RFTElNUyQkKSwgXCJnXCIpLFxuICAgICAgICBOT1RfUEFUSDogbmV3IFJlZ0V4cChtZXJnZShcIlteXFxcXCVcXFxcL1xcXFw6XFxcXEBdXCIsIFVOUkVTRVJWRUQkJCwgU1VCX0RFTElNUyQkKSwgXCJnXCIpLFxuICAgICAgICBOT1RfUEFUSF9OT1NDSEVNRTogbmV3IFJlZ0V4cChtZXJnZShcIlteXFxcXCVcXFxcL1xcXFxAXVwiLCBVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCksIFwiZ1wiKSxcbiAgICAgICAgTk9UX1FVRVJZOiBuZXcgUmVnRXhwKG1lcmdlKFwiW15cXFxcJV1cIiwgVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQsIFwiW1xcXFw6XFxcXEBcXFxcL1xcXFw/XVwiLCBJUFJJVkFURSQkKSwgXCJnXCIpLFxuICAgICAgICBOT1RfRlJBR01FTlQ6IG5ldyBSZWdFeHAobWVyZ2UoXCJbXlxcXFwlXVwiLCBVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCwgXCJbXFxcXDpcXFxcQFxcXFwvXFxcXD9dXCIpLCBcImdcIiksXG4gICAgICAgIEVTQ0FQRTogbmV3IFJlZ0V4cChtZXJnZShcIlteXVwiLCBVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCksIFwiZ1wiKSxcbiAgICAgICAgVU5SRVNFUlZFRDogbmV3IFJlZ0V4cChVTlJFU0VSVkVEJCQsIFwiZ1wiKSxcbiAgICAgICAgT1RIRVJfQ0hBUlM6IG5ldyBSZWdFeHAobWVyZ2UoXCJbXlxcXFwlXVwiLCBVTlJFU0VSVkVEJCQsIFJFU0VSVkVEJCQpLCBcImdcIiksXG4gICAgICAgIFBDVF9FTkNPREVEOiBuZXcgUmVnRXhwKFBDVF9FTkNPREVEJCwgXCJnXCIpLFxuICAgICAgICBJUFY0QUREUkVTUzogbmV3IFJlZ0V4cChcIl4oXCIgKyBJUFY0QUREUkVTUyQgKyBcIikkXCIpLFxuICAgICAgICBJUFY2QUREUkVTUzogbmV3IFJlZ0V4cChcIl5cXFxcWz8oXCIgKyBJUFY2QUREUkVTUyQgKyBcIilcIiArIHN1YmV4cChzdWJleHAoXCJcXFxcJTI1fFxcXFwlKD8hXCIgKyBIRVhESUckJCArIFwiezJ9KVwiKSArIFwiKFwiICsgWk9ORUlEJCArIFwiKVwiKSArIFwiP1xcXFxdPyRcIikgLy9SRkMgNjg3NCwgd2l0aCByZWxheGVkIHBhcnNpbmcgcnVsZXNcbiAgICB9O1xufVxudmFyIFVSSV9QUk9UT0NPTCA9IGJ1aWxkRXhwcyhmYWxzZSk7XG5cbnZhciBJUklfUFJPVE9DT0wgPSBidWlsZEV4cHModHJ1ZSk7XG5cbnZhciBzbGljZWRUb0FycmF5ID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBzbGljZUl0ZXJhdG9yKGFyciwgaSkge1xuICAgIHZhciBfYXJyID0gW107XG4gICAgdmFyIF9uID0gdHJ1ZTtcbiAgICB2YXIgX2QgPSBmYWxzZTtcbiAgICB2YXIgX2UgPSB1bmRlZmluZWQ7XG5cbiAgICB0cnkge1xuICAgICAgZm9yICh2YXIgX2kgPSBhcnJbU3ltYm9sLml0ZXJhdG9yXSgpLCBfczsgIShfbiA9IChfcyA9IF9pLm5leHQoKSkuZG9uZSk7IF9uID0gdHJ1ZSkge1xuICAgICAgICBfYXJyLnB1c2goX3MudmFsdWUpO1xuXG4gICAgICAgIGlmIChpICYmIF9hcnIubGVuZ3RoID09PSBpKSBicmVhaztcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIF9kID0gdHJ1ZTtcbiAgICAgIF9lID0gZXJyO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoIV9uICYmIF9pW1wicmV0dXJuXCJdKSBfaVtcInJldHVyblwiXSgpO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgaWYgKF9kKSB0aHJvdyBfZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gX2FycjtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAoYXJyLCBpKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkge1xuICAgICAgcmV0dXJuIGFycjtcbiAgICB9IGVsc2UgaWYgKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoYXJyKSkge1xuICAgICAgcmV0dXJuIHNsaWNlSXRlcmF0b3IoYXJyLCBpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgYXR0ZW1wdCB0byBkZXN0cnVjdHVyZSBub24taXRlcmFibGUgaW5zdGFuY2VcIik7XG4gICAgfVxuICB9O1xufSgpO1xuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG52YXIgdG9Db25zdW1hYmxlQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KGFycikpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgYXJyMiA9IEFycmF5KGFyci5sZW5ndGgpOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBhcnIyW2ldID0gYXJyW2ldO1xuXG4gICAgcmV0dXJuIGFycjI7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oYXJyKTtcbiAgfVxufTtcblxuLyoqIEhpZ2hlc3QgcG9zaXRpdmUgc2lnbmVkIDMyLWJpdCBmbG9hdCB2YWx1ZSAqL1xuXG52YXIgbWF4SW50ID0gMjE0NzQ4MzY0NzsgLy8gYWthLiAweDdGRkZGRkZGIG9yIDJeMzEtMVxuXG4vKiogQm9vdHN0cmluZyBwYXJhbWV0ZXJzICovXG52YXIgYmFzZSA9IDM2O1xudmFyIHRNaW4gPSAxO1xudmFyIHRNYXggPSAyNjtcbnZhciBza2V3ID0gMzg7XG52YXIgZGFtcCA9IDcwMDtcbnZhciBpbml0aWFsQmlhcyA9IDcyO1xudmFyIGluaXRpYWxOID0gMTI4OyAvLyAweDgwXG52YXIgZGVsaW1pdGVyID0gJy0nOyAvLyAnXFx4MkQnXG5cbi8qKiBSZWd1bGFyIGV4cHJlc3Npb25zICovXG52YXIgcmVnZXhQdW55Y29kZSA9IC9eeG4tLS87XG52YXIgcmVnZXhOb25BU0NJSSA9IC9bXlxcMC1cXHg3RV0vOyAvLyBub24tQVNDSUkgY2hhcnNcbnZhciByZWdleFNlcGFyYXRvcnMgPSAvW1xceDJFXFx1MzAwMlxcdUZGMEVcXHVGRjYxXS9nOyAvLyBSRkMgMzQ5MCBzZXBhcmF0b3JzXG5cbi8qKiBFcnJvciBtZXNzYWdlcyAqL1xudmFyIGVycm9ycyA9IHtcblx0J292ZXJmbG93JzogJ092ZXJmbG93OiBpbnB1dCBuZWVkcyB3aWRlciBpbnRlZ2VycyB0byBwcm9jZXNzJyxcblx0J25vdC1iYXNpYyc6ICdJbGxlZ2FsIGlucHV0ID49IDB4ODAgKG5vdCBhIGJhc2ljIGNvZGUgcG9pbnQpJyxcblx0J2ludmFsaWQtaW5wdXQnOiAnSW52YWxpZCBpbnB1dCdcbn07XG5cbi8qKiBDb252ZW5pZW5jZSBzaG9ydGN1dHMgKi9cbnZhciBiYXNlTWludXNUTWluID0gYmFzZSAtIHRNaW47XG52YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xudmFyIHN0cmluZ0Zyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGU7XG5cbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4vKipcbiAqIEEgZ2VuZXJpYyBlcnJvciB1dGlsaXR5IGZ1bmN0aW9uLlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIFRoZSBlcnJvciB0eXBlLlxuICogQHJldHVybnMge0Vycm9yfSBUaHJvd3MgYSBgUmFuZ2VFcnJvcmAgd2l0aCB0aGUgYXBwbGljYWJsZSBlcnJvciBtZXNzYWdlLlxuICovXG5mdW5jdGlvbiBlcnJvciQxKHR5cGUpIHtcblx0dGhyb3cgbmV3IFJhbmdlRXJyb3IoZXJyb3JzW3R5cGVdKTtcbn1cblxuLyoqXG4gKiBBIGdlbmVyaWMgYEFycmF5I21hcGAgdXRpbGl0eSBmdW5jdGlvbi5cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5IGFycmF5XG4gKiBpdGVtLlxuICogQHJldHVybnMge0FycmF5fSBBIG5ldyBhcnJheSBvZiB2YWx1ZXMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiBtYXAoYXJyYXksIGZuKSB7XG5cdHZhciByZXN1bHQgPSBbXTtcblx0dmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblx0d2hpbGUgKGxlbmd0aC0tKSB7XG5cdFx0cmVzdWx0W2xlbmd0aF0gPSBmbihhcnJheVtsZW5ndGhdKTtcblx0fVxuXHRyZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIEEgc2ltcGxlIGBBcnJheSNtYXBgLWxpa2Ugd3JhcHBlciB0byB3b3JrIHdpdGggZG9tYWluIG5hbWUgc3RyaW5ncyBvciBlbWFpbFxuICogYWRkcmVzc2VzLlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gVGhlIGRvbWFpbiBuYW1lIG9yIGVtYWlsIGFkZHJlc3MuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBmb3IgZXZlcnlcbiAqIGNoYXJhY3Rlci5cbiAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgc3RyaW5nIG9mIGNoYXJhY3RlcnMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrXG4gKiBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gbWFwRG9tYWluKHN0cmluZywgZm4pIHtcblx0dmFyIHBhcnRzID0gc3RyaW5nLnNwbGl0KCdAJyk7XG5cdHZhciByZXN1bHQgPSAnJztcblx0aWYgKHBhcnRzLmxlbmd0aCA+IDEpIHtcblx0XHQvLyBJbiBlbWFpbCBhZGRyZXNzZXMsIG9ubHkgdGhlIGRvbWFpbiBuYW1lIHNob3VsZCBiZSBwdW55Y29kZWQuIExlYXZlXG5cdFx0Ly8gdGhlIGxvY2FsIHBhcnQgKGkuZS4gZXZlcnl0aGluZyB1cCB0byBgQGApIGludGFjdC5cblx0XHRyZXN1bHQgPSBwYXJ0c1swXSArICdAJztcblx0XHRzdHJpbmcgPSBwYXJ0c1sxXTtcblx0fVxuXHQvLyBBdm9pZCBgc3BsaXQocmVnZXgpYCBmb3IgSUU4IGNvbXBhdGliaWxpdHkuIFNlZSAjMTcuXG5cdHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKHJlZ2V4U2VwYXJhdG9ycywgJ1xceDJFJyk7XG5cdHZhciBsYWJlbHMgPSBzdHJpbmcuc3BsaXQoJy4nKTtcblx0dmFyIGVuY29kZWQgPSBtYXAobGFiZWxzLCBmbikuam9pbignLicpO1xuXHRyZXR1cm4gcmVzdWx0ICsgZW5jb2RlZDtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIG51bWVyaWMgY29kZSBwb2ludHMgb2YgZWFjaCBVbmljb2RlXG4gKiBjaGFyYWN0ZXIgaW4gdGhlIHN0cmluZy4gV2hpbGUgSmF2YVNjcmlwdCB1c2VzIFVDUy0yIGludGVybmFsbHksXG4gKiB0aGlzIGZ1bmN0aW9uIHdpbGwgY29udmVydCBhIHBhaXIgb2Ygc3Vycm9nYXRlIGhhbHZlcyAoZWFjaCBvZiB3aGljaFxuICogVUNTLTIgZXhwb3NlcyBhcyBzZXBhcmF0ZSBjaGFyYWN0ZXJzKSBpbnRvIGEgc2luZ2xlIGNvZGUgcG9pbnQsXG4gKiBtYXRjaGluZyBVVEYtMTYuXG4gKiBAc2VlIGBwdW55Y29kZS51Y3MyLmVuY29kZWBcbiAqIEBzZWUgPGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nPlxuICogQG1lbWJlck9mIHB1bnljb2RlLnVjczJcbiAqIEBuYW1lIGRlY29kZVxuICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyBUaGUgVW5pY29kZSBpbnB1dCBzdHJpbmcgKFVDUy0yKS5cbiAqIEByZXR1cm5zIHtBcnJheX0gVGhlIG5ldyBhcnJheSBvZiBjb2RlIHBvaW50cy5cbiAqL1xuZnVuY3Rpb24gdWNzMmRlY29kZShzdHJpbmcpIHtcblx0dmFyIG91dHB1dCA9IFtdO1xuXHR2YXIgY291bnRlciA9IDA7XG5cdHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoO1xuXHR3aGlsZSAoY291bnRlciA8IGxlbmd0aCkge1xuXHRcdHZhciB2YWx1ZSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XG5cdFx0aWYgKHZhbHVlID49IDB4RDgwMCAmJiB2YWx1ZSA8PSAweERCRkYgJiYgY291bnRlciA8IGxlbmd0aCkge1xuXHRcdFx0Ly8gSXQncyBhIGhpZ2ggc3Vycm9nYXRlLCBhbmQgdGhlcmUgaXMgYSBuZXh0IGNoYXJhY3Rlci5cblx0XHRcdHZhciBleHRyYSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XG5cdFx0XHRpZiAoKGV4dHJhICYgMHhGQzAwKSA9PSAweERDMDApIHtcblx0XHRcdFx0Ly8gTG93IHN1cnJvZ2F0ZS5cblx0XHRcdFx0b3V0cHV0LnB1c2goKCh2YWx1ZSAmIDB4M0ZGKSA8PCAxMCkgKyAoZXh0cmEgJiAweDNGRikgKyAweDEwMDAwKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIEl0J3MgYW4gdW5tYXRjaGVkIHN1cnJvZ2F0ZTsgb25seSBhcHBlbmQgdGhpcyBjb2RlIHVuaXQsIGluIGNhc2UgdGhlXG5cdFx0XHRcdC8vIG5leHQgY29kZSB1bml0IGlzIHRoZSBoaWdoIHN1cnJvZ2F0ZSBvZiBhIHN1cnJvZ2F0ZSBwYWlyLlxuXHRcdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XG5cdFx0XHRcdGNvdW50ZXItLTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gb3V0cHV0O1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBzdHJpbmcgYmFzZWQgb24gYW4gYXJyYXkgb2YgbnVtZXJpYyBjb2RlIHBvaW50cy5cbiAqIEBzZWUgYHB1bnljb2RlLnVjczIuZGVjb2RlYFxuICogQG1lbWJlck9mIHB1bnljb2RlLnVjczJcbiAqIEBuYW1lIGVuY29kZVxuICogQHBhcmFtIHtBcnJheX0gY29kZVBvaW50cyBUaGUgYXJyYXkgb2YgbnVtZXJpYyBjb2RlIHBvaW50cy5cbiAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBuZXcgVW5pY29kZSBzdHJpbmcgKFVDUy0yKS5cbiAqL1xudmFyIHVjczJlbmNvZGUgPSBmdW5jdGlvbiB1Y3MyZW5jb2RlKGFycmF5KSB7XG5cdHJldHVybiBTdHJpbmcuZnJvbUNvZGVQb2ludC5hcHBseShTdHJpbmcsIHRvQ29uc3VtYWJsZUFycmF5KGFycmF5KSk7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIGEgYmFzaWMgY29kZSBwb2ludCBpbnRvIGEgZGlnaXQvaW50ZWdlci5cbiAqIEBzZWUgYGRpZ2l0VG9CYXNpYygpYFxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7TnVtYmVyfSBjb2RlUG9pbnQgVGhlIGJhc2ljIG51bWVyaWMgY29kZSBwb2ludCB2YWx1ZS5cbiAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludCAoZm9yIHVzZSBpblxuICogcmVwcmVzZW50aW5nIGludGVnZXJzKSBpbiB0aGUgcmFuZ2UgYDBgIHRvIGBiYXNlIC0gMWAsIG9yIGBiYXNlYCBpZlxuICogdGhlIGNvZGUgcG9pbnQgZG9lcyBub3QgcmVwcmVzZW50IGEgdmFsdWUuXG4gKi9cbnZhciBiYXNpY1RvRGlnaXQgPSBmdW5jdGlvbiBiYXNpY1RvRGlnaXQoY29kZVBvaW50KSB7XG5cdGlmIChjb2RlUG9pbnQgLSAweDMwIDwgMHgwQSkge1xuXHRcdHJldHVybiBjb2RlUG9pbnQgLSAweDE2O1xuXHR9XG5cdGlmIChjb2RlUG9pbnQgLSAweDQxIDwgMHgxQSkge1xuXHRcdHJldHVybiBjb2RlUG9pbnQgLSAweDQxO1xuXHR9XG5cdGlmIChjb2RlUG9pbnQgLSAweDYxIDwgMHgxQSkge1xuXHRcdHJldHVybiBjb2RlUG9pbnQgLSAweDYxO1xuXHR9XG5cdHJldHVybiBiYXNlO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIGRpZ2l0L2ludGVnZXIgaW50byBhIGJhc2ljIGNvZGUgcG9pbnQuXG4gKiBAc2VlIGBiYXNpY1RvRGlnaXQoKWBcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge051bWJlcn0gZGlnaXQgVGhlIG51bWVyaWMgdmFsdWUgb2YgYSBiYXNpYyBjb2RlIHBvaW50LlxuICogQHJldHVybnMge051bWJlcn0gVGhlIGJhc2ljIGNvZGUgcG9pbnQgd2hvc2UgdmFsdWUgKHdoZW4gdXNlZCBmb3JcbiAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaXMgYGRpZ2l0YCwgd2hpY2ggbmVlZHMgdG8gYmUgaW4gdGhlIHJhbmdlXG4gKiBgMGAgdG8gYGJhc2UgLSAxYC4gSWYgYGZsYWdgIGlzIG5vbi16ZXJvLCB0aGUgdXBwZXJjYXNlIGZvcm0gaXNcbiAqIHVzZWQ7IGVsc2UsIHRoZSBsb3dlcmNhc2UgZm9ybSBpcyB1c2VkLiBUaGUgYmVoYXZpb3IgaXMgdW5kZWZpbmVkXG4gKiBpZiBgZmxhZ2AgaXMgbm9uLXplcm8gYW5kIGBkaWdpdGAgaGFzIG5vIHVwcGVyY2FzZSBmb3JtLlxuICovXG52YXIgZGlnaXRUb0Jhc2ljID0gZnVuY3Rpb24gZGlnaXRUb0Jhc2ljKGRpZ2l0LCBmbGFnKSB7XG5cdC8vICAwLi4yNSBtYXAgdG8gQVNDSUkgYS4ueiBvciBBLi5aXG5cdC8vIDI2Li4zNSBtYXAgdG8gQVNDSUkgMC4uOVxuXHRyZXR1cm4gZGlnaXQgKyAyMiArIDc1ICogKGRpZ2l0IDwgMjYpIC0gKChmbGFnICE9IDApIDw8IDUpO1xufTtcblxuLyoqXG4gKiBCaWFzIGFkYXB0YXRpb24gZnVuY3Rpb24gYXMgcGVyIHNlY3Rpb24gMy40IG9mIFJGQyAzNDkyLlxuICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM0OTIjc2VjdGlvbi0zLjRcbiAqIEBwcml2YXRlXG4gKi9cbnZhciBhZGFwdCA9IGZ1bmN0aW9uIGFkYXB0KGRlbHRhLCBudW1Qb2ludHMsIGZpcnN0VGltZSkge1xuXHR2YXIgayA9IDA7XG5cdGRlbHRhID0gZmlyc3RUaW1lID8gZmxvb3IoZGVsdGEgLyBkYW1wKSA6IGRlbHRhID4+IDE7XG5cdGRlbHRhICs9IGZsb29yKGRlbHRhIC8gbnVtUG9pbnRzKTtcblx0Zm9yICg7IC8qIG5vIGluaXRpYWxpemF0aW9uICovZGVsdGEgPiBiYXNlTWludXNUTWluICogdE1heCA+PiAxOyBrICs9IGJhc2UpIHtcblx0XHRkZWx0YSA9IGZsb29yKGRlbHRhIC8gYmFzZU1pbnVzVE1pbik7XG5cdH1cblx0cmV0dXJuIGZsb29yKGsgKyAoYmFzZU1pbnVzVE1pbiArIDEpICogZGVsdGEgLyAoZGVsdGEgKyBza2V3KSk7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIGEgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scyB0byBhIHN0cmluZyBvZiBVbmljb2RlXG4gKiBzeW1ib2xzLlxuICogQG1lbWJlck9mIHB1bnljb2RlXG4gKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMuXG4gKi9cbnZhciBkZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUoaW5wdXQpIHtcblx0Ly8gRG9uJ3QgdXNlIFVDUy0yLlxuXHR2YXIgb3V0cHV0ID0gW107XG5cdHZhciBpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aDtcblx0dmFyIGkgPSAwO1xuXHR2YXIgbiA9IGluaXRpYWxOO1xuXHR2YXIgYmlhcyA9IGluaXRpYWxCaWFzO1xuXG5cdC8vIEhhbmRsZSB0aGUgYmFzaWMgY29kZSBwb2ludHM6IGxldCBgYmFzaWNgIGJlIHRoZSBudW1iZXIgb2YgaW5wdXQgY29kZVxuXHQvLyBwb2ludHMgYmVmb3JlIHRoZSBsYXN0IGRlbGltaXRlciwgb3IgYDBgIGlmIHRoZXJlIGlzIG5vbmUsIHRoZW4gY29weVxuXHQvLyB0aGUgZmlyc3QgYmFzaWMgY29kZSBwb2ludHMgdG8gdGhlIG91dHB1dC5cblxuXHR2YXIgYmFzaWMgPSBpbnB1dC5sYXN0SW5kZXhPZihkZWxpbWl0ZXIpO1xuXHRpZiAoYmFzaWMgPCAwKSB7XG5cdFx0YmFzaWMgPSAwO1xuXHR9XG5cblx0Zm9yICh2YXIgaiA9IDA7IGogPCBiYXNpYzsgKytqKSB7XG5cdFx0Ly8gaWYgaXQncyBub3QgYSBiYXNpYyBjb2RlIHBvaW50XG5cdFx0aWYgKGlucHV0LmNoYXJDb2RlQXQoaikgPj0gMHg4MCkge1xuXHRcdFx0ZXJyb3IkMSgnbm90LWJhc2ljJyk7XG5cdFx0fVxuXHRcdG91dHB1dC5wdXNoKGlucHV0LmNoYXJDb2RlQXQoaikpO1xuXHR9XG5cblx0Ly8gTWFpbiBkZWNvZGluZyBsb29wOiBzdGFydCBqdXN0IGFmdGVyIHRoZSBsYXN0IGRlbGltaXRlciBpZiBhbnkgYmFzaWMgY29kZVxuXHQvLyBwb2ludHMgd2VyZSBjb3BpZWQ7IHN0YXJ0IGF0IHRoZSBiZWdpbm5pbmcgb3RoZXJ3aXNlLlxuXG5cdGZvciAodmFyIGluZGV4ID0gYmFzaWMgPiAwID8gYmFzaWMgKyAxIDogMDsgaW5kZXggPCBpbnB1dExlbmd0aDspIC8qIG5vIGZpbmFsIGV4cHJlc3Npb24gKi97XG5cblx0XHQvLyBgaW5kZXhgIGlzIHRoZSBpbmRleCBvZiB0aGUgbmV4dCBjaGFyYWN0ZXIgdG8gYmUgY29uc3VtZWQuXG5cdFx0Ly8gRGVjb2RlIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXIgaW50byBgZGVsdGFgLFxuXHRcdC8vIHdoaWNoIGdldHMgYWRkZWQgdG8gYGlgLiBUaGUgb3ZlcmZsb3cgY2hlY2tpbmcgaXMgZWFzaWVyXG5cdFx0Ly8gaWYgd2UgaW5jcmVhc2UgYGlgIGFzIHdlIGdvLCB0aGVuIHN1YnRyYWN0IG9mZiBpdHMgc3RhcnRpbmdcblx0XHQvLyB2YWx1ZSBhdCB0aGUgZW5kIHRvIG9idGFpbiBgZGVsdGFgLlxuXHRcdHZhciBvbGRpID0gaTtcblx0XHRmb3IgKHZhciB3ID0gMSwgayA9IGJhc2U7OyAvKiBubyBjb25kaXRpb24gKi9rICs9IGJhc2UpIHtcblxuXHRcdFx0aWYgKGluZGV4ID49IGlucHV0TGVuZ3RoKSB7XG5cdFx0XHRcdGVycm9yJDEoJ2ludmFsaWQtaW5wdXQnKTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGRpZ2l0ID0gYmFzaWNUb0RpZ2l0KGlucHV0LmNoYXJDb2RlQXQoaW5kZXgrKykpO1xuXG5cdFx0XHRpZiAoZGlnaXQgPj0gYmFzZSB8fCBkaWdpdCA+IGZsb29yKChtYXhJbnQgLSBpKSAvIHcpKSB7XG5cdFx0XHRcdGVycm9yJDEoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdGkgKz0gZGlnaXQgKiB3O1xuXHRcdFx0dmFyIHQgPSBrIDw9IGJpYXMgPyB0TWluIDogayA+PSBiaWFzICsgdE1heCA/IHRNYXggOiBrIC0gYmlhcztcblxuXHRcdFx0aWYgKGRpZ2l0IDwgdCkge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblxuXHRcdFx0dmFyIGJhc2VNaW51c1QgPSBiYXNlIC0gdDtcblx0XHRcdGlmICh3ID4gZmxvb3IobWF4SW50IC8gYmFzZU1pbnVzVCkpIHtcblx0XHRcdFx0ZXJyb3IkMSgnb3ZlcmZsb3cnKTtcblx0XHRcdH1cblxuXHRcdFx0dyAqPSBiYXNlTWludXNUO1xuXHRcdH1cblxuXHRcdHZhciBvdXQgPSBvdXRwdXQubGVuZ3RoICsgMTtcblx0XHRiaWFzID0gYWRhcHQoaSAtIG9sZGksIG91dCwgb2xkaSA9PSAwKTtcblxuXHRcdC8vIGBpYCB3YXMgc3VwcG9zZWQgdG8gd3JhcCBhcm91bmQgZnJvbSBgb3V0YCB0byBgMGAsXG5cdFx0Ly8gaW5jcmVtZW50aW5nIGBuYCBlYWNoIHRpbWUsIHNvIHdlJ2xsIGZpeCB0aGF0IG5vdzpcblx0XHRpZiAoZmxvb3IoaSAvIG91dCkgPiBtYXhJbnQgLSBuKSB7XG5cdFx0XHRlcnJvciQxKCdvdmVyZmxvdycpO1xuXHRcdH1cblxuXHRcdG4gKz0gZmxvb3IoaSAvIG91dCk7XG5cdFx0aSAlPSBvdXQ7XG5cblx0XHQvLyBJbnNlcnQgYG5gIGF0IHBvc2l0aW9uIGBpYCBvZiB0aGUgb3V0cHV0LlxuXHRcdG91dHB1dC5zcGxpY2UoaSsrLCAwLCBuKTtcblx0fVxuXG5cdHJldHVybiBTdHJpbmcuZnJvbUNvZGVQb2ludC5hcHBseShTdHJpbmcsIG91dHB1dCk7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIGEgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scyAoZS5nLiBhIGRvbWFpbiBuYW1lIGxhYmVsKSB0byBhXG4gKiBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuICogQG1lbWJlck9mIHB1bnljb2RlXG4gKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMuXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG4gKi9cbnZhciBlbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUoaW5wdXQpIHtcblx0dmFyIG91dHB1dCA9IFtdO1xuXG5cdC8vIENvbnZlcnQgdGhlIGlucHV0IGluIFVDUy0yIHRvIGFuIGFycmF5IG9mIFVuaWNvZGUgY29kZSBwb2ludHMuXG5cdGlucHV0ID0gdWNzMmRlY29kZShpbnB1dCk7XG5cblx0Ly8gQ2FjaGUgdGhlIGxlbmd0aC5cblx0dmFyIGlucHV0TGVuZ3RoID0gaW5wdXQubGVuZ3RoO1xuXG5cdC8vIEluaXRpYWxpemUgdGhlIHN0YXRlLlxuXHR2YXIgbiA9IGluaXRpYWxOO1xuXHR2YXIgZGVsdGEgPSAwO1xuXHR2YXIgYmlhcyA9IGluaXRpYWxCaWFzO1xuXG5cdC8vIEhhbmRsZSB0aGUgYmFzaWMgY29kZSBwb2ludHMuXG5cdHZhciBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gdHJ1ZTtcblx0dmFyIF9kaWRJdGVyYXRvckVycm9yID0gZmFsc2U7XG5cdHZhciBfaXRlcmF0b3JFcnJvciA9IHVuZGVmaW5lZDtcblxuXHR0cnkge1xuXHRcdGZvciAodmFyIF9pdGVyYXRvciA9IGlucHV0W1N5bWJvbC5pdGVyYXRvcl0oKSwgX3N0ZXA7ICEoX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IChfc3RlcCA9IF9pdGVyYXRvci5uZXh0KCkpLmRvbmUpOyBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gdHJ1ZSkge1xuXHRcdFx0dmFyIF9jdXJyZW50VmFsdWUyID0gX3N0ZXAudmFsdWU7XG5cblx0XHRcdGlmIChfY3VycmVudFZhbHVlMiA8IDB4ODApIHtcblx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKF9jdXJyZW50VmFsdWUyKSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGNhdGNoIChlcnIpIHtcblx0XHRfZGlkSXRlcmF0b3JFcnJvciA9IHRydWU7XG5cdFx0X2l0ZXJhdG9yRXJyb3IgPSBlcnI7XG5cdH0gZmluYWxseSB7XG5cdFx0dHJ5IHtcblx0XHRcdGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiAmJiBfaXRlcmF0b3IucmV0dXJuKSB7XG5cdFx0XHRcdF9pdGVyYXRvci5yZXR1cm4oKTtcblx0XHRcdH1cblx0XHR9IGZpbmFsbHkge1xuXHRcdFx0aWYgKF9kaWRJdGVyYXRvckVycm9yKSB7XG5cdFx0XHRcdHRocm93IF9pdGVyYXRvckVycm9yO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHZhciBiYXNpY0xlbmd0aCA9IG91dHB1dC5sZW5ndGg7XG5cdHZhciBoYW5kbGVkQ1BDb3VudCA9IGJhc2ljTGVuZ3RoO1xuXG5cdC8vIGBoYW5kbGVkQ1BDb3VudGAgaXMgdGhlIG51bWJlciBvZiBjb2RlIHBvaW50cyB0aGF0IGhhdmUgYmVlbiBoYW5kbGVkO1xuXHQvLyBgYmFzaWNMZW5ndGhgIGlzIHRoZSBudW1iZXIgb2YgYmFzaWMgY29kZSBwb2ludHMuXG5cblx0Ly8gRmluaXNoIHRoZSBiYXNpYyBzdHJpbmcgd2l0aCBhIGRlbGltaXRlciB1bmxlc3MgaXQncyBlbXB0eS5cblx0aWYgKGJhc2ljTGVuZ3RoKSB7XG5cdFx0b3V0cHV0LnB1c2goZGVsaW1pdGVyKTtcblx0fVxuXG5cdC8vIE1haW4gZW5jb2RpbmcgbG9vcDpcblx0d2hpbGUgKGhhbmRsZWRDUENvdW50IDwgaW5wdXRMZW5ndGgpIHtcblxuXHRcdC8vIEFsbCBub24tYmFzaWMgY29kZSBwb2ludHMgPCBuIGhhdmUgYmVlbiBoYW5kbGVkIGFscmVhZHkuIEZpbmQgdGhlIG5leHRcblx0XHQvLyBsYXJnZXIgb25lOlxuXHRcdHZhciBtID0gbWF4SW50O1xuXHRcdHZhciBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IHRydWU7XG5cdFx0dmFyIF9kaWRJdGVyYXRvckVycm9yMiA9IGZhbHNlO1xuXHRcdHZhciBfaXRlcmF0b3JFcnJvcjIgPSB1bmRlZmluZWQ7XG5cblx0XHR0cnkge1xuXHRcdFx0Zm9yICh2YXIgX2l0ZXJhdG9yMiA9IGlucHV0W1N5bWJvbC5pdGVyYXRvcl0oKSwgX3N0ZXAyOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gKF9zdGVwMiA9IF9pdGVyYXRvcjIubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSB0cnVlKSB7XG5cdFx0XHRcdHZhciBjdXJyZW50VmFsdWUgPSBfc3RlcDIudmFsdWU7XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA+PSBuICYmIGN1cnJlbnRWYWx1ZSA8IG0pIHtcblx0XHRcdFx0XHRtID0gY3VycmVudFZhbHVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIEluY3JlYXNlIGBkZWx0YWAgZW5vdWdoIHRvIGFkdmFuY2UgdGhlIGRlY29kZXIncyA8bixpPiBzdGF0ZSB0byA8bSwwPixcblx0XHRcdC8vIGJ1dCBndWFyZCBhZ2FpbnN0IG92ZXJmbG93LlxuXHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0X2RpZEl0ZXJhdG9yRXJyb3IyID0gdHJ1ZTtcblx0XHRcdF9pdGVyYXRvckVycm9yMiA9IGVycjtcblx0XHR9IGZpbmFsbHkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aWYgKCFfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiAmJiBfaXRlcmF0b3IyLnJldHVybikge1xuXHRcdFx0XHRcdF9pdGVyYXRvcjIucmV0dXJuKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZmluYWxseSB7XG5cdFx0XHRcdGlmIChfZGlkSXRlcmF0b3JFcnJvcjIpIHtcblx0XHRcdFx0XHR0aHJvdyBfaXRlcmF0b3JFcnJvcjI7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHR2YXIgaGFuZGxlZENQQ291bnRQbHVzT25lID0gaGFuZGxlZENQQ291bnQgKyAxO1xuXHRcdGlmIChtIC0gbiA+IGZsb29yKChtYXhJbnQgLSBkZWx0YSkgLyBoYW5kbGVkQ1BDb3VudFBsdXNPbmUpKSB7XG5cdFx0XHRlcnJvciQxKCdvdmVyZmxvdycpO1xuXHRcdH1cblxuXHRcdGRlbHRhICs9IChtIC0gbikgKiBoYW5kbGVkQ1BDb3VudFBsdXNPbmU7XG5cdFx0biA9IG07XG5cblx0XHR2YXIgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjMgPSB0cnVlO1xuXHRcdHZhciBfZGlkSXRlcmF0b3JFcnJvcjMgPSBmYWxzZTtcblx0XHR2YXIgX2l0ZXJhdG9yRXJyb3IzID0gdW5kZWZpbmVkO1xuXG5cdFx0dHJ5IHtcblx0XHRcdGZvciAodmFyIF9pdGVyYXRvcjMgPSBpbnB1dFtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwMzsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMyA9IChfc3RlcDMgPSBfaXRlcmF0b3IzLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24zID0gdHJ1ZSkge1xuXHRcdFx0XHR2YXIgX2N1cnJlbnRWYWx1ZSA9IF9zdGVwMy52YWx1ZTtcblxuXHRcdFx0XHRpZiAoX2N1cnJlbnRWYWx1ZSA8IG4gJiYgKytkZWx0YSA+IG1heEludCkge1xuXHRcdFx0XHRcdGVycm9yJDEoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKF9jdXJyZW50VmFsdWUgPT0gbikge1xuXHRcdFx0XHRcdC8vIFJlcHJlc2VudCBkZWx0YSBhcyBhIGdlbmVyYWxpemVkIHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyLlxuXHRcdFx0XHRcdHZhciBxID0gZGVsdGE7XG5cdFx0XHRcdFx0Zm9yICh2YXIgayA9IGJhc2U7OyAvKiBubyBjb25kaXRpb24gKi9rICs9IGJhc2UpIHtcblx0XHRcdFx0XHRcdHZhciB0ID0gayA8PSBiaWFzID8gdE1pbiA6IGsgPj0gYmlhcyArIHRNYXggPyB0TWF4IDogayAtIGJpYXM7XG5cdFx0XHRcdFx0XHRpZiAocSA8IHQpIHtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR2YXIgcU1pbnVzVCA9IHEgLSB0O1xuXHRcdFx0XHRcdFx0dmFyIGJhc2VNaW51c1QgPSBiYXNlIC0gdDtcblx0XHRcdFx0XHRcdG91dHB1dC5wdXNoKHN0cmluZ0Zyb21DaGFyQ29kZShkaWdpdFRvQmFzaWModCArIHFNaW51c1QgJSBiYXNlTWludXNULCAwKSkpO1xuXHRcdFx0XHRcdFx0cSA9IGZsb29yKHFNaW51c1QgLyBiYXNlTWludXNUKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHEsIDApKSk7XG5cdFx0XHRcdFx0YmlhcyA9IGFkYXB0KGRlbHRhLCBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsIGhhbmRsZWRDUENvdW50ID09IGJhc2ljTGVuZ3RoKTtcblx0XHRcdFx0XHRkZWx0YSA9IDA7XG5cdFx0XHRcdFx0KytoYW5kbGVkQ1BDb3VudDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0X2RpZEl0ZXJhdG9yRXJyb3IzID0gdHJ1ZTtcblx0XHRcdF9pdGVyYXRvckVycm9yMyA9IGVycjtcblx0XHR9IGZpbmFsbHkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aWYgKCFfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMyAmJiBfaXRlcmF0b3IzLnJldHVybikge1xuXHRcdFx0XHRcdF9pdGVyYXRvcjMucmV0dXJuKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZmluYWxseSB7XG5cdFx0XHRcdGlmIChfZGlkSXRlcmF0b3JFcnJvcjMpIHtcblx0XHRcdFx0XHR0aHJvdyBfaXRlcmF0b3JFcnJvcjM7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQrK2RlbHRhO1xuXHRcdCsrbjtcblx0fVxuXHRyZXR1cm4gb3V0cHV0LmpvaW4oJycpO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIFB1bnljb2RlIHN0cmluZyByZXByZXNlbnRpbmcgYSBkb21haW4gbmFtZSBvciBhbiBlbWFpbCBhZGRyZXNzXG4gKiB0byBVbmljb2RlLiBPbmx5IHRoZSBQdW55Y29kZWQgcGFydHMgb2YgdGhlIGlucHV0IHdpbGwgYmUgY29udmVydGVkLCBpLmUuXG4gKiBpdCBkb2Vzbid0IG1hdHRlciBpZiB5b3UgY2FsbCBpdCBvbiBhIHN0cmluZyB0aGF0IGhhcyBhbHJlYWR5IGJlZW5cbiAqIGNvbnZlcnRlZCB0byBVbmljb2RlLlxuICogQG1lbWJlck9mIHB1bnljb2RlXG4gKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIFB1bnljb2RlZCBkb21haW4gbmFtZSBvciBlbWFpbCBhZGRyZXNzIHRvXG4gKiBjb252ZXJ0IHRvIFVuaWNvZGUuXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgVW5pY29kZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZ2l2ZW4gUHVueWNvZGVcbiAqIHN0cmluZy5cbiAqL1xudmFyIHRvVW5pY29kZSA9IGZ1bmN0aW9uIHRvVW5pY29kZShpbnB1dCkge1xuXHRyZXR1cm4gbWFwRG9tYWluKGlucHV0LCBmdW5jdGlvbiAoc3RyaW5nKSB7XG5cdFx0cmV0dXJuIHJlZ2V4UHVueWNvZGUudGVzdChzdHJpbmcpID8gZGVjb2RlKHN0cmluZy5zbGljZSg0KS50b0xvd2VyQ2FzZSgpKSA6IHN0cmluZztcblx0fSk7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIGEgVW5pY29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgb3IgYW4gZW1haWwgYWRkcmVzcyB0b1xuICogUHVueWNvZGUuIE9ubHkgdGhlIG5vbi1BU0NJSSBwYXJ0cyBvZiB0aGUgZG9tYWluIG5hbWUgd2lsbCBiZSBjb252ZXJ0ZWQsXG4gKiBpLmUuIGl0IGRvZXNuJ3QgbWF0dGVyIGlmIHlvdSBjYWxsIGl0IHdpdGggYSBkb21haW4gdGhhdCdzIGFscmVhZHkgaW5cbiAqIEFTQ0lJLlxuICogQG1lbWJlck9mIHB1bnljb2RlXG4gKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIGRvbWFpbiBuYW1lIG9yIGVtYWlsIGFkZHJlc3MgdG8gY29udmVydCwgYXMgYVxuICogVW5pY29kZSBzdHJpbmcuXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgUHVueWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIGRvbWFpbiBuYW1lIG9yXG4gKiBlbWFpbCBhZGRyZXNzLlxuICovXG52YXIgdG9BU0NJSSA9IGZ1bmN0aW9uIHRvQVNDSUkoaW5wdXQpIHtcblx0cmV0dXJuIG1hcERvbWFpbihpbnB1dCwgZnVuY3Rpb24gKHN0cmluZykge1xuXHRcdHJldHVybiByZWdleE5vbkFTQ0lJLnRlc3Qoc3RyaW5nKSA/ICd4bi0tJyArIGVuY29kZShzdHJpbmcpIDogc3RyaW5nO1xuXHR9KTtcbn07XG5cbi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4vKiogRGVmaW5lIHRoZSBwdWJsaWMgQVBJICovXG52YXIgcHVueWNvZGUgPSB7XG5cdC8qKlxuICAqIEEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgY3VycmVudCBQdW55Y29kZS5qcyB2ZXJzaW9uIG51bWJlci5cbiAgKiBAbWVtYmVyT2YgcHVueWNvZGVcbiAgKiBAdHlwZSBTdHJpbmdcbiAgKi9cblx0J3ZlcnNpb24nOiAnMi4xLjAnLFxuXHQvKipcbiAgKiBBbiBvYmplY3Qgb2YgbWV0aG9kcyB0byBjb252ZXJ0IGZyb20gSmF2YVNjcmlwdCdzIGludGVybmFsIGNoYXJhY3RlclxuICAqIHJlcHJlc2VudGF0aW9uIChVQ1MtMikgdG8gVW5pY29kZSBjb2RlIHBvaW50cywgYW5kIGJhY2suXG4gICogQHNlZSA8aHR0cHM6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmc+XG4gICogQG1lbWJlck9mIHB1bnljb2RlXG4gICogQHR5cGUgT2JqZWN0XG4gICovXG5cdCd1Y3MyJzoge1xuXHRcdCdkZWNvZGUnOiB1Y3MyZGVjb2RlLFxuXHRcdCdlbmNvZGUnOiB1Y3MyZW5jb2RlXG5cdH0sXG5cdCdkZWNvZGUnOiBkZWNvZGUsXG5cdCdlbmNvZGUnOiBlbmNvZGUsXG5cdCd0b0FTQ0lJJzogdG9BU0NJSSxcblx0J3RvVW5pY29kZSc6IHRvVW5pY29kZVxufTtcblxuLyoqXG4gKiBVUkkuanNcbiAqXG4gKiBAZmlsZW92ZXJ2aWV3IEFuIFJGQyAzOTg2IGNvbXBsaWFudCwgc2NoZW1lIGV4dGVuZGFibGUgVVJJIHBhcnNpbmcvdmFsaWRhdGluZy9yZXNvbHZpbmcgbGlicmFyeSBmb3IgSmF2YVNjcmlwdC5cbiAqIEBhdXRob3IgPGEgaHJlZj1cIm1haWx0bzpnYXJ5LmNvdXJ0QGdtYWlsLmNvbVwiPkdhcnkgQ291cnQ8L2E+XG4gKiBAc2VlIGh0dHA6Ly9naXRodWIuY29tL2dhcnljb3VydC91cmktanNcbiAqL1xuLyoqXG4gKiBDb3B5cmlnaHQgMjAxMSBHYXJ5IENvdXJ0LiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dCBtb2RpZmljYXRpb24sIGFyZVxuICogcGVybWl0dGVkIHByb3ZpZGVkIHRoYXQgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zIGFyZSBtZXQ6XG4gKlxuICogICAgMS4gUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlLCB0aGlzIGxpc3Qgb2ZcbiAqICAgICAgIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lci5cbiAqXG4gKiAgICAyLiBSZWRpc3RyaWJ1dGlvbnMgaW4gYmluYXJ5IGZvcm0gbXVzdCByZXByb2R1Y2UgdGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UsIHRoaXMgbGlzdFxuICogICAgICAgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyIGluIHRoZSBkb2N1bWVudGF0aW9uIGFuZC9vciBvdGhlciBtYXRlcmlhbHNcbiAqICAgICAgIHByb3ZpZGVkIHdpdGggdGhlIGRpc3RyaWJ1dGlvbi5cbiAqXG4gKiBUSElTIFNPRlRXQVJFIElTIFBST1ZJREVEIEJZIEdBUlkgQ09VUlQgYGBBUyBJUycnIEFORCBBTlkgRVhQUkVTUyBPUiBJTVBMSUVEXG4gKiBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFkgQU5EXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBUkUgRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgR0FSWSBDT1VSVCBPUlxuICogQ09OVFJJQlVUT1JTIEJFIExJQUJMRSBGT1IgQU5ZIERJUkVDVCwgSU5ESVJFQ1QsIElOQ0lERU5UQUwsIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1JcbiAqIENPTlNFUVVFTlRJQUwgREFNQUdFUyAoSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1JcbiAqIFNFUlZJQ0VTOyBMT1NTIE9GIFVTRSwgREFUQSwgT1IgUFJPRklUUzsgT1IgQlVTSU5FU1MgSU5URVJSVVBUSU9OKSBIT1dFVkVSIENBVVNFRCBBTkQgT05cbiAqIEFOWSBUSEVPUlkgT0YgTElBQklMSVRZLCBXSEVUSEVSIElOIENPTlRSQUNULCBTVFJJQ1QgTElBQklMSVRZLCBPUiBUT1JUIChJTkNMVURJTkdcbiAqIE5FR0xJR0VOQ0UgT1IgT1RIRVJXSVNFKSBBUklTSU5HIElOIEFOWSBXQVkgT1VUIE9GIFRIRSBVU0UgT0YgVEhJUyBTT0ZUV0FSRSwgRVZFTiBJRlxuICogQURWSVNFRCBPRiBUSEUgUE9TU0lCSUxJVFkgT0YgU1VDSCBEQU1BR0UuXG4gKlxuICogVGhlIHZpZXdzIGFuZCBjb25jbHVzaW9ucyBjb250YWluZWQgaW4gdGhlIHNvZnR3YXJlIGFuZCBkb2N1bWVudGF0aW9uIGFyZSB0aG9zZSBvZiB0aGVcbiAqIGF1dGhvcnMgYW5kIHNob3VsZCBub3QgYmUgaW50ZXJwcmV0ZWQgYXMgcmVwcmVzZW50aW5nIG9mZmljaWFsIHBvbGljaWVzLCBlaXRoZXIgZXhwcmVzc2VkXG4gKiBvciBpbXBsaWVkLCBvZiBHYXJ5IENvdXJ0LlxuICovXG52YXIgU0NIRU1FUyA9IHt9O1xuZnVuY3Rpb24gcGN0RW5jQ2hhcihjaHIpIHtcbiAgICB2YXIgYyA9IGNoci5jaGFyQ29kZUF0KDApO1xuICAgIHZhciBlID0gdm9pZCAwO1xuICAgIGlmIChjIDwgMTYpIGUgPSBcIiUwXCIgKyBjLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO2Vsc2UgaWYgKGMgPCAxMjgpIGUgPSBcIiVcIiArIGMudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7ZWxzZSBpZiAoYyA8IDIwNDgpIGUgPSBcIiVcIiArIChjID4+IDYgfCAxOTIpLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpICsgXCIlXCIgKyAoYyAmIDYzIHwgMTI4KS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTtlbHNlIGUgPSBcIiVcIiArIChjID4+IDEyIHwgMjI0KS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKSArIFwiJVwiICsgKGMgPj4gNiAmIDYzIHwgMTI4KS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKSArIFwiJVwiICsgKGMgJiA2MyB8IDEyOCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7XG4gICAgcmV0dXJuIGU7XG59XG5mdW5jdGlvbiBwY3REZWNDaGFycyhzdHIpIHtcbiAgICB2YXIgbmV3U3RyID0gXCJcIjtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGlsID0gc3RyLmxlbmd0aDtcbiAgICB3aGlsZSAoaSA8IGlsKSB7XG4gICAgICAgIHZhciBjID0gcGFyc2VJbnQoc3RyLnN1YnN0cihpICsgMSwgMiksIDE2KTtcbiAgICAgICAgaWYgKGMgPCAxMjgpIHtcbiAgICAgICAgICAgIG5ld1N0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICAgICAgaSArPSAzO1xuICAgICAgICB9IGVsc2UgaWYgKGMgPj0gMTk0ICYmIGMgPCAyMjQpIHtcbiAgICAgICAgICAgIGlmIChpbCAtIGkgPj0gNikge1xuICAgICAgICAgICAgICAgIHZhciBjMiA9IHBhcnNlSW50KHN0ci5zdWJzdHIoaSArIDQsIDIpLCAxNik7XG4gICAgICAgICAgICAgICAgbmV3U3RyICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoKGMgJiAzMSkgPDwgNiB8IGMyICYgNjMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXdTdHIgKz0gc3RyLnN1YnN0cihpLCA2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkgKz0gNjtcbiAgICAgICAgfSBlbHNlIGlmIChjID49IDIyNCkge1xuICAgICAgICAgICAgaWYgKGlsIC0gaSA+PSA5KSB7XG4gICAgICAgICAgICAgICAgdmFyIF9jID0gcGFyc2VJbnQoc3RyLnN1YnN0cihpICsgNCwgMiksIDE2KTtcbiAgICAgICAgICAgICAgICB2YXIgYzMgPSBwYXJzZUludChzdHIuc3Vic3RyKGkgKyA3LCAyKSwgMTYpO1xuICAgICAgICAgICAgICAgIG5ld1N0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKChjICYgMTUpIDw8IDEyIHwgKF9jICYgNjMpIDw8IDYgfCBjMyAmIDYzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV3U3RyICs9IHN0ci5zdWJzdHIoaSwgOSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpICs9IDk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXdTdHIgKz0gc3RyLnN1YnN0cihpLCAzKTtcbiAgICAgICAgICAgIGkgKz0gMztcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3U3RyO1xufVxuZnVuY3Rpb24gX25vcm1hbGl6ZUNvbXBvbmVudEVuY29kaW5nKGNvbXBvbmVudHMsIHByb3RvY29sKSB7XG4gICAgZnVuY3Rpb24gZGVjb2RlVW5yZXNlcnZlZChzdHIpIHtcbiAgICAgICAgdmFyIGRlY1N0ciA9IHBjdERlY0NoYXJzKHN0cik7XG4gICAgICAgIHJldHVybiAhZGVjU3RyLm1hdGNoKHByb3RvY29sLlVOUkVTRVJWRUQpID8gc3RyIDogZGVjU3RyO1xuICAgIH1cbiAgICBpZiAoY29tcG9uZW50cy5zY2hlbWUpIGNvbXBvbmVudHMuc2NoZW1lID0gU3RyaW5nKGNvbXBvbmVudHMuc2NoZW1lKS5yZXBsYWNlKHByb3RvY29sLlBDVF9FTkNPREVELCBkZWNvZGVVbnJlc2VydmVkKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UocHJvdG9jb2wuTk9UX1NDSEVNRSwgXCJcIik7XG4gICAgaWYgKGNvbXBvbmVudHMudXNlcmluZm8gIT09IHVuZGVmaW5lZCkgY29tcG9uZW50cy51c2VyaW5mbyA9IFN0cmluZyhjb21wb25lbnRzLnVzZXJpbmZvKS5yZXBsYWNlKHByb3RvY29sLlBDVF9FTkNPREVELCBkZWNvZGVVbnJlc2VydmVkKS5yZXBsYWNlKHByb3RvY29sLk5PVF9VU0VSSU5GTywgcGN0RW5jQ2hhcikucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgdG9VcHBlckNhc2UpO1xuICAgIGlmIChjb21wb25lbnRzLmhvc3QgIT09IHVuZGVmaW5lZCkgY29tcG9uZW50cy5ob3N0ID0gU3RyaW5nKGNvbXBvbmVudHMuaG9zdCkucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgZGVjb2RlVW5yZXNlcnZlZCkudG9Mb3dlckNhc2UoKS5yZXBsYWNlKHByb3RvY29sLk5PVF9IT1NULCBwY3RFbmNDaGFyKS5yZXBsYWNlKHByb3RvY29sLlBDVF9FTkNPREVELCB0b1VwcGVyQ2FzZSk7XG4gICAgaWYgKGNvbXBvbmVudHMucGF0aCAhPT0gdW5kZWZpbmVkKSBjb21wb25lbnRzLnBhdGggPSBTdHJpbmcoY29tcG9uZW50cy5wYXRoKS5yZXBsYWNlKHByb3RvY29sLlBDVF9FTkNPREVELCBkZWNvZGVVbnJlc2VydmVkKS5yZXBsYWNlKGNvbXBvbmVudHMuc2NoZW1lID8gcHJvdG9jb2wuTk9UX1BBVEggOiBwcm90b2NvbC5OT1RfUEFUSF9OT1NDSEVNRSwgcGN0RW5jQ2hhcikucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgdG9VcHBlckNhc2UpO1xuICAgIGlmIChjb21wb25lbnRzLnF1ZXJ5ICE9PSB1bmRlZmluZWQpIGNvbXBvbmVudHMucXVlcnkgPSBTdHJpbmcoY29tcG9uZW50cy5xdWVyeSkucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgZGVjb2RlVW5yZXNlcnZlZCkucmVwbGFjZShwcm90b2NvbC5OT1RfUVVFUlksIHBjdEVuY0NoYXIpLnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIHRvVXBwZXJDYXNlKTtcbiAgICBpZiAoY29tcG9uZW50cy5mcmFnbWVudCAhPT0gdW5kZWZpbmVkKSBjb21wb25lbnRzLmZyYWdtZW50ID0gU3RyaW5nKGNvbXBvbmVudHMuZnJhZ21lbnQpLnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIGRlY29kZVVucmVzZXJ2ZWQpLnJlcGxhY2UocHJvdG9jb2wuTk9UX0ZSQUdNRU5ULCBwY3RFbmNDaGFyKS5yZXBsYWNlKHByb3RvY29sLlBDVF9FTkNPREVELCB0b1VwcGVyQ2FzZSk7XG4gICAgcmV0dXJuIGNvbXBvbmVudHM7XG59XG5cbmZ1bmN0aW9uIF9zdHJpcExlYWRpbmdaZXJvcyhzdHIpIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoL14wKiguKikvLCBcIiQxXCIpIHx8IFwiMFwiO1xufVxuZnVuY3Rpb24gX25vcm1hbGl6ZUlQdjQoaG9zdCwgcHJvdG9jb2wpIHtcbiAgICB2YXIgbWF0Y2hlcyA9IGhvc3QubWF0Y2gocHJvdG9jb2wuSVBWNEFERFJFU1MpIHx8IFtdO1xuXG4gICAgdmFyIF9tYXRjaGVzID0gc2xpY2VkVG9BcnJheShtYXRjaGVzLCAyKSxcbiAgICAgICAgYWRkcmVzcyA9IF9tYXRjaGVzWzFdO1xuXG4gICAgaWYgKGFkZHJlc3MpIHtcbiAgICAgICAgcmV0dXJuIGFkZHJlc3Muc3BsaXQoXCIuXCIpLm1hcChfc3RyaXBMZWFkaW5nWmVyb3MpLmpvaW4oXCIuXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBob3N0O1xuICAgIH1cbn1cbmZ1bmN0aW9uIF9ub3JtYWxpemVJUHY2KGhvc3QsIHByb3RvY29sKSB7XG4gICAgdmFyIG1hdGNoZXMgPSBob3N0Lm1hdGNoKHByb3RvY29sLklQVjZBRERSRVNTKSB8fCBbXTtcblxuICAgIHZhciBfbWF0Y2hlczIgPSBzbGljZWRUb0FycmF5KG1hdGNoZXMsIDMpLFxuICAgICAgICBhZGRyZXNzID0gX21hdGNoZXMyWzFdLFxuICAgICAgICB6b25lID0gX21hdGNoZXMyWzJdO1xuXG4gICAgaWYgKGFkZHJlc3MpIHtcbiAgICAgICAgdmFyIF9hZGRyZXNzJHRvTG93ZXJDYXNlJCA9IGFkZHJlc3MudG9Mb3dlckNhc2UoKS5zcGxpdCgnOjonKS5yZXZlcnNlKCksXG4gICAgICAgICAgICBfYWRkcmVzcyR0b0xvd2VyQ2FzZSQyID0gc2xpY2VkVG9BcnJheShfYWRkcmVzcyR0b0xvd2VyQ2FzZSQsIDIpLFxuICAgICAgICAgICAgbGFzdCA9IF9hZGRyZXNzJHRvTG93ZXJDYXNlJDJbMF0sXG4gICAgICAgICAgICBmaXJzdCA9IF9hZGRyZXNzJHRvTG93ZXJDYXNlJDJbMV07XG5cbiAgICAgICAgdmFyIGZpcnN0RmllbGRzID0gZmlyc3QgPyBmaXJzdC5zcGxpdChcIjpcIikubWFwKF9zdHJpcExlYWRpbmdaZXJvcykgOiBbXTtcbiAgICAgICAgdmFyIGxhc3RGaWVsZHMgPSBsYXN0LnNwbGl0KFwiOlwiKS5tYXAoX3N0cmlwTGVhZGluZ1plcm9zKTtcbiAgICAgICAgdmFyIGlzTGFzdEZpZWxkSVB2NEFkZHJlc3MgPSBwcm90b2NvbC5JUFY0QUREUkVTUy50ZXN0KGxhc3RGaWVsZHNbbGFzdEZpZWxkcy5sZW5ndGggLSAxXSk7XG4gICAgICAgIHZhciBmaWVsZENvdW50ID0gaXNMYXN0RmllbGRJUHY0QWRkcmVzcyA/IDcgOiA4O1xuICAgICAgICB2YXIgbGFzdEZpZWxkc1N0YXJ0ID0gbGFzdEZpZWxkcy5sZW5ndGggLSBmaWVsZENvdW50O1xuICAgICAgICB2YXIgZmllbGRzID0gQXJyYXkoZmllbGRDb3VudCk7XG4gICAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgZmllbGRDb3VudDsgKyt4KSB7XG4gICAgICAgICAgICBmaWVsZHNbeF0gPSBmaXJzdEZpZWxkc1t4XSB8fCBsYXN0RmllbGRzW2xhc3RGaWVsZHNTdGFydCArIHhdIHx8ICcnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0xhc3RGaWVsZElQdjRBZGRyZXNzKSB7XG4gICAgICAgICAgICBmaWVsZHNbZmllbGRDb3VudCAtIDFdID0gX25vcm1hbGl6ZUlQdjQoZmllbGRzW2ZpZWxkQ291bnQgLSAxXSwgcHJvdG9jb2wpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhbGxaZXJvRmllbGRzID0gZmllbGRzLnJlZHVjZShmdW5jdGlvbiAoYWNjLCBmaWVsZCwgaW5kZXgpIHtcbiAgICAgICAgICAgIGlmICghZmllbGQgfHwgZmllbGQgPT09IFwiMFwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxhc3RMb25nZXN0ID0gYWNjW2FjYy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICBpZiAobGFzdExvbmdlc3QgJiYgbGFzdExvbmdlc3QuaW5kZXggKyBsYXN0TG9uZ2VzdC5sZW5ndGggPT09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIGxhc3RMb25nZXN0Lmxlbmd0aCsrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGFjYy5wdXNoKHsgaW5kZXg6IGluZGV4LCBsZW5ndGg6IDEgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwgW10pO1xuICAgICAgICB2YXIgbG9uZ2VzdFplcm9GaWVsZHMgPSBhbGxaZXJvRmllbGRzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgIHJldHVybiBiLmxlbmd0aCAtIGEubGVuZ3RoO1xuICAgICAgICB9KVswXTtcbiAgICAgICAgdmFyIG5ld0hvc3QgPSB2b2lkIDA7XG4gICAgICAgIGlmIChsb25nZXN0WmVyb0ZpZWxkcyAmJiBsb25nZXN0WmVyb0ZpZWxkcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB2YXIgbmV3Rmlyc3QgPSBmaWVsZHMuc2xpY2UoMCwgbG9uZ2VzdFplcm9GaWVsZHMuaW5kZXgpO1xuICAgICAgICAgICAgdmFyIG5ld0xhc3QgPSBmaWVsZHMuc2xpY2UobG9uZ2VzdFplcm9GaWVsZHMuaW5kZXggKyBsb25nZXN0WmVyb0ZpZWxkcy5sZW5ndGgpO1xuICAgICAgICAgICAgbmV3SG9zdCA9IG5ld0ZpcnN0LmpvaW4oXCI6XCIpICsgXCI6OlwiICsgbmV3TGFzdC5qb2luKFwiOlwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ld0hvc3QgPSBmaWVsZHMuam9pbihcIjpcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHpvbmUpIHtcbiAgICAgICAgICAgIG5ld0hvc3QgKz0gXCIlXCIgKyB6b25lO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXdIb3N0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBob3N0O1xuICAgIH1cbn1cbnZhciBVUklfUEFSU0UgPSAvXig/OihbXjpcXC8/I10rKTopPyg/OlxcL1xcLygoPzooW15cXC8/I0BdKilAKT8oXFxbW15cXC8/I1xcXV0rXFxdfFteXFwvPyM6XSopKD86XFw6KFxcZCopKT8pKT8oW14/I10qKSg/OlxcPyhbXiNdKikpPyg/OiMoKD86LnxcXG58XFxyKSopKT8vaTtcbnZhciBOT19NQVRDSF9JU19VTkRFRklORUQgPSBcIlwiLm1hdGNoKC8oKXswfS8pWzFdID09PSB1bmRlZmluZWQ7XG5mdW5jdGlvbiBwYXJzZSh1cmlTdHJpbmcpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDoge307XG5cbiAgICB2YXIgY29tcG9uZW50cyA9IHt9O1xuICAgIHZhciBwcm90b2NvbCA9IG9wdGlvbnMuaXJpICE9PSBmYWxzZSA/IElSSV9QUk9UT0NPTCA6IFVSSV9QUk9UT0NPTDtcbiAgICBpZiAob3B0aW9ucy5yZWZlcmVuY2UgPT09IFwic3VmZml4XCIpIHVyaVN0cmluZyA9IChvcHRpb25zLnNjaGVtZSA/IG9wdGlvbnMuc2NoZW1lICsgXCI6XCIgOiBcIlwiKSArIFwiLy9cIiArIHVyaVN0cmluZztcbiAgICB2YXIgbWF0Y2hlcyA9IHVyaVN0cmluZy5tYXRjaChVUklfUEFSU0UpO1xuICAgIGlmIChtYXRjaGVzKSB7XG4gICAgICAgIGlmIChOT19NQVRDSF9JU19VTkRFRklORUQpIHtcbiAgICAgICAgICAgIC8vc3RvcmUgZWFjaCBjb21wb25lbnRcbiAgICAgICAgICAgIGNvbXBvbmVudHMuc2NoZW1lID0gbWF0Y2hlc1sxXTtcbiAgICAgICAgICAgIGNvbXBvbmVudHMudXNlcmluZm8gPSBtYXRjaGVzWzNdO1xuICAgICAgICAgICAgY29tcG9uZW50cy5ob3N0ID0gbWF0Y2hlc1s0XTtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucG9ydCA9IHBhcnNlSW50KG1hdGNoZXNbNV0sIDEwKTtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucGF0aCA9IG1hdGNoZXNbNl0gfHwgXCJcIjtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucXVlcnkgPSBtYXRjaGVzWzddO1xuICAgICAgICAgICAgY29tcG9uZW50cy5mcmFnbWVudCA9IG1hdGNoZXNbOF07XG4gICAgICAgICAgICAvL2ZpeCBwb3J0IG51bWJlclxuICAgICAgICAgICAgaWYgKGlzTmFOKGNvbXBvbmVudHMucG9ydCkpIHtcbiAgICAgICAgICAgICAgICBjb21wb25lbnRzLnBvcnQgPSBtYXRjaGVzWzVdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9JRSBGSVggZm9yIGltcHJvcGVyIFJlZ0V4cCBtYXRjaGluZ1xuICAgICAgICAgICAgLy9zdG9yZSBlYWNoIGNvbXBvbmVudFxuICAgICAgICAgICAgY29tcG9uZW50cy5zY2hlbWUgPSBtYXRjaGVzWzFdIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGNvbXBvbmVudHMudXNlcmluZm8gPSB1cmlTdHJpbmcuaW5kZXhPZihcIkBcIikgIT09IC0xID8gbWF0Y2hlc1szXSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGNvbXBvbmVudHMuaG9zdCA9IHVyaVN0cmluZy5pbmRleE9mKFwiLy9cIikgIT09IC0xID8gbWF0Y2hlc1s0XSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucG9ydCA9IHBhcnNlSW50KG1hdGNoZXNbNV0sIDEwKTtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucGF0aCA9IG1hdGNoZXNbNl0gfHwgXCJcIjtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucXVlcnkgPSB1cmlTdHJpbmcuaW5kZXhPZihcIj9cIikgIT09IC0xID8gbWF0Y2hlc1s3XSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGNvbXBvbmVudHMuZnJhZ21lbnQgPSB1cmlTdHJpbmcuaW5kZXhPZihcIiNcIikgIT09IC0xID8gbWF0Y2hlc1s4XSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIC8vZml4IHBvcnQgbnVtYmVyXG4gICAgICAgICAgICBpZiAoaXNOYU4oY29tcG9uZW50cy5wb3J0KSkge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudHMucG9ydCA9IHVyaVN0cmluZy5tYXRjaCgvXFwvXFwvKD86LnxcXG4pKlxcOig/OlxcL3xcXD98XFwjfCQpLykgPyBtYXRjaGVzWzRdIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjb21wb25lbnRzLmhvc3QpIHtcbiAgICAgICAgICAgIC8vbm9ybWFsaXplIElQIGhvc3RzXG4gICAgICAgICAgICBjb21wb25lbnRzLmhvc3QgPSBfbm9ybWFsaXplSVB2Nihfbm9ybWFsaXplSVB2NChjb21wb25lbnRzLmhvc3QsIHByb3RvY29sKSwgcHJvdG9jb2wpO1xuICAgICAgICB9XG4gICAgICAgIC8vZGV0ZXJtaW5lIHJlZmVyZW5jZSB0eXBlXG4gICAgICAgIGlmIChjb21wb25lbnRzLnNjaGVtZSA9PT0gdW5kZWZpbmVkICYmIGNvbXBvbmVudHMudXNlcmluZm8gPT09IHVuZGVmaW5lZCAmJiBjb21wb25lbnRzLmhvc3QgPT09IHVuZGVmaW5lZCAmJiBjb21wb25lbnRzLnBvcnQgPT09IHVuZGVmaW5lZCAmJiAhY29tcG9uZW50cy5wYXRoICYmIGNvbXBvbmVudHMucXVlcnkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29tcG9uZW50cy5yZWZlcmVuY2UgPSBcInNhbWUtZG9jdW1lbnRcIjtcbiAgICAgICAgfSBlbHNlIGlmIChjb21wb25lbnRzLnNjaGVtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb21wb25lbnRzLnJlZmVyZW5jZSA9IFwicmVsYXRpdmVcIjtcbiAgICAgICAgfSBlbHNlIGlmIChjb21wb25lbnRzLmZyYWdtZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucmVmZXJlbmNlID0gXCJhYnNvbHV0ZVwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29tcG9uZW50cy5yZWZlcmVuY2UgPSBcInVyaVwiO1xuICAgICAgICB9XG4gICAgICAgIC8vY2hlY2sgZm9yIHJlZmVyZW5jZSBlcnJvcnNcbiAgICAgICAgaWYgKG9wdGlvbnMucmVmZXJlbmNlICYmIG9wdGlvbnMucmVmZXJlbmNlICE9PSBcInN1ZmZpeFwiICYmIG9wdGlvbnMucmVmZXJlbmNlICE9PSBjb21wb25lbnRzLnJlZmVyZW5jZSkge1xuICAgICAgICAgICAgY29tcG9uZW50cy5lcnJvciA9IGNvbXBvbmVudHMuZXJyb3IgfHwgXCJVUkkgaXMgbm90IGEgXCIgKyBvcHRpb25zLnJlZmVyZW5jZSArIFwiIHJlZmVyZW5jZS5cIjtcbiAgICAgICAgfVxuICAgICAgICAvL2ZpbmQgc2NoZW1lIGhhbmRsZXJcbiAgICAgICAgdmFyIHNjaGVtZUhhbmRsZXIgPSBTQ0hFTUVTWyhvcHRpb25zLnNjaGVtZSB8fCBjb21wb25lbnRzLnNjaGVtZSB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpXTtcbiAgICAgICAgLy9jaGVjayBpZiBzY2hlbWUgY2FuJ3QgaGFuZGxlIElSSXNcbiAgICAgICAgaWYgKCFvcHRpb25zLnVuaWNvZGVTdXBwb3J0ICYmICghc2NoZW1lSGFuZGxlciB8fCAhc2NoZW1lSGFuZGxlci51bmljb2RlU3VwcG9ydCkpIHtcbiAgICAgICAgICAgIC8vaWYgaG9zdCBjb21wb25lbnQgaXMgYSBkb21haW4gbmFtZVxuICAgICAgICAgICAgaWYgKGNvbXBvbmVudHMuaG9zdCAmJiAob3B0aW9ucy5kb21haW5Ib3N0IHx8IHNjaGVtZUhhbmRsZXIgJiYgc2NoZW1lSGFuZGxlci5kb21haW5Ib3N0KSkge1xuICAgICAgICAgICAgICAgIC8vY29udmVydCBVbmljb2RlIElETiAtPiBBU0NJSSBJRE5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzLmhvc3QgPSBwdW55Y29kZS50b0FTQ0lJKGNvbXBvbmVudHMuaG9zdC5yZXBsYWNlKHByb3RvY29sLlBDVF9FTkNPREVELCBwY3REZWNDaGFycykudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzLmVycm9yID0gY29tcG9uZW50cy5lcnJvciB8fCBcIkhvc3QncyBkb21haW4gbmFtZSBjYW4gbm90IGJlIGNvbnZlcnRlZCB0byBBU0NJSSB2aWEgcHVueWNvZGU6IFwiICsgZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL2NvbnZlcnQgSVJJIC0+IFVSSVxuICAgICAgICAgICAgX25vcm1hbGl6ZUNvbXBvbmVudEVuY29kaW5nKGNvbXBvbmVudHMsIFVSSV9QUk9UT0NPTCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL25vcm1hbGl6ZSBlbmNvZGluZ3NcbiAgICAgICAgICAgIF9ub3JtYWxpemVDb21wb25lbnRFbmNvZGluZyhjb21wb25lbnRzLCBwcm90b2NvbCk7XG4gICAgICAgIH1cbiAgICAgICAgLy9wZXJmb3JtIHNjaGVtZSBzcGVjaWZpYyBwYXJzaW5nXG4gICAgICAgIGlmIChzY2hlbWVIYW5kbGVyICYmIHNjaGVtZUhhbmRsZXIucGFyc2UpIHtcbiAgICAgICAgICAgIHNjaGVtZUhhbmRsZXIucGFyc2UoY29tcG9uZW50cywgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBjb21wb25lbnRzLmVycm9yID0gY29tcG9uZW50cy5lcnJvciB8fCBcIlVSSSBjYW4gbm90IGJlIHBhcnNlZC5cIjtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBvbmVudHM7XG59XG5cbmZ1bmN0aW9uIF9yZWNvbXBvc2VBdXRob3JpdHkoY29tcG9uZW50cywgb3B0aW9ucykge1xuICAgIHZhciBwcm90b2NvbCA9IG9wdGlvbnMuaXJpICE9PSBmYWxzZSA/IElSSV9QUk9UT0NPTCA6IFVSSV9QUk9UT0NPTDtcbiAgICB2YXIgdXJpVG9rZW5zID0gW107XG4gICAgaWYgKGNvbXBvbmVudHMudXNlcmluZm8gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB1cmlUb2tlbnMucHVzaChjb21wb25lbnRzLnVzZXJpbmZvKTtcbiAgICAgICAgdXJpVG9rZW5zLnB1c2goXCJAXCIpO1xuICAgIH1cbiAgICBpZiAoY29tcG9uZW50cy5ob3N0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy9ub3JtYWxpemUgSVAgaG9zdHMsIGFkZCBicmFja2V0cyBhbmQgZXNjYXBlIHpvbmUgc2VwYXJhdG9yIGZvciBJUHY2XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKF9ub3JtYWxpemVJUHY2KF9ub3JtYWxpemVJUHY0KFN0cmluZyhjb21wb25lbnRzLmhvc3QpLCBwcm90b2NvbCksIHByb3RvY29sKS5yZXBsYWNlKHByb3RvY29sLklQVjZBRERSRVNTLCBmdW5jdGlvbiAoXywgJDEsICQyKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJbXCIgKyAkMSArICgkMiA/IFwiJTI1XCIgKyAkMiA6IFwiXCIpICsgXCJdXCI7XG4gICAgICAgIH0pKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBjb21wb25lbnRzLnBvcnQgPT09IFwibnVtYmVyXCIgfHwgdHlwZW9mIGNvbXBvbmVudHMucG9ydCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICB1cmlUb2tlbnMucHVzaChcIjpcIik7XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKFN0cmluZyhjb21wb25lbnRzLnBvcnQpKTtcbiAgICB9XG4gICAgcmV0dXJuIHVyaVRva2Vucy5sZW5ndGggPyB1cmlUb2tlbnMuam9pbihcIlwiKSA6IHVuZGVmaW5lZDtcbn1cblxudmFyIFJEUzEgPSAvXlxcLlxcLj9cXC8vO1xudmFyIFJEUzIgPSAvXlxcL1xcLihcXC98JCkvO1xudmFyIFJEUzMgPSAvXlxcL1xcLlxcLihcXC98JCkvO1xudmFyIFJEUzUgPSAvXlxcLz8oPzoufFxcbikqPyg/PVxcL3wkKS87XG5mdW5jdGlvbiByZW1vdmVEb3RTZWdtZW50cyhpbnB1dCkge1xuICAgIHZhciBvdXRwdXQgPSBbXTtcbiAgICB3aGlsZSAoaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgIGlmIChpbnB1dC5tYXRjaChSRFMxKSkge1xuICAgICAgICAgICAgaW5wdXQgPSBpbnB1dC5yZXBsYWNlKFJEUzEsIFwiXCIpO1xuICAgICAgICB9IGVsc2UgaWYgKGlucHV0Lm1hdGNoKFJEUzIpKSB7XG4gICAgICAgICAgICBpbnB1dCA9IGlucHV0LnJlcGxhY2UoUkRTMiwgXCIvXCIpO1xuICAgICAgICB9IGVsc2UgaWYgKGlucHV0Lm1hdGNoKFJEUzMpKSB7XG4gICAgICAgICAgICBpbnB1dCA9IGlucHV0LnJlcGxhY2UoUkRTMywgXCIvXCIpO1xuICAgICAgICAgICAgb3V0cHV0LnBvcCgpO1xuICAgICAgICB9IGVsc2UgaWYgKGlucHV0ID09PSBcIi5cIiB8fCBpbnB1dCA9PT0gXCIuLlwiKSB7XG4gICAgICAgICAgICBpbnB1dCA9IFwiXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgaW0gPSBpbnB1dC5tYXRjaChSRFM1KTtcbiAgICAgICAgICAgIGlmIChpbSkge1xuICAgICAgICAgICAgICAgIHZhciBzID0gaW1bMF07XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBpbnB1dC5zbGljZShzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2gocyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuZXhwZWN0ZWQgZG90IHNlZ21lbnQgY29uZGl0aW9uXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQuam9pbihcIlwiKTtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplKGNvbXBvbmVudHMpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDoge307XG5cbiAgICB2YXIgcHJvdG9jb2wgPSBvcHRpb25zLmlyaSA/IElSSV9QUk9UT0NPTCA6IFVSSV9QUk9UT0NPTDtcbiAgICB2YXIgdXJpVG9rZW5zID0gW107XG4gICAgLy9maW5kIHNjaGVtZSBoYW5kbGVyXG4gICAgdmFyIHNjaGVtZUhhbmRsZXIgPSBTQ0hFTUVTWyhvcHRpb25zLnNjaGVtZSB8fCBjb21wb25lbnRzLnNjaGVtZSB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpXTtcbiAgICAvL3BlcmZvcm0gc2NoZW1lIHNwZWNpZmljIHNlcmlhbGl6YXRpb25cbiAgICBpZiAoc2NoZW1lSGFuZGxlciAmJiBzY2hlbWVIYW5kbGVyLnNlcmlhbGl6ZSkgc2NoZW1lSGFuZGxlci5zZXJpYWxpemUoY29tcG9uZW50cywgb3B0aW9ucyk7XG4gICAgaWYgKGNvbXBvbmVudHMuaG9zdCkge1xuICAgICAgICAvL2lmIGhvc3QgY29tcG9uZW50IGlzIGFuIElQdjYgYWRkcmVzc1xuICAgICAgICBpZiAocHJvdG9jb2wuSVBWNkFERFJFU1MudGVzdChjb21wb25lbnRzLmhvc3QpKSB7fVxuICAgICAgICAvL1RPRE86IG5vcm1hbGl6ZSBJUHY2IGFkZHJlc3MgYXMgcGVyIFJGQyA1OTUyXG5cbiAgICAgICAgLy9pZiBob3N0IGNvbXBvbmVudCBpcyBhIGRvbWFpbiBuYW1lXG4gICAgICAgIGVsc2UgaWYgKG9wdGlvbnMuZG9tYWluSG9zdCB8fCBzY2hlbWVIYW5kbGVyICYmIHNjaGVtZUhhbmRsZXIuZG9tYWluSG9zdCkge1xuICAgICAgICAgICAgICAgIC8vY29udmVydCBJRE4gdmlhIHB1bnljb2RlXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50cy5ob3N0ID0gIW9wdGlvbnMuaXJpID8gcHVueWNvZGUudG9BU0NJSShjb21wb25lbnRzLmhvc3QucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgcGN0RGVjQ2hhcnMpLnRvTG93ZXJDYXNlKCkpIDogcHVueWNvZGUudG9Vbmljb2RlKGNvbXBvbmVudHMuaG9zdCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzLmVycm9yID0gY29tcG9uZW50cy5lcnJvciB8fCBcIkhvc3QncyBkb21haW4gbmFtZSBjYW4gbm90IGJlIGNvbnZlcnRlZCB0byBcIiArICghb3B0aW9ucy5pcmkgPyBcIkFTQ0lJXCIgOiBcIlVuaWNvZGVcIikgKyBcIiB2aWEgcHVueWNvZGU6IFwiICsgZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgfVxuICAgIC8vbm9ybWFsaXplIGVuY29kaW5nXG4gICAgX25vcm1hbGl6ZUNvbXBvbmVudEVuY29kaW5nKGNvbXBvbmVudHMsIHByb3RvY29sKTtcbiAgICBpZiAob3B0aW9ucy5yZWZlcmVuY2UgIT09IFwic3VmZml4XCIgJiYgY29tcG9uZW50cy5zY2hlbWUpIHtcbiAgICAgICAgdXJpVG9rZW5zLnB1c2goY29tcG9uZW50cy5zY2hlbWUpO1xuICAgICAgICB1cmlUb2tlbnMucHVzaChcIjpcIik7XG4gICAgfVxuICAgIHZhciBhdXRob3JpdHkgPSBfcmVjb21wb3NlQXV0aG9yaXR5KGNvbXBvbmVudHMsIG9wdGlvbnMpO1xuICAgIGlmIChhdXRob3JpdHkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAob3B0aW9ucy5yZWZlcmVuY2UgIT09IFwic3VmZml4XCIpIHtcbiAgICAgICAgICAgIHVyaVRva2Vucy5wdXNoKFwiLy9cIik7XG4gICAgICAgIH1cbiAgICAgICAgdXJpVG9rZW5zLnB1c2goYXV0aG9yaXR5KTtcbiAgICAgICAgaWYgKGNvbXBvbmVudHMucGF0aCAmJiBjb21wb25lbnRzLnBhdGguY2hhckF0KDApICE9PSBcIi9cIikge1xuICAgICAgICAgICAgdXJpVG9rZW5zLnB1c2goXCIvXCIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChjb21wb25lbnRzLnBhdGggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB2YXIgcyA9IGNvbXBvbmVudHMucGF0aDtcbiAgICAgICAgaWYgKCFvcHRpb25zLmFic29sdXRlUGF0aCAmJiAoIXNjaGVtZUhhbmRsZXIgfHwgIXNjaGVtZUhhbmRsZXIuYWJzb2x1dGVQYXRoKSkge1xuICAgICAgICAgICAgcyA9IHJlbW92ZURvdFNlZ21lbnRzKHMpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhdXRob3JpdHkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcyA9IHMucmVwbGFjZSgvXlxcL1xcLy8sIFwiLyUyRlwiKTsgLy9kb24ndCBhbGxvdyB0aGUgcGF0aCB0byBzdGFydCB3aXRoIFwiLy9cIlxuICAgICAgICB9XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKHMpO1xuICAgIH1cbiAgICBpZiAoY29tcG9uZW50cy5xdWVyeSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKFwiP1wiKTtcbiAgICAgICAgdXJpVG9rZW5zLnB1c2goY29tcG9uZW50cy5xdWVyeSk7XG4gICAgfVxuICAgIGlmIChjb21wb25lbnRzLmZyYWdtZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdXJpVG9rZW5zLnB1c2goXCIjXCIpO1xuICAgICAgICB1cmlUb2tlbnMucHVzaChjb21wb25lbnRzLmZyYWdtZW50KTtcbiAgICB9XG4gICAgcmV0dXJuIHVyaVRva2Vucy5qb2luKFwiXCIpOyAvL21lcmdlIHRva2VucyBpbnRvIGEgc3RyaW5nXG59XG5cbmZ1bmN0aW9uIHJlc29sdmVDb21wb25lbnRzKGJhc2UsIHJlbGF0aXZlKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IHt9O1xuICAgIHZhciBza2lwTm9ybWFsaXphdGlvbiA9IGFyZ3VtZW50c1szXTtcblxuICAgIHZhciB0YXJnZXQgPSB7fTtcbiAgICBpZiAoIXNraXBOb3JtYWxpemF0aW9uKSB7XG4gICAgICAgIGJhc2UgPSBwYXJzZShzZXJpYWxpemUoYmFzZSwgb3B0aW9ucyksIG9wdGlvbnMpOyAvL25vcm1hbGl6ZSBiYXNlIGNvbXBvbmVudHNcbiAgICAgICAgcmVsYXRpdmUgPSBwYXJzZShzZXJpYWxpemUocmVsYXRpdmUsIG9wdGlvbnMpLCBvcHRpb25zKTsgLy9ub3JtYWxpemUgcmVsYXRpdmUgY29tcG9uZW50c1xuICAgIH1cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBpZiAoIW9wdGlvbnMudG9sZXJhbnQgJiYgcmVsYXRpdmUuc2NoZW1lKSB7XG4gICAgICAgIHRhcmdldC5zY2hlbWUgPSByZWxhdGl2ZS5zY2hlbWU7XG4gICAgICAgIC8vdGFyZ2V0LmF1dGhvcml0eSA9IHJlbGF0aXZlLmF1dGhvcml0eTtcbiAgICAgICAgdGFyZ2V0LnVzZXJpbmZvID0gcmVsYXRpdmUudXNlcmluZm87XG4gICAgICAgIHRhcmdldC5ob3N0ID0gcmVsYXRpdmUuaG9zdDtcbiAgICAgICAgdGFyZ2V0LnBvcnQgPSByZWxhdGl2ZS5wb3J0O1xuICAgICAgICB0YXJnZXQucGF0aCA9IHJlbW92ZURvdFNlZ21lbnRzKHJlbGF0aXZlLnBhdGggfHwgXCJcIik7XG4gICAgICAgIHRhcmdldC5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChyZWxhdGl2ZS51c2VyaW5mbyAhPT0gdW5kZWZpbmVkIHx8IHJlbGF0aXZlLmhvc3QgIT09IHVuZGVmaW5lZCB8fCByZWxhdGl2ZS5wb3J0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vdGFyZ2V0LmF1dGhvcml0eSA9IHJlbGF0aXZlLmF1dGhvcml0eTtcbiAgICAgICAgICAgIHRhcmdldC51c2VyaW5mbyA9IHJlbGF0aXZlLnVzZXJpbmZvO1xuICAgICAgICAgICAgdGFyZ2V0Lmhvc3QgPSByZWxhdGl2ZS5ob3N0O1xuICAgICAgICAgICAgdGFyZ2V0LnBvcnQgPSByZWxhdGl2ZS5wb3J0O1xuICAgICAgICAgICAgdGFyZ2V0LnBhdGggPSByZW1vdmVEb3RTZWdtZW50cyhyZWxhdGl2ZS5wYXRoIHx8IFwiXCIpO1xuICAgICAgICAgICAgdGFyZ2V0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIXJlbGF0aXZlLnBhdGgpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXQucGF0aCA9IGJhc2UucGF0aDtcbiAgICAgICAgICAgICAgICBpZiAocmVsYXRpdmUucXVlcnkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQucXVlcnkgPSByZWxhdGl2ZS5xdWVyeTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQucXVlcnkgPSBiYXNlLnF1ZXJ5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlLnBhdGguY2hhckF0KDApID09PSBcIi9cIikge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQucGF0aCA9IHJlbW92ZURvdFNlZ21lbnRzKHJlbGF0aXZlLnBhdGgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoYmFzZS51c2VyaW5mbyAhPT0gdW5kZWZpbmVkIHx8IGJhc2UuaG9zdCAhPT0gdW5kZWZpbmVkIHx8IGJhc2UucG9ydCAhPT0gdW5kZWZpbmVkKSAmJiAhYmFzZS5wYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQucGF0aCA9IFwiL1wiICsgcmVsYXRpdmUucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICghYmFzZS5wYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQucGF0aCA9IHJlbGF0aXZlLnBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQucGF0aCA9IGJhc2UucGF0aC5zbGljZSgwLCBiYXNlLnBhdGgubGFzdEluZGV4T2YoXCIvXCIpICsgMSkgKyByZWxhdGl2ZS5wYXRoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5wYXRoID0gcmVtb3ZlRG90U2VnbWVudHModGFyZ2V0LnBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0YXJnZXQucXVlcnkgPSByZWxhdGl2ZS5xdWVyeTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vdGFyZ2V0LmF1dGhvcml0eSA9IGJhc2UuYXV0aG9yaXR5O1xuICAgICAgICAgICAgdGFyZ2V0LnVzZXJpbmZvID0gYmFzZS51c2VyaW5mbztcbiAgICAgICAgICAgIHRhcmdldC5ob3N0ID0gYmFzZS5ob3N0O1xuICAgICAgICAgICAgdGFyZ2V0LnBvcnQgPSBiYXNlLnBvcnQ7XG4gICAgICAgIH1cbiAgICAgICAgdGFyZ2V0LnNjaGVtZSA9IGJhc2Uuc2NoZW1lO1xuICAgIH1cbiAgICB0YXJnZXQuZnJhZ21lbnQgPSByZWxhdGl2ZS5mcmFnbWVudDtcbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG5mdW5jdGlvbiByZXNvbHZlKGJhc2VVUkksIHJlbGF0aXZlVVJJLCBvcHRpb25zKSB7XG4gICAgdmFyIHNjaGVtZWxlc3NPcHRpb25zID0gYXNzaWduKHsgc2NoZW1lOiAnbnVsbCcgfSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHNlcmlhbGl6ZShyZXNvbHZlQ29tcG9uZW50cyhwYXJzZShiYXNlVVJJLCBzY2hlbWVsZXNzT3B0aW9ucyksIHBhcnNlKHJlbGF0aXZlVVJJLCBzY2hlbWVsZXNzT3B0aW9ucyksIHNjaGVtZWxlc3NPcHRpb25zLCB0cnVlKSwgc2NoZW1lbGVzc09wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemUodXJpLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiB1cmkgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgdXJpID0gc2VyaWFsaXplKHBhcnNlKHVyaSwgb3B0aW9ucyksIG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAodHlwZU9mKHVyaSkgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgdXJpID0gcGFyc2Uoc2VyaWFsaXplKHVyaSwgb3B0aW9ucyksIG9wdGlvbnMpO1xuICAgIH1cbiAgICByZXR1cm4gdXJpO1xufVxuXG5mdW5jdGlvbiBlcXVhbCh1cmlBLCB1cmlCLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiB1cmlBID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHVyaUEgPSBzZXJpYWxpemUocGFyc2UodXJpQSwgb3B0aW9ucyksIG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAodHlwZU9mKHVyaUEpID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHVyaUEgPSBzZXJpYWxpemUodXJpQSwgb3B0aW9ucyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgdXJpQiA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICB1cmlCID0gc2VyaWFsaXplKHBhcnNlKHVyaUIsIG9wdGlvbnMpLCBvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVPZih1cmlCKSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICB1cmlCID0gc2VyaWFsaXplKHVyaUIsIG9wdGlvbnMpO1xuICAgIH1cbiAgICByZXR1cm4gdXJpQSA9PT0gdXJpQjtcbn1cblxuZnVuY3Rpb24gZXNjYXBlQ29tcG9uZW50KHN0ciwgb3B0aW9ucykge1xuICAgIHJldHVybiBzdHIgJiYgc3RyLnRvU3RyaW5nKCkucmVwbGFjZSghb3B0aW9ucyB8fCAhb3B0aW9ucy5pcmkgPyBVUklfUFJPVE9DT0wuRVNDQVBFIDogSVJJX1BST1RPQ09MLkVTQ0FQRSwgcGN0RW5jQ2hhcik7XG59XG5cbmZ1bmN0aW9uIHVuZXNjYXBlQ29tcG9uZW50KHN0ciwgb3B0aW9ucykge1xuICAgIHJldHVybiBzdHIgJiYgc3RyLnRvU3RyaW5nKCkucmVwbGFjZSghb3B0aW9ucyB8fCAhb3B0aW9ucy5pcmkgPyBVUklfUFJPVE9DT0wuUENUX0VOQ09ERUQgOiBJUklfUFJPVE9DT0wuUENUX0VOQ09ERUQsIHBjdERlY0NoYXJzKTtcbn1cblxudmFyIGhhbmRsZXIgPSB7XG4gICAgc2NoZW1lOiBcImh0dHBcIixcbiAgICBkb21haW5Ib3N0OiB0cnVlLFxuICAgIHBhcnNlOiBmdW5jdGlvbiBwYXJzZShjb21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgICAgIC8vcmVwb3J0IG1pc3NpbmcgaG9zdFxuICAgICAgICBpZiAoIWNvbXBvbmVudHMuaG9zdCkge1xuICAgICAgICAgICAgY29tcG9uZW50cy5lcnJvciA9IGNvbXBvbmVudHMuZXJyb3IgfHwgXCJIVFRQIFVSSXMgbXVzdCBoYXZlIGEgaG9zdC5cIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29tcG9uZW50cztcbiAgICB9LFxuICAgIHNlcmlhbGl6ZTogZnVuY3Rpb24gc2VyaWFsaXplKGNvbXBvbmVudHMsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHNlY3VyZSA9IFN0cmluZyhjb21wb25lbnRzLnNjaGVtZSkudG9Mb3dlckNhc2UoKSA9PT0gXCJodHRwc1wiO1xuICAgICAgICAvL25vcm1hbGl6ZSB0aGUgZGVmYXVsdCBwb3J0XG4gICAgICAgIGlmIChjb21wb25lbnRzLnBvcnQgPT09IChzZWN1cmUgPyA0NDMgOiA4MCkgfHwgY29tcG9uZW50cy5wb3J0ID09PSBcIlwiKSB7XG4gICAgICAgICAgICBjb21wb25lbnRzLnBvcnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy9ub3JtYWxpemUgdGhlIGVtcHR5IHBhdGhcbiAgICAgICAgaWYgKCFjb21wb25lbnRzLnBhdGgpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucGF0aCA9IFwiL1wiO1xuICAgICAgICB9XG4gICAgICAgIC8vTk9URTogV2UgZG8gbm90IHBhcnNlIHF1ZXJ5IHN0cmluZ3MgZm9yIEhUVFAgVVJJc1xuICAgICAgICAvL2FzIFdXVyBGb3JtIFVybCBFbmNvZGVkIHF1ZXJ5IHN0cmluZ3MgYXJlIHBhcnQgb2YgdGhlIEhUTUw0KyBzcGVjLFxuICAgICAgICAvL2FuZCBub3QgdGhlIEhUVFAgc3BlYy5cbiAgICAgICAgcmV0dXJuIGNvbXBvbmVudHM7XG4gICAgfVxufTtcblxudmFyIGhhbmRsZXIkMSA9IHtcbiAgICBzY2hlbWU6IFwiaHR0cHNcIixcbiAgICBkb21haW5Ib3N0OiBoYW5kbGVyLmRvbWFpbkhvc3QsXG4gICAgcGFyc2U6IGhhbmRsZXIucGFyc2UsXG4gICAgc2VyaWFsaXplOiBoYW5kbGVyLnNlcmlhbGl6ZVxufTtcblxuZnVuY3Rpb24gaXNTZWN1cmUod3NDb21wb25lbnRzKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB3c0NvbXBvbmVudHMuc2VjdXJlID09PSAnYm9vbGVhbicgPyB3c0NvbXBvbmVudHMuc2VjdXJlIDogU3RyaW5nKHdzQ29tcG9uZW50cy5zY2hlbWUpLnRvTG93ZXJDYXNlKCkgPT09IFwid3NzXCI7XG59XG4vL1JGQyA2NDU1XG52YXIgaGFuZGxlciQyID0ge1xuICAgIHNjaGVtZTogXCJ3c1wiLFxuICAgIGRvbWFpbkhvc3Q6IHRydWUsXG4gICAgcGFyc2U6IGZ1bmN0aW9uIHBhcnNlKGNvbXBvbmVudHMsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHdzQ29tcG9uZW50cyA9IGNvbXBvbmVudHM7XG4gICAgICAgIC8vaW5kaWNhdGUgaWYgdGhlIHNlY3VyZSBmbGFnIGlzIHNldFxuICAgICAgICB3c0NvbXBvbmVudHMuc2VjdXJlID0gaXNTZWN1cmUod3NDb21wb25lbnRzKTtcbiAgICAgICAgLy9jb25zdHJ1Y3QgcmVzb3VjZSBuYW1lXG4gICAgICAgIHdzQ29tcG9uZW50cy5yZXNvdXJjZU5hbWUgPSAod3NDb21wb25lbnRzLnBhdGggfHwgJy8nKSArICh3c0NvbXBvbmVudHMucXVlcnkgPyAnPycgKyB3c0NvbXBvbmVudHMucXVlcnkgOiAnJyk7XG4gICAgICAgIHdzQ29tcG9uZW50cy5wYXRoID0gdW5kZWZpbmVkO1xuICAgICAgICB3c0NvbXBvbmVudHMucXVlcnkgPSB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiB3c0NvbXBvbmVudHM7XG4gICAgfSxcbiAgICBzZXJpYWxpemU6IGZ1bmN0aW9uIHNlcmlhbGl6ZSh3c0NvbXBvbmVudHMsIG9wdGlvbnMpIHtcbiAgICAgICAgLy9ub3JtYWxpemUgdGhlIGRlZmF1bHQgcG9ydFxuICAgICAgICBpZiAod3NDb21wb25lbnRzLnBvcnQgPT09IChpc1NlY3VyZSh3c0NvbXBvbmVudHMpID8gNDQzIDogODApIHx8IHdzQ29tcG9uZW50cy5wb3J0ID09PSBcIlwiKSB7XG4gICAgICAgICAgICB3c0NvbXBvbmVudHMucG9ydCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICAvL2Vuc3VyZSBzY2hlbWUgbWF0Y2hlcyBzZWN1cmUgZmxhZ1xuICAgICAgICBpZiAodHlwZW9mIHdzQ29tcG9uZW50cy5zZWN1cmUgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgd3NDb21wb25lbnRzLnNjaGVtZSA9IHdzQ29tcG9uZW50cy5zZWN1cmUgPyAnd3NzJyA6ICd3cyc7XG4gICAgICAgICAgICB3c0NvbXBvbmVudHMuc2VjdXJlID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIC8vcmVjb25zdHJ1Y3QgcGF0aCBmcm9tIHJlc291cmNlIG5hbWVcbiAgICAgICAgaWYgKHdzQ29tcG9uZW50cy5yZXNvdXJjZU5hbWUpIHtcbiAgICAgICAgICAgIHZhciBfd3NDb21wb25lbnRzJHJlc291cmMgPSB3c0NvbXBvbmVudHMucmVzb3VyY2VOYW1lLnNwbGl0KCc/JyksXG4gICAgICAgICAgICAgICAgX3dzQ29tcG9uZW50cyRyZXNvdXJjMiA9IHNsaWNlZFRvQXJyYXkoX3dzQ29tcG9uZW50cyRyZXNvdXJjLCAyKSxcbiAgICAgICAgICAgICAgICBwYXRoID0gX3dzQ29tcG9uZW50cyRyZXNvdXJjMlswXSxcbiAgICAgICAgICAgICAgICBxdWVyeSA9IF93c0NvbXBvbmVudHMkcmVzb3VyYzJbMV07XG5cbiAgICAgICAgICAgIHdzQ29tcG9uZW50cy5wYXRoID0gcGF0aCAmJiBwYXRoICE9PSAnLycgPyBwYXRoIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgd3NDb21wb25lbnRzLnF1ZXJ5ID0gcXVlcnk7XG4gICAgICAgICAgICB3c0NvbXBvbmVudHMucmVzb3VyY2VOYW1lID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIC8vZm9yYmlkIGZyYWdtZW50IGNvbXBvbmVudFxuICAgICAgICB3c0NvbXBvbmVudHMuZnJhZ21lbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiB3c0NvbXBvbmVudHM7XG4gICAgfVxufTtcblxudmFyIGhhbmRsZXIkMyA9IHtcbiAgICBzY2hlbWU6IFwid3NzXCIsXG4gICAgZG9tYWluSG9zdDogaGFuZGxlciQyLmRvbWFpbkhvc3QsXG4gICAgcGFyc2U6IGhhbmRsZXIkMi5wYXJzZSxcbiAgICBzZXJpYWxpemU6IGhhbmRsZXIkMi5zZXJpYWxpemVcbn07XG5cbnZhciBPID0ge307XG52YXIgaXNJUkkgPSB0cnVlO1xuLy9SRkMgMzk4NlxudmFyIFVOUkVTRVJWRUQkJCA9IFwiW0EtWmEtejAtOVxcXFwtXFxcXC5cXFxcX1xcXFx+XCIgKyAoaXNJUkkgPyBcIlxcXFx4QTAtXFxcXHUyMDBEXFxcXHUyMDEwLVxcXFx1MjAyOVxcXFx1MjAyRi1cXFxcdUQ3RkZcXFxcdUY5MDAtXFxcXHVGRENGXFxcXHVGREYwLVxcXFx1RkZFRlwiIDogXCJcIikgKyBcIl1cIjtcbnZhciBIRVhESUckJCA9IFwiWzAtOUEtRmEtZl1cIjsgLy9jYXNlLWluc2Vuc2l0aXZlXG52YXIgUENUX0VOQ09ERUQkID0gc3ViZXhwKHN1YmV4cChcIiVbRUZlZl1cIiArIEhFWERJRyQkICsgXCIlXCIgKyBIRVhESUckJCArIEhFWERJRyQkICsgXCIlXCIgKyBIRVhESUckJCArIEhFWERJRyQkKSArIFwifFwiICsgc3ViZXhwKFwiJVs4OUEtRmEtZl1cIiArIEhFWERJRyQkICsgXCIlXCIgKyBIRVhESUckJCArIEhFWERJRyQkKSArIFwifFwiICsgc3ViZXhwKFwiJVwiICsgSEVYRElHJCQgKyBIRVhESUckJCkpOyAvL2V4cGFuZGVkXG4vL1JGQyA1MzIyLCBleGNlcHQgdGhlc2Ugc3ltYm9scyBhcyBwZXIgUkZDIDYwNjg6IEAgOiAvID8gIyBbIF0gJiA7ID1cbi8vY29uc3QgQVRFWFQkJCA9IFwiW0EtWmEtejAtOVxcXFwhXFxcXCNcXFxcJFxcXFwlXFxcXCZcXFxcJ1xcXFwqXFxcXCtcXFxcLVxcXFwvXFxcXD1cXFxcP1xcXFxeXFxcXF9cXFxcYFxcXFx7XFxcXHxcXFxcfVxcXFx+XVwiO1xuLy9jb25zdCBXU1AkJCA9IFwiW1xcXFx4MjBcXFxceDA5XVwiO1xuLy9jb25zdCBPQlNfUVRFWFQkJCA9IFwiW1xcXFx4MDEtXFxcXHgwOFxcXFx4MEJcXFxceDBDXFxcXHgwRS1cXFxceDFGXFxcXHg3Rl1cIjsgIC8vKCVkMS04IC8gJWQxMS0xMiAvICVkMTQtMzEgLyAlZDEyNylcbi8vY29uc3QgUVRFWFQkJCA9IG1lcmdlKFwiW1xcXFx4MjFcXFxceDIzLVxcXFx4NUJcXFxceDVELVxcXFx4N0VdXCIsIE9CU19RVEVYVCQkKTsgIC8vJWQzMyAvICVkMzUtOTEgLyAlZDkzLTEyNiAvIG9icy1xdGV4dFxuLy9jb25zdCBWQ0hBUiQkID0gXCJbXFxcXHgyMS1cXFxceDdFXVwiO1xuLy9jb25zdCBXU1AkJCA9IFwiW1xcXFx4MjBcXFxceDA5XVwiO1xuLy9jb25zdCBPQlNfUVAkID0gc3ViZXhwKFwiXFxcXFxcXFxcIiArIG1lcmdlKFwiW1xcXFx4MDBcXFxceDBEXFxcXHgwQV1cIiwgT0JTX1FURVhUJCQpKTsgIC8vJWQwIC8gQ1IgLyBMRiAvIG9icy1xdGV4dFxuLy9jb25zdCBGV1MkID0gc3ViZXhwKHN1YmV4cChXU1AkJCArIFwiKlwiICsgXCJcXFxceDBEXFxcXHgwQVwiKSArIFwiP1wiICsgV1NQJCQgKyBcIitcIik7XG4vL2NvbnN0IFFVT1RFRF9QQUlSJCA9IHN1YmV4cChzdWJleHAoXCJcXFxcXFxcXFwiICsgc3ViZXhwKFZDSEFSJCQgKyBcInxcIiArIFdTUCQkKSkgKyBcInxcIiArIE9CU19RUCQpO1xuLy9jb25zdCBRVU9URURfU1RSSU5HJCA9IHN1YmV4cCgnXFxcXFwiJyArIHN1YmV4cChGV1MkICsgXCI/XCIgKyBRQ09OVEVOVCQpICsgXCIqXCIgKyBGV1MkICsgXCI/XCIgKyAnXFxcXFwiJyk7XG52YXIgQVRFWFQkJCA9IFwiW0EtWmEtejAtOVxcXFwhXFxcXCRcXFxcJVxcXFwnXFxcXCpcXFxcK1xcXFwtXFxcXF5cXFxcX1xcXFxgXFxcXHtcXFxcfFxcXFx9XFxcXH5dXCI7XG52YXIgUVRFWFQkJCA9IFwiW1xcXFwhXFxcXCRcXFxcJVxcXFwnXFxcXChcXFxcKVxcXFwqXFxcXCtcXFxcLFxcXFwtXFxcXC4wLTlcXFxcPFxcXFw+QS1aXFxcXHg1RS1cXFxceDdFXVwiO1xudmFyIFZDSEFSJCQgPSBtZXJnZShRVEVYVCQkLCBcIltcXFxcXFxcIlxcXFxcXFxcXVwiKTtcbnZhciBTT01FX0RFTElNUyQkID0gXCJbXFxcXCFcXFxcJFxcXFwnXFxcXChcXFxcKVxcXFwqXFxcXCtcXFxcLFxcXFw7XFxcXDpcXFxcQF1cIjtcbnZhciBVTlJFU0VSVkVEID0gbmV3IFJlZ0V4cChVTlJFU0VSVkVEJCQsIFwiZ1wiKTtcbnZhciBQQ1RfRU5DT0RFRCA9IG5ldyBSZWdFeHAoUENUX0VOQ09ERUQkLCBcImdcIik7XG52YXIgTk9UX0xPQ0FMX1BBUlQgPSBuZXcgUmVnRXhwKG1lcmdlKFwiW15dXCIsIEFURVhUJCQsIFwiW1xcXFwuXVwiLCAnW1xcXFxcIl0nLCBWQ0hBUiQkKSwgXCJnXCIpO1xudmFyIE5PVF9IRk5BTUUgPSBuZXcgUmVnRXhwKG1lcmdlKFwiW15dXCIsIFVOUkVTRVJWRUQkJCwgU09NRV9ERUxJTVMkJCksIFwiZ1wiKTtcbnZhciBOT1RfSEZWQUxVRSA9IE5PVF9IRk5BTUU7XG5mdW5jdGlvbiBkZWNvZGVVbnJlc2VydmVkKHN0cikge1xuICAgIHZhciBkZWNTdHIgPSBwY3REZWNDaGFycyhzdHIpO1xuICAgIHJldHVybiAhZGVjU3RyLm1hdGNoKFVOUkVTRVJWRUQpID8gc3RyIDogZGVjU3RyO1xufVxudmFyIGhhbmRsZXIkNCA9IHtcbiAgICBzY2hlbWU6IFwibWFpbHRvXCIsXG4gICAgcGFyc2U6IGZ1bmN0aW9uIHBhcnNlJCQxKGNvbXBvbmVudHMsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIG1haWx0b0NvbXBvbmVudHMgPSBjb21wb25lbnRzO1xuICAgICAgICB2YXIgdG8gPSBtYWlsdG9Db21wb25lbnRzLnRvID0gbWFpbHRvQ29tcG9uZW50cy5wYXRoID8gbWFpbHRvQ29tcG9uZW50cy5wYXRoLnNwbGl0KFwiLFwiKSA6IFtdO1xuICAgICAgICBtYWlsdG9Db21wb25lbnRzLnBhdGggPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChtYWlsdG9Db21wb25lbnRzLnF1ZXJ5KSB7XG4gICAgICAgICAgICB2YXIgdW5rbm93bkhlYWRlcnMgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBoZWFkZXJzID0ge307XG4gICAgICAgICAgICB2YXIgaGZpZWxkcyA9IG1haWx0b0NvbXBvbmVudHMucXVlcnkuc3BsaXQoXCImXCIpO1xuICAgICAgICAgICAgZm9yICh2YXIgeCA9IDAsIHhsID0gaGZpZWxkcy5sZW5ndGg7IHggPCB4bDsgKyt4KSB7XG4gICAgICAgICAgICAgICAgdmFyIGhmaWVsZCA9IGhmaWVsZHNbeF0uc3BsaXQoXCI9XCIpO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoaGZpZWxkWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ0b1wiOlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRvQWRkcnMgPSBoZmllbGRbMV0uc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgX3ggPSAwLCBfeGwgPSB0b0FkZHJzLmxlbmd0aDsgX3ggPCBfeGw7ICsrX3gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0by5wdXNoKHRvQWRkcnNbX3hdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3ViamVjdFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbHRvQ29tcG9uZW50cy5zdWJqZWN0ID0gdW5lc2NhcGVDb21wb25lbnQoaGZpZWxkWzFdLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiYm9keVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbHRvQ29tcG9uZW50cy5ib2R5ID0gdW5lc2NhcGVDb21wb25lbnQoaGZpZWxkWzFdLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdW5rbm93bkhlYWRlcnMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyc1t1bmVzY2FwZUNvbXBvbmVudChoZmllbGRbMF0sIG9wdGlvbnMpXSA9IHVuZXNjYXBlQ29tcG9uZW50KGhmaWVsZFsxXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodW5rbm93bkhlYWRlcnMpIG1haWx0b0NvbXBvbmVudHMuaGVhZGVycyA9IGhlYWRlcnM7XG4gICAgICAgIH1cbiAgICAgICAgbWFpbHRvQ29tcG9uZW50cy5xdWVyeSA9IHVuZGVmaW5lZDtcbiAgICAgICAgZm9yICh2YXIgX3gyID0gMCwgX3hsMiA9IHRvLmxlbmd0aDsgX3gyIDwgX3hsMjsgKytfeDIpIHtcbiAgICAgICAgICAgIHZhciBhZGRyID0gdG9bX3gyXS5zcGxpdChcIkBcIik7XG4gICAgICAgICAgICBhZGRyWzBdID0gdW5lc2NhcGVDb21wb25lbnQoYWRkclswXSk7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMudW5pY29kZVN1cHBvcnQpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnZlcnQgVW5pY29kZSBJRE4gLT4gQVNDSUkgSUROXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgYWRkclsxXSA9IHB1bnljb2RlLnRvQVNDSUkodW5lc2NhcGVDb21wb25lbnQoYWRkclsxXSwgb3B0aW9ucykudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBtYWlsdG9Db21wb25lbnRzLmVycm9yID0gbWFpbHRvQ29tcG9uZW50cy5lcnJvciB8fCBcIkVtYWlsIGFkZHJlc3MncyBkb21haW4gbmFtZSBjYW4gbm90IGJlIGNvbnZlcnRlZCB0byBBU0NJSSB2aWEgcHVueWNvZGU6IFwiICsgZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFkZHJbMV0gPSB1bmVzY2FwZUNvbXBvbmVudChhZGRyWzFdLCBvcHRpb25zKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdG9bX3gyXSA9IGFkZHIuam9pbihcIkBcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1haWx0b0NvbXBvbmVudHM7XG4gICAgfSxcbiAgICBzZXJpYWxpemU6IGZ1bmN0aW9uIHNlcmlhbGl6ZSQkMShtYWlsdG9Db21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBjb21wb25lbnRzID0gbWFpbHRvQ29tcG9uZW50cztcbiAgICAgICAgdmFyIHRvID0gdG9BcnJheShtYWlsdG9Db21wb25lbnRzLnRvKTtcbiAgICAgICAgaWYgKHRvKSB7XG4gICAgICAgICAgICBmb3IgKHZhciB4ID0gMCwgeGwgPSB0by5sZW5ndGg7IHggPCB4bDsgKyt4KSB7XG4gICAgICAgICAgICAgICAgdmFyIHRvQWRkciA9IFN0cmluZyh0b1t4XSk7XG4gICAgICAgICAgICAgICAgdmFyIGF0SWR4ID0gdG9BZGRyLmxhc3RJbmRleE9mKFwiQFwiKTtcbiAgICAgICAgICAgICAgICB2YXIgbG9jYWxQYXJ0ID0gdG9BZGRyLnNsaWNlKDAsIGF0SWR4KS5yZXBsYWNlKFBDVF9FTkNPREVELCBkZWNvZGVVbnJlc2VydmVkKS5yZXBsYWNlKFBDVF9FTkNPREVELCB0b1VwcGVyQ2FzZSkucmVwbGFjZShOT1RfTE9DQUxfUEFSVCwgcGN0RW5jQ2hhcik7XG4gICAgICAgICAgICAgICAgdmFyIGRvbWFpbiA9IHRvQWRkci5zbGljZShhdElkeCArIDEpO1xuICAgICAgICAgICAgICAgIC8vY29udmVydCBJRE4gdmlhIHB1bnljb2RlXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgZG9tYWluID0gIW9wdGlvbnMuaXJpID8gcHVueWNvZGUudG9BU0NJSSh1bmVzY2FwZUNvbXBvbmVudChkb21haW4sIG9wdGlvbnMpLnRvTG93ZXJDYXNlKCkpIDogcHVueWNvZGUudG9Vbmljb2RlKGRvbWFpbik7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzLmVycm9yID0gY29tcG9uZW50cy5lcnJvciB8fCBcIkVtYWlsIGFkZHJlc3MncyBkb21haW4gbmFtZSBjYW4gbm90IGJlIGNvbnZlcnRlZCB0byBcIiArICghb3B0aW9ucy5pcmkgPyBcIkFTQ0lJXCIgOiBcIlVuaWNvZGVcIikgKyBcIiB2aWEgcHVueWNvZGU6IFwiICsgZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdG9beF0gPSBsb2NhbFBhcnQgKyBcIkBcIiArIGRvbWFpbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbXBvbmVudHMucGF0aCA9IHRvLmpvaW4oXCIsXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBoZWFkZXJzID0gbWFpbHRvQ29tcG9uZW50cy5oZWFkZXJzID0gbWFpbHRvQ29tcG9uZW50cy5oZWFkZXJzIHx8IHt9O1xuICAgICAgICBpZiAobWFpbHRvQ29tcG9uZW50cy5zdWJqZWN0KSBoZWFkZXJzW1wic3ViamVjdFwiXSA9IG1haWx0b0NvbXBvbmVudHMuc3ViamVjdDtcbiAgICAgICAgaWYgKG1haWx0b0NvbXBvbmVudHMuYm9keSkgaGVhZGVyc1tcImJvZHlcIl0gPSBtYWlsdG9Db21wb25lbnRzLmJvZHk7XG4gICAgICAgIHZhciBmaWVsZHMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgbmFtZSBpbiBoZWFkZXJzKSB7XG4gICAgICAgICAgICBpZiAoaGVhZGVyc1tuYW1lXSAhPT0gT1tuYW1lXSkge1xuICAgICAgICAgICAgICAgIGZpZWxkcy5wdXNoKG5hbWUucmVwbGFjZShQQ1RfRU5DT0RFRCwgZGVjb2RlVW5yZXNlcnZlZCkucmVwbGFjZShQQ1RfRU5DT0RFRCwgdG9VcHBlckNhc2UpLnJlcGxhY2UoTk9UX0hGTkFNRSwgcGN0RW5jQ2hhcikgKyBcIj1cIiArIGhlYWRlcnNbbmFtZV0ucmVwbGFjZShQQ1RfRU5DT0RFRCwgZGVjb2RlVW5yZXNlcnZlZCkucmVwbGFjZShQQ1RfRU5DT0RFRCwgdG9VcHBlckNhc2UpLnJlcGxhY2UoTk9UX0hGVkFMVUUsIHBjdEVuY0NoYXIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZmllbGRzLmxlbmd0aCkge1xuICAgICAgICAgICAgY29tcG9uZW50cy5xdWVyeSA9IGZpZWxkcy5qb2luKFwiJlwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29tcG9uZW50cztcbiAgICB9XG59O1xuXG52YXIgVVJOX1BBUlNFID0gL14oW15cXDpdKylcXDooLiopLztcbi8vUkZDIDIxNDFcbnZhciBoYW5kbGVyJDUgPSB7XG4gICAgc2NoZW1lOiBcInVyblwiLFxuICAgIHBhcnNlOiBmdW5jdGlvbiBwYXJzZSQkMShjb21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBtYXRjaGVzID0gY29tcG9uZW50cy5wYXRoICYmIGNvbXBvbmVudHMucGF0aC5tYXRjaChVUk5fUEFSU0UpO1xuICAgICAgICB2YXIgdXJuQ29tcG9uZW50cyA9IGNvbXBvbmVudHM7XG4gICAgICAgIGlmIChtYXRjaGVzKSB7XG4gICAgICAgICAgICB2YXIgc2NoZW1lID0gb3B0aW9ucy5zY2hlbWUgfHwgdXJuQ29tcG9uZW50cy5zY2hlbWUgfHwgXCJ1cm5cIjtcbiAgICAgICAgICAgIHZhciBuaWQgPSBtYXRjaGVzWzFdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB2YXIgbnNzID0gbWF0Y2hlc1syXTtcbiAgICAgICAgICAgIHZhciB1cm5TY2hlbWUgPSBzY2hlbWUgKyBcIjpcIiArIChvcHRpb25zLm5pZCB8fCBuaWQpO1xuICAgICAgICAgICAgdmFyIHNjaGVtZUhhbmRsZXIgPSBTQ0hFTUVTW3VyblNjaGVtZV07XG4gICAgICAgICAgICB1cm5Db21wb25lbnRzLm5pZCA9IG5pZDtcbiAgICAgICAgICAgIHVybkNvbXBvbmVudHMubnNzID0gbnNzO1xuICAgICAgICAgICAgdXJuQ29tcG9uZW50cy5wYXRoID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKHNjaGVtZUhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICB1cm5Db21wb25lbnRzID0gc2NoZW1lSGFuZGxlci5wYXJzZSh1cm5Db21wb25lbnRzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHVybkNvbXBvbmVudHMuZXJyb3IgPSB1cm5Db21wb25lbnRzLmVycm9yIHx8IFwiVVJOIGNhbiBub3QgYmUgcGFyc2VkLlwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cm5Db21wb25lbnRzO1xuICAgIH0sXG4gICAgc2VyaWFsaXplOiBmdW5jdGlvbiBzZXJpYWxpemUkJDEodXJuQ29tcG9uZW50cywgb3B0aW9ucykge1xuICAgICAgICB2YXIgc2NoZW1lID0gb3B0aW9ucy5zY2hlbWUgfHwgdXJuQ29tcG9uZW50cy5zY2hlbWUgfHwgXCJ1cm5cIjtcbiAgICAgICAgdmFyIG5pZCA9IHVybkNvbXBvbmVudHMubmlkO1xuICAgICAgICB2YXIgdXJuU2NoZW1lID0gc2NoZW1lICsgXCI6XCIgKyAob3B0aW9ucy5uaWQgfHwgbmlkKTtcbiAgICAgICAgdmFyIHNjaGVtZUhhbmRsZXIgPSBTQ0hFTUVTW3VyblNjaGVtZV07XG4gICAgICAgIGlmIChzY2hlbWVIYW5kbGVyKSB7XG4gICAgICAgICAgICB1cm5Db21wb25lbnRzID0gc2NoZW1lSGFuZGxlci5zZXJpYWxpemUodXJuQ29tcG9uZW50cywgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHVyaUNvbXBvbmVudHMgPSB1cm5Db21wb25lbnRzO1xuICAgICAgICB2YXIgbnNzID0gdXJuQ29tcG9uZW50cy5uc3M7XG4gICAgICAgIHVyaUNvbXBvbmVudHMucGF0aCA9IChuaWQgfHwgb3B0aW9ucy5uaWQpICsgXCI6XCIgKyBuc3M7XG4gICAgICAgIHJldHVybiB1cmlDb21wb25lbnRzO1xuICAgIH1cbn07XG5cbnZhciBVVUlEID0gL15bMC05QS1GYS1mXXs4fSg/OlxcLVswLTlBLUZhLWZdezR9KXszfVxcLVswLTlBLUZhLWZdezEyfSQvO1xuLy9SRkMgNDEyMlxudmFyIGhhbmRsZXIkNiA9IHtcbiAgICBzY2hlbWU6IFwidXJuOnV1aWRcIixcbiAgICBwYXJzZTogZnVuY3Rpb24gcGFyc2UodXJuQ29tcG9uZW50cywgb3B0aW9ucykge1xuICAgICAgICB2YXIgdXVpZENvbXBvbmVudHMgPSB1cm5Db21wb25lbnRzO1xuICAgICAgICB1dWlkQ29tcG9uZW50cy51dWlkID0gdXVpZENvbXBvbmVudHMubnNzO1xuICAgICAgICB1dWlkQ29tcG9uZW50cy5uc3MgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmICghb3B0aW9ucy50b2xlcmFudCAmJiAoIXV1aWRDb21wb25lbnRzLnV1aWQgfHwgIXV1aWRDb21wb25lbnRzLnV1aWQubWF0Y2goVVVJRCkpKSB7XG4gICAgICAgICAgICB1dWlkQ29tcG9uZW50cy5lcnJvciA9IHV1aWRDb21wb25lbnRzLmVycm9yIHx8IFwiVVVJRCBpcyBub3QgdmFsaWQuXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHV1aWRDb21wb25lbnRzO1xuICAgIH0sXG4gICAgc2VyaWFsaXplOiBmdW5jdGlvbiBzZXJpYWxpemUodXVpZENvbXBvbmVudHMsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHVybkNvbXBvbmVudHMgPSB1dWlkQ29tcG9uZW50cztcbiAgICAgICAgLy9ub3JtYWxpemUgVVVJRFxuICAgICAgICB1cm5Db21wb25lbnRzLm5zcyA9ICh1dWlkQ29tcG9uZW50cy51dWlkIHx8IFwiXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHJldHVybiB1cm5Db21wb25lbnRzO1xuICAgIH1cbn07XG5cblNDSEVNRVNbaGFuZGxlci5zY2hlbWVdID0gaGFuZGxlcjtcblNDSEVNRVNbaGFuZGxlciQxLnNjaGVtZV0gPSBoYW5kbGVyJDE7XG5TQ0hFTUVTW2hhbmRsZXIkMi5zY2hlbWVdID0gaGFuZGxlciQyO1xuU0NIRU1FU1toYW5kbGVyJDMuc2NoZW1lXSA9IGhhbmRsZXIkMztcblNDSEVNRVNbaGFuZGxlciQ0LnNjaGVtZV0gPSBoYW5kbGVyJDQ7XG5TQ0hFTUVTW2hhbmRsZXIkNS5zY2hlbWVdID0gaGFuZGxlciQ1O1xuU0NIRU1FU1toYW5kbGVyJDYuc2NoZW1lXSA9IGhhbmRsZXIkNjtcblxuZXhwb3J0cy5TQ0hFTUVTID0gU0NIRU1FUztcbmV4cG9ydHMucGN0RW5jQ2hhciA9IHBjdEVuY0NoYXI7XG5leHBvcnRzLnBjdERlY0NoYXJzID0gcGN0RGVjQ2hhcnM7XG5leHBvcnRzLnBhcnNlID0gcGFyc2U7XG5leHBvcnRzLnJlbW92ZURvdFNlZ21lbnRzID0gcmVtb3ZlRG90U2VnbWVudHM7XG5leHBvcnRzLnNlcmlhbGl6ZSA9IHNlcmlhbGl6ZTtcbmV4cG9ydHMucmVzb2x2ZUNvbXBvbmVudHMgPSByZXNvbHZlQ29tcG9uZW50cztcbmV4cG9ydHMucmVzb2x2ZSA9IHJlc29sdmU7XG5leHBvcnRzLm5vcm1hbGl6ZSA9IG5vcm1hbGl6ZTtcbmV4cG9ydHMuZXF1YWwgPSBlcXVhbDtcbmV4cG9ydHMuZXNjYXBlQ29tcG9uZW50ID0gZXNjYXBlQ29tcG9uZW50O1xuZXhwb3J0cy51bmVzY2FwZUNvbXBvbmVudCA9IHVuZXNjYXBlQ29tcG9uZW50O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuXG59KSkpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dXJpLmFsbC5qcy5tYXBcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJwQkd2QXBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvdXJpLWpzL2Rpc3QvZXM1L3VyaS5hbGwuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvdXJpLWpzL2Rpc3QvZXM1XCIpIl19
