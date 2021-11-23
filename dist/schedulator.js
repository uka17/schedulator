(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
},{}],2:[function(require,module,exports){
window.schedule = require('../lib/schedule');
},{"../lib/schedule":3}],3:[function(require,module,exports){
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
},{"./models.json":1,"./tools":4,"ajv":5}],4:[function(require,module,exports){
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
},{"ajv":5}],5:[function(require,module,exports){
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

},{"./cache":6,"./compile":10,"./compile/async":7,"./compile/error_classes":8,"./compile/formats":9,"./compile/resolve":11,"./compile/rules":12,"./compile/schema_obj":13,"./compile/util":15,"./data":16,"./keyword":44,"./refs/data.json":45,"./refs/json-schema-draft-07.json":46,"fast-json-stable-stringify":48}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{"./error_classes":8}],8:[function(require,module,exports){
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

},{"./resolve":11}],9:[function(require,module,exports){
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

},{"./util":15}],10:[function(require,module,exports){
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

},{"../dotjs/validate":43,"./error_classes":8,"./resolve":11,"./util":15,"fast-deep-equal":47,"fast-json-stable-stringify":48}],11:[function(require,module,exports){
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

},{"./schema_obj":13,"./util":15,"fast-deep-equal":47,"json-schema-traverse":49,"uri-js":50}],12:[function(require,module,exports){
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

},{"../dotjs":32,"./util":15}],13:[function(require,module,exports){
'use strict';

var util = require('./util');

module.exports = SchemaObject;

function SchemaObject(obj) {
  util.copy(obj, this);
}

},{"./util":15}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

},{"./ucs2length":14,"fast-deep-equal":47}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{"./refs/json-schema-draft-07.json":46}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
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

},{}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
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

},{}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
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

},{}],29:[function(require,module,exports){
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

},{}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
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

},{}],32:[function(require,module,exports){
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

},{"./_limit":18,"./_limitItems":19,"./_limitLength":20,"./_limitProperties":21,"./allOf":22,"./anyOf":23,"./comment":24,"./const":25,"./contains":26,"./dependencies":28,"./enum":29,"./format":30,"./if":31,"./items":33,"./multipleOf":34,"./not":35,"./oneOf":36,"./pattern":37,"./properties":38,"./propertyNames":39,"./ref":40,"./required":41,"./uniqueItems":42,"./validate":43}],33:[function(require,module,exports){
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

},{}],34:[function(require,module,exports){
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

},{}],35:[function(require,module,exports){
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

},{}],36:[function(require,module,exports){
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

},{}],37:[function(require,module,exports){
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

},{}],38:[function(require,module,exports){
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

},{}],39:[function(require,module,exports){
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

},{}],40:[function(require,module,exports){
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

},{}],41:[function(require,module,exports){
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

},{}],42:[function(require,module,exports){
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

},{}],43:[function(require,module,exports){
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

},{}],44:[function(require,module,exports){
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

},{"./definition_schema":17,"./dotjs/custom":27}],45:[function(require,module,exports){
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

},{}],48:[function(require,module,exports){
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

},{}],49:[function(require,module,exports){
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

},{}],50:[function(require,module,exports){
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


},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvbW9kZWxzLmpzb24iLCJsaWIvc2NoZWR1bGF0b3IuanMiLCJsaWIvc2NoZWR1bGUuanMiLCJsaWIvdG9vbHMuanMiLCJub2RlX21vZHVsZXMvYWp2L2xpYi9hanYuanMiLCJub2RlX21vZHVsZXMvYWp2L2xpYi9jYWNoZS5qcyIsIm5vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvYXN5bmMuanMiLCJub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL2Vycm9yX2NsYXNzZXMuanMiLCJub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL2Zvcm1hdHMuanMiLCJub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS9yZXNvbHZlLmpzIiwibm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS9ydWxlcy5qcyIsIm5vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvc2NoZW1hX29iai5qcyIsIm5vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvdWNzMmxlbmd0aC5qcyIsIm5vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvdXRpbC5qcyIsIm5vZGVfbW9kdWxlcy9hanYvbGliL2RhdGEuanMiLCJub2RlX21vZHVsZXMvYWp2L2xpYi9kZWZpbml0aW9uX3NjaGVtYS5qcyIsIm5vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL19saW1pdC5qcyIsIm5vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL19saW1pdEl0ZW1zLmpzIiwibm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvX2xpbWl0TGVuZ3RoLmpzIiwibm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvX2xpbWl0UHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2FsbE9mLmpzIiwibm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvYW55T2YuanMiLCJub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9jb21tZW50LmpzIiwibm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvY29uc3QuanMiLCJub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9jb250YWlucy5qcyIsIm5vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2N1c3RvbS5qcyIsIm5vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2RlcGVuZGVuY2llcy5qcyIsIm5vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2VudW0uanMiLCJub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9mb3JtYXQuanMiLCJub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9pZi5qcyIsIm5vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvaXRlbXMuanMiLCJub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9tdWx0aXBsZU9mLmpzIiwibm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvbm90LmpzIiwibm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvb25lT2YuanMiLCJub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9wYXR0ZXJuLmpzIiwibm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvcHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL3Byb3BlcnR5TmFtZXMuanMiLCJub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9yZWYuanMiLCJub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9yZXF1aXJlZC5qcyIsIm5vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL3VuaXF1ZUl0ZW1zLmpzIiwibm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvdmFsaWRhdGUuanMiLCJub2RlX21vZHVsZXMvYWp2L2xpYi9rZXl3b3JkLmpzIiwibm9kZV9tb2R1bGVzL2Fqdi9saWIvcmVmcy9kYXRhLmpzb24iLCJub2RlX21vZHVsZXMvYWp2L2xpYi9yZWZzL2pzb24tc2NoZW1hLWRyYWZ0LTA3Lmpzb24iLCJub2RlX21vZHVsZXMvZmFzdC1kZWVwLWVxdWFsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Zhc3QtanNvbi1zdGFibGUtc3RyaW5naWZ5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2pzb24tc2NoZW1hLXRyYXZlcnNlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3VyaS1qcy9kaXN0L2VzNS91cmkuYWxsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25ZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9PQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJtb2R1bGUuZXhwb3J0cz17XG4gICAgXCJzY2hlZHVsZVNjaGVtYVwiOiB7XG4gICAgICAgIFwiJGlkXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3NjaGVkdWxlXCIsXG4gICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1wiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvb25lVGltZVwifSxcbiAgICAgICAgICAgIHtcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL2RhaWx5XCJ9LFxuICAgICAgICAgICAge1wiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvd2Vla2x5XCJ9LFxuICAgICAgICAgICAge1wiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvbW9udGhseVwifVxuICAgICAgICBdLFxuICAgICAgICBcImRlZmluaXRpb25zXCI6IHtcbiAgICAgICAgICAgIFwib25lVGltZVwiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IHtcInR5cGVcIjogXCJzdHJpbmdcIn0sXG4gICAgICAgICAgICAgICAgICAgIFwiZW5hYmxlZFwiOiB7XCJ0eXBlXCI6IFwiYm9vbGVhblwifSxcbiAgICAgICAgICAgICAgICAgICAgXCJvbmVUaW1lXCI6IHtcInR5cGVcIjogXCJzdHJpbmdcIiwgXCJmb3JtYXRcIjogXCJkYXRlLXRpbWVcIn1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFwiYWRkaXRpb25hbFByb3BlcnRpZXNcIjogZmFsc2UsXG4gICAgICAgICAgICAgICAgXCJyZXF1aXJlZFwiOiBbXCJvbmVUaW1lXCJdICBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImRhaWx5XCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgICAgICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjoge1widHlwZVwiOiBcInN0cmluZ1wifSxcbiAgICAgICAgICAgICAgICAgICAgXCJlbmFibGVkXCI6IHtcInR5cGVcIjogXCJib29sZWFuXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcInN0YXJ0RGF0ZVRpbWVcIjoge1widHlwZVwiOiBcInN0cmluZ1wiLCBcImZvcm1hdFwiOiBcImRhdGUtdGltZVwifSxcbiAgICAgICAgICAgICAgICAgICAgXCJlbmREYXRlVGltZVwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCIsIFwiZm9ybWF0XCI6IFwiZGF0ZS10aW1lXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcImVhY2hORGF5XCI6IHtcInR5cGVcIjogXCJpbnRlZ2VyXCIsIFwibWluaW11bVwiOiAxfSxcbiAgICAgICAgICAgICAgICAgICAgXCJkYWlseUZyZXF1ZW5jeVwiOiB7XCIkcmVmXCI6IFwiZGFpbHkjL1wifVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXCJhZGRpdGlvbmFsUHJvcGVydGllc1wiOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBcInJlcXVpcmVkXCI6IFtcInN0YXJ0RGF0ZVRpbWVcIiwgXCJlYWNoTkRheVwiLCBcImRhaWx5RnJlcXVlbmN5XCJdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJ3ZWVrbHlcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcImVuYWJsZWRcIjoge1widHlwZVwiOiBcImJvb2xlYW5cIn0sXG4gICAgICAgICAgICAgICAgICAgIFwic3RhcnREYXRlVGltZVwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCIsIFwiZm9ybWF0XCI6IFwiZGF0ZS10aW1lXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcImVuZERhdGVUaW1lXCI6IHtcInR5cGVcIjogXCJzdHJpbmdcIiwgXCJmb3JtYXRcIjogXCJkYXRlLXRpbWVcIn0sXG4gICAgICAgICAgICAgICAgICAgIFwiZWFjaE5XZWVrXCI6IHtcInR5cGVcIjogXCJpbnRlZ2VyXCIsIFwibWluaW11bVwiOiAxfSxcbiAgICAgICAgICAgICAgICAgICAgXCJkYXlPZldlZWtcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSXRlbXNcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiaXRlbXNcIjogeyBcImVudW1cIjogW1wic3VuXCIsIFwibW9uXCIsIFwidHVlXCIsIFwid2VkXCIsIFwidGh1XCIsIFwiZnJpXCIsIFwic2F0XCJdIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxJdGVtc1wiOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcImRhaWx5RnJlcXVlbmN5XCI6IHtcIiRyZWZcIjogXCJkYWlseSMvXCJ9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIFwicmVxdWlyZWRcIjogW1wic3RhcnREYXRlVGltZVwiLCBcImVhY2hOV2Vla1wiLCBcImRheU9mV2Vla1wiLCBcImRhaWx5RnJlcXVlbmN5XCJdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJtb250aGx5XCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgICAgICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjoge1widHlwZVwiOiBcInN0cmluZ1wifSxcbiAgICAgICAgICAgICAgICAgICAgXCJlbmFibGVkXCI6IHtcInR5cGVcIjogXCJib29sZWFuXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcInN0YXJ0RGF0ZVRpbWVcIjoge1widHlwZVwiOiBcInN0cmluZ1wiLCBcImZvcm1hdFwiOiBcImRhdGUtdGltZVwifSxcbiAgICAgICAgICAgICAgICAgICAgXCJlbmREYXRlVGltZVwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCIsIFwiZm9ybWF0XCI6IFwiZGF0ZS10aW1lXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcIm1vbnRoXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInVuaXF1ZUl0ZW1zXCI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIml0ZW1zXCI6IHsgXCJlbnVtXCI6IFtcImphblwiLCBcImZlYlwiLCBcIm1hclwiLCBcImFwclwiLCBcIm1heVwiLCBcImp1blwiLCBcImp1bFwiLCBcImF1Z1wiLCBcInNlcFwiLCBcIm9jdFwiLCBcIm5vdlwiLCBcImRlY1wiXSB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJhZGRpdGlvbmFsSXRlbXNcIjogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJkYXlcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSXRlbXNcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiaXRlbXNcIjoge1widHlwZVwiOiBcImludGVnZXJcIiwgXCJtaW5pbXVtXCI6IDEsIFwibWF4aW11bVwiOiAzMX0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxJdGVtc1wiOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcImRhaWx5RnJlcXVlbmN5XCI6IHtcIiRyZWZcIjogXCJkYWlseSMvXCJ9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIFwicmVxdWlyZWRcIjogW1wic3RhcnREYXRlVGltZVwiLCBcIm1vbnRoXCIsIFwiZGF5XCIsIFwiZGFpbHlGcmVxdWVuY3lcIl1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbixcbiAgXCJzY2hlZHVsZVNjaGVtYURhaWx5XCI6IHtcbiAgICAgICAgXCIkaWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vZGFpbHlcIixcbiAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9vbmNlXCJ9LFxuICAgICAgICAgICAge1wiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvZXZlcnlcIn1cbiAgICAgICAgXSxcbiAgICAgICAgXCJkZWZpbml0aW9uc1wiOiB7XG4gICAgICAgICAgICBcIm9uY2VcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLCBcbiAgICAgICAgICAgICAgICBcInByb3BlcnRpZXNcIjogeyBcIm9jY3Vyc09uY2VBdFwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCIsIFwiZm9ybWF0XCI6IFwidGltZVwifX0sXG4gICAgICAgICAgICAgICAgXCJhZGRpdGlvbmFsUHJvcGVydGllc1wiOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBcInJlcXVpcmVkXCI6IFtcIm9jY3Vyc09uY2VBdFwiXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZXZlcnlcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLCBcbiAgICAgICAgICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInN0YXJ0XCI6IHtcInR5cGVcIjogXCJzdHJpbmdcIiwgXCJmb3JtYXRcIjogXCJ0aW1lXCJ9LFxuICAgICAgICAgICAgICAgICAgICBcImVuZFwiOiB7XCJ0eXBlXCI6IFwic3RyaW5nXCIsIFwiZm9ybWF0XCI6IFwidGltZVwifSxcbiAgICAgICAgICAgICAgICAgICAgXCJvY2N1cnNFdmVyeVwiOiB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHsgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJpbnRlcnZhbFZhbHVlXCI6IHtcInR5cGVcIjogXCJpbnRlZ2VyXCIsIFwibWluaW11bVwiOiAxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImludGVydmFsVHlwZVwiOiB7IFwidHlwZVwiOiBcInN0cmluZ1wiLCBcImVudW1cIjogW1wibWludXRlXCIsIFwiaG91clwiXSB9ICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJhZGRpdGlvbmFsUHJvcGVydGllc1wiOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwicmVxdWlyZWRcIjogW1wiaW50ZXJ2YWxWYWx1ZVwiLCBcImludGVydmFsVHlwZVwiXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIFwicmVxdWlyZWRcIjogW1wic3RhcnRcIiwgXCJvY2N1cnNFdmVyeVwiXVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSIsIndpbmRvdy5zY2hlZHVsZSA9IHJlcXVpcmUoJy4uL2xpYi9zY2hlZHVsZScpOyIsIi8qIGVzbGludC1kaXNhYmxlIG5vLXByb3RvdHlwZS1idWlsdGlucyAqL1xuLy9TY2hlZHVsZSBtYWluIGVuZ2luZVxubGV0IGdldERhdGVUaW1lID0gcmVxdWlyZShcIi4vdG9vbHNcIikuZ2V0RGF0ZVRpbWU7XG5sZXQgYWRkRGF0ZSA9IHJlcXVpcmUoXCIuL3Rvb2xzXCIpLmFkZERhdGU7XG5sZXQgcGFyc2VEYXRlVGltZSA9IHJlcXVpcmUoXCIuL3Rvb2xzXCIpLnBhcnNlRGF0ZVRpbWU7XG5sZXQgZm9ybWF0RGF0ZVRpbWUgPSByZXF1aXJlKFwiLi90b29sc1wiKS5mb3JtYXREYXRlVGltZTtcbmxldCBtb250aExpc3QgPSByZXF1aXJlKFwiLi90b29sc1wiKS5tb250aExpc3Q7XG5sZXQgd2Vla0RheUxpc3QgPSByZXF1aXJlKFwiLi90b29sc1wiKS53ZWVrRGF5TGlzdDtcbmxldCBzY2hlZHVsZU1vZGVsID0gcmVxdWlyZShcIi4vbW9kZWxzLmpzb25cIik7XG52YXIgQWp2ID0gcmVxdWlyZShcImFqdlwiKTtcbmxldCBhanYgPSBuZXcgQWp2KCk7XG5hanYuYWRkU2NoZW1hKHNjaGVkdWxlTW9kZWwuc2NoZWR1bGVTY2hlbWFEYWlseSk7XG5cbi8qKlxuICogQ2FsY3VsYXRlcyBuZXh0IHJ1biB0aW1lIGZvciBhbHJlYWR5IGNhbGN1bGF0ZWQgZGF5XG4gKiBAcGFyYW0ge09iamVjdH0gc2NoZWR1bGUgU2NoZWR1bGUgZm9yIHdoaWNoIG5leHQgcnVuIHRpbWUgc2hvdWxkIGJlIGNhbGN1bGF0ZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBydW5EYXRlIERheSBvZiBuZXh0IHJ1biB3aXRoIDAwOjAwIHRpbWVcbiAqIEByZXR1cm5zIHtPYmplY3R9IE5leHQgcnVuIGRhdGUgYW5kIHRpbWUgb3IgbnVsbCBpbiBjYXNlIGlmIG5leHQgcnVuIHRpbWUgaXMgb3V0IG9mIHJ1bkRhdGUgcmFuZ2UgKGUuZy4gYXR0ZW1wdCB0byBjYWxjdWxhdGUgJ2VhY2ggMTMgaG91cnMnIGF0IDE5OjAwKSBcbiAqIG9yIGFscmVhZHkgaW4gcGFzdCAoZS5nLiBhdHRlbXB0IHRvIGNhbGN1bGF0ZSAnMTE6MDAnIGF0IDExOjA1KVxuICovXG5mdW5jdGlvbiBjYWxjdWxhdGVUaW1lT2ZSdW4oc2NoZWR1bGUsIHJ1bkRhdGUpIHsgIFxuICAvL2FzIHdpdGggc2ltcGxlID0gcmVmIHdpbGwgYmUgY3JlYXRlZCB3ZSBuZWVkIHRvIGNsb25lIERhdGUgb2JqZWN0XG4gIGxldCBydW5EYXRlVGltZSA9IG5ldyBEYXRlKHJ1bkRhdGUpOyAgICBcblxuICBpZihzY2hlZHVsZS5kYWlseUZyZXF1ZW5jeS5oYXNPd25Qcm9wZXJ0eShcIm9jY3Vyc09uY2VBdFwiKSkge1xuICAgIGxldCB0aW1lID0gc2NoZWR1bGUuZGFpbHlGcmVxdWVuY3kub2NjdXJzT25jZUF0LnNwbGl0KFwiOlwiKTtcbiAgICBydW5EYXRlVGltZS5zZXRVVENIb3Vycyh0aW1lWzBdLCB0aW1lWzFdLCB0aW1lWzJdKTsgLy9pdCBzaG91bGQgcHV0IHRpbWUgaW4gVVRDLCBidXQgaXQgcHV0cyBpdCBpbiBsb2NhbCAgICAgICAgXG4gICAgaWYocnVuRGF0ZVRpbWUgPiBnZXREYXRlVGltZSgpICYmIHJ1bkRhdGVUaW1lID49IHBhcnNlRGF0ZVRpbWUoc2NoZWR1bGUuc3RhcnREYXRlVGltZSkpXG4gICAgICByZXR1cm4gcnVuRGF0ZVRpbWU7XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIG51bGw7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgfVxuXG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICAqL1xuICBpZihzY2hlZHVsZS5kYWlseUZyZXF1ZW5jeS5oYXNPd25Qcm9wZXJ0eShcIm9jY3Vyc0V2ZXJ5XCIpKSB7XG5cbiAgICBsZXQgdGltZSA9IHNjaGVkdWxlLmRhaWx5RnJlcXVlbmN5LnN0YXJ0LnNwbGl0KFwiOlwiKTtcbiAgICAvL21pbGxpc2Vjb25kcyBzaG91bGQgYmUgcmVtb3ZlZD9cbiAgICBydW5EYXRlVGltZS5zZXRVVENIb3Vycyh0aW1lWzBdLCB0aW1lWzFdLCB0aW1lWzJdLCAwKTtcbiAgICB3aGlsZShydW5EYXRlVGltZSA8IGdldERhdGVUaW1lKCkpIHtcbiAgICAgIC8vVE9ETyBuaWNlIHRvIGhhdmUgaW50ZXJ2YWwgbGlrZSAwMzozMCAoYm90aCBob3VyIGFuZCBtaW51dGVzKVxuICAgICAgc3dpdGNoKHNjaGVkdWxlLmRhaWx5RnJlcXVlbmN5Lm9jY3Vyc0V2ZXJ5LmludGVydmFsVHlwZSkge1xuICAgICAgY2FzZSBcIm1pbnV0ZVwiOlxuICAgICAgICBydW5EYXRlVGltZSA9IGFkZERhdGUocnVuRGF0ZVRpbWUsIDAsIDAsIDAsIDAsIHNjaGVkdWxlLmRhaWx5RnJlcXVlbmN5Lm9jY3Vyc0V2ZXJ5LmludGVydmFsVmFsdWUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJob3VyXCI6XG4gICAgICAgIHJ1bkRhdGVUaW1lID0gYWRkRGF0ZShydW5EYXRlVGltZSwgMCwgMCwgMCwgc2NoZWR1bGUuZGFpbHlGcmVxdWVuY3kub2NjdXJzRXZlcnkuaW50ZXJ2YWxWYWx1ZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmKHNjaGVkdWxlLmRhaWx5RnJlcXVlbmN5Lmhhc093blByb3BlcnR5KFwiZW5kXCIpKSB7XG4gICAgICBsZXQgc3RhcnRUaW1lID0gc2NoZWR1bGUuZGFpbHlGcmVxdWVuY3kuc3RhcnQuc3BsaXQoXCI6XCIpO1xuICAgICAgbGV0IGVuZFRpbWUgPSBzY2hlZHVsZS5kYWlseUZyZXF1ZW5jeS5lbmQuc3BsaXQoXCI6XCIpO1xuICAgICAgbGV0IGRhaWx5U3RhcnREYXRlVGltZSA9IGFkZERhdGUocnVuRGF0ZSwgMCwgMCwgMCwgc3RhcnRUaW1lWzBdLCBzdGFydFRpbWVbMV0sIHN0YXJ0VGltZVsyXSwgMCk7XG4gICAgICBsZXQgZGFpbHlFbmREYXRlVGltZSA9IGFkZERhdGUocnVuRGF0ZSwgMCwgMCwgMCwgZW5kVGltZVswXSwgZW5kVGltZVsxXSwgZW5kVGltZVsyXSwgMCk7XG4gICAgICAgICAgICBcbiAgICAgIC8vZGFpbHkgc2NoZWR1bGUgc3RhcnQgdGltZSBpcyBsYXRlIG9yIHNhbWUgYXMgZW5kIHRpbWUgT1IgY2FsY3VsYXRlZCB0aW1lIG9mIHJ1biBpcyBsYXRlciB0aGFuIGRhaWx5IHNjaGVkdWxlIGVuZCB0aW1lXG4gICAgICBpZihkYWlseVN0YXJ0RGF0ZVRpbWUgPj0gZGFpbHlFbmREYXRlVGltZSB8fCBydW5EYXRlVGltZSA+PSBkYWlseUVuZERhdGVUaW1lKVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZihydW5EYXRlLmdldFVUQ0RhdGUoKSA9PSBydW5EYXRlVGltZS5nZXRVVENEYXRlKCkpICAgICAgICBcbiAgICAgIHJldHVybiBydW5EYXRlVGltZTsgICBcbiAgICBlbHNlXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgXG4gIH1cbn1cbi8qKlxuICogU2NhbnMgd2VlayB3aGljaCBzdGFydHMgd2l0aCB3ZWVrU3RhcnQgYW5kIHRyaWVzIHRvIGZpbmQgZGF0ZSBmb3IgcnVuXG4gKiBAcGFyYW0ge09iamVjdH0gc2NoZWR1bGUgU2NoZWR1bGUgZm9yIHdoaWNoIG5leHQgcnVuIHRpbWUgc2hvdWxkIGJlIGNhbGN1bGF0ZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSB3ZWVrU3RhcnQgRGF0ZSBvZiBzdW5kYXkgKDAgZGF5IG9mIHdlZWspXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBEYXRlIG9yIG5leHQgcnVuIG9yIG51bGwgaW4gY2FzZSBpZiBkYXRlIHdhcyBub3QgY2FsY3VsYXRlZFxuICovXG5mdW5jdGlvbiBjYWxjdWxhdGVXZWVrRGF5T2ZSdW4oc2NoZWR1bGUsIHdlZWtTdGFydCkge1xuICBsZXQgY3VycmVudERheSA9IHdlZWtTdGFydDtcbiAgbGV0IHdlZWtEYXlMYXN0SW5kZXggPSAwO1xuICAvL3NvcnQgbGlzdCBvZiB3ZWVrIGRheXMgaW4gY29ycmVjdCBvcmRlclxuICBzY2hlZHVsZS5kYXlPZldlZWsgPSBzY2hlZHVsZS5kYXlPZldlZWsuc29ydCgoYSwgYikgPT4gd2Vla0RheUxpc3QuaW5kZXhPZihhKSAtIHdlZWtEYXlMaXN0LmluZGV4T2YoYikpOyAgIFxuICBmb3IgKGxldCBpID0gMDsgaSA8IHNjaGVkdWxlLmRheU9mV2Vlay5sZW5ndGg7IGkrKykge1xuICAgIGxldCB3ZWVrRGF5SW5kZXggPSB3ZWVrRGF5TGlzdC5pbmRleE9mKHNjaGVkdWxlLmRheU9mV2Vla1tpXSk7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgICovXG4gICAgaWYod2Vla0RheUluZGV4ICE9IC0xKSB7XG4gICAgICBjdXJyZW50RGF5ID0gYWRkRGF0ZShjdXJyZW50RGF5LCAwLCAwLCB3ZWVrRGF5SW5kZXggLSB3ZWVrRGF5TGFzdEluZGV4KTtcbiAgICAgIHdlZWtEYXlMYXN0SW5kZXggPSB3ZWVrRGF5SW5kZXg7XG4gICAgICAvL2RheSBjYWxjdWxhdGluZyB0aW1lIGZvdW5kIC0gZG9uJ3QgZ28gbmV4dFxuICAgICAgbGV0IGNhbGN1bGF0aW9uUmVzdWx0ID0gY2FsY3VsYXRlVGltZU9mUnVuKHNjaGVkdWxlLCBjdXJyZW50RGF5KTtcbiAgICAgIGlmKGNhbGN1bGF0aW9uUmVzdWx0KSB7ICAgICAgICAgXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovICAgXG4gICAgICAgIGlmKGNhbGN1bGF0aW9uUmVzdWx0ID4gcGFyc2VEYXRlVGltZShzY2hlZHVsZS5zdGFydERhdGVUaW1lKSlcbiAgICAgICAgICByZXR1cm4gY2FsY3VsYXRpb25SZXN1bHQ7XG4gICAgICAgIGN1cnJlbnREYXkgPSBjYWxjdWxhdGlvblJlc3VsdDtcbiAgICAgIH1cbiAgICB9ICAgICAgICBcbiAgfSAgIFxuICByZXR1cm4gbnVsbDtcbn1cbi8qKlxuICogQHR5cGVkZWYge09iamVjdH0gbmV4dE9jY3VycmVuY2VSZXN1bHRcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSByZXN1bHQgQ2FsY3VsYXRpb24gcmVzdWx0LiBVVEMgZGF0ZSBhbmQgdGltZSBvZiBuZWFyZXN0IG5leHQgb2NjdXJyZW5jZSBvZiBzY2hlZHVsZU9iamVjdCBpbiBJU08gZm9ybWF0IChlLmcuIDIwMTktMDEtMDFUMDE6MDA6MDAuMDAwWilcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlIGluIGNhc2UgbmV4dCBvY2N1cnJlbmNlIGNhbGN1bGF0aW9uIGZhaWxlZFxuICovXG4vKipcbiAqIENhbGN1bGF0ZXMgbmV4dCBydW4gZGF0ZSBhbmQgdGltZSBcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY2hlZHVsZSBTY2hlZHVsZSBmb3Igd2hpY2ggbmV4dCBydW4gZGF0ZSBhbmQgdGltZSBzaG91bGQgYmUgY2FsY3VsYXRlZFxuICogQHJldHVybnMge25leHRPY2N1cnJlbmNlUmVzdWx0fSBSZXN1bHQgb2YgbmV4dCBvY2N1cnJlbmNlIGNhbGN1bGF0aW9uXG4gKi8gXG5tb2R1bGUuZXhwb3J0cy5uZXh0T2NjdXJyZW5jZSA9IChzY2hlZHVsZSkgPT4geyAgICAgXG4gIC8vY2hlY2sgaWYgc2NoZWR1bGUgaXMgYSB2YWxpZCBKU09OIG9iamVjdCAgICBcbiAgbGV0IHZhbGlkYXRlID0gYWp2LmNvbXBpbGUoc2NoZWR1bGVNb2RlbC5zY2hlZHVsZVNjaGVtYSk7XG4gIGxldCB2YWxpZCA9IHZhbGlkYXRlKHNjaGVkdWxlKTtcbiAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gIGlmKCF2YWxpZClcbiAgICByZXR1cm4ge1wicmVzdWx0XCI6IG51bGwsIFwiZXJyb3JcIjogXCJzY2hlbWEgaXMgaW5jb3JyZWN0OiBcIiArIGFqdi5lcnJvcnNUZXh0KHZhbGlkYXRlLmVycm9ycyl9O1xuXG4gIGlmKHNjaGVkdWxlLmhhc093blByb3BlcnR5KFwiZW5hYmxlZFwiKSlcbiAgICBpZighc2NoZWR1bGUuZW5hYmxlZClcbiAgICAgIHJldHVybiB7XCJyZXN1bHRcIjogbnVsbCwgXCJlcnJvclwiOiBcInNjaGVkdWxlIGlzIGRpc2FibGVkXCJ9O1xuXG4gIGxldCByZXN1bHQgPSBudWxsOyAgICAgXG4gIC8vb25lVGltZVxuICBpZihzY2hlZHVsZS5oYXNPd25Qcm9wZXJ0eShcIm9uZVRpbWVcIikpIHsgICAgICAgIFxuICAgIGxldCBvbmVUaW1lID0gc2NoZWR1bGUub25lVGltZTsgICAgICAgIFxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICAqL1xuICAgIGlmKHBhcnNlRGF0ZVRpbWUob25lVGltZSkgPiBnZXREYXRlVGltZSgpKVxuICAgICAgcmVzdWx0ID0gb25lVGltZTtcbiAgfVxuICAvL2VhY2hORGF5IFxuICBpZihzY2hlZHVsZS5oYXNPd25Qcm9wZXJ0eShcImVhY2hORGF5XCIpKSB7ICAgICAgICBcbiAgICAvL3NlYXJjaGluZyBmb3IgYSBkYXkgb2YgcnVuICAgICAgICBcbiAgICBsZXQgY3VycmVudERhdGUgPSBuZXcgRGF0ZShnZXREYXRlVGltZSgpLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApKTtcbiAgICAvL2R1ZSB0byBzYXZlIG1pbGxpc2Vjb25kcyBhbmQgbm90IGxpbmsgbmV3RGF0ZVRpbWUgb2JqZWN0IHdpdGggc2NoZWR1bGUuc3RhcnREYXRlVGltZVxuICAgIGxldCBuZXdEYXRlVGltZSA9IHBhcnNlRGF0ZVRpbWUoc2NoZWR1bGUuc3RhcnREYXRlVGltZSk7XG4gICAgbmV3RGF0ZVRpbWUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG4gICAgd2hpbGUobmV3RGF0ZVRpbWUgPCBjdXJyZW50RGF0ZSkge1xuICAgICAgbmV3RGF0ZVRpbWUgPSBhZGREYXRlKG5ld0RhdGVUaW1lLCAwLCAwLCBzY2hlZHVsZS5lYWNoTkRheSk7XG4gICAgfSAgICAgICAgXG4gICAgLy9hcyBmYXIgYXMgZGF5IHdhcyBmb3VuZCAtIHN0YXJ0IHRvIHNlYXJjaCBtb21lbnQgaW4gYSBkYXkgZm9yIHJ1blxuICAgIHJlc3VsdCA9IGNhbGN1bGF0ZVRpbWVPZlJ1bihzY2hlZHVsZSwgbmV3RGF0ZVRpbWUpO1xuICAgICAgICBcbiAgICAvL2RheSBvdmVyd2hlbG1pbmcgYWZ0ZXIgYWRkaW5nIGludGVydmFsIG9yIGFscmVhZHkgaGFwcGVuZCwgZ28gdG8gZnV0dXJlLCB0byBuZXh0IE4gZGF5XG4gICAgaWYocmVzdWx0ID09IG51bGwpIHtcbiAgICAgIG5ld0RhdGVUaW1lID0gYWRkRGF0ZShuZXdEYXRlVGltZSwgMCwgMCwgc2NoZWR1bGUuZWFjaE5EYXkpO1xuICAgICAgbmV3RGF0ZVRpbWUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG4gICAgICByZXN1bHQgPSBjYWxjdWxhdGVUaW1lT2ZSdW4oc2NoZWR1bGUsIG5ld0RhdGVUaW1lKTtcbiAgICB9XG4gIH0gICAgXG4gIC8vZWFjaE5XZWVrXG4gIGlmKHNjaGVkdWxlLmhhc093blByb3BlcnR5KFwiZWFjaE5XZWVrXCIpKSB7ICAgICAgICAgICAgICAgXG4gICAgLy9kdWUgdG8gc2F2ZSBtaWxsaXNlY29uZHMgYW5kIG5vdCBsaW5rIG5ld0RhdGVUaW1lIG9iamVjdCB3aXRoIHNjaGVkdWxlLnN0YXJ0RGF0ZVRpbWVcbiAgICBsZXQgbmV3RGF0ZVRpbWUgPSBuZXcgRGF0ZShwYXJzZURhdGVUaW1lKHNjaGVkdWxlLnN0YXJ0RGF0ZVRpbWUpKTtcbiAgICBuZXdEYXRlVGltZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbiAgICAvL2ZpbmQgU3VuZGF5IG9mIHN0YXJ0IHdlZWsgXG4gICAgbmV3RGF0ZVRpbWUgPSBhZGREYXRlKG5ld0RhdGVUaW1lLCAwLCAwLCAtbmV3RGF0ZVRpbWUuZ2V0VVRDRGF5KCkpO1xuICAgIC8vbWFrZSBzdGFydCBwb2ludCBhcyBTdW5kYXkgb2Ygc3RhcnQgd2VlayArIChlYWNoTldlZWstMSkgd2Vla3MgZHVlIHRvIGZpbmQgZmlyc3Qgc3VuZGF5IGZvciBjaGVja2luZyAgICAgICAgICAgIFxuICAgIG5ld0RhdGVUaW1lID0gYWRkRGF0ZShuZXdEYXRlVGltZSwgMCwgMCwgNyooc2NoZWR1bGUuZWFjaE5XZWVrIC0gMSkpO1xuICAgIC8vZmluZCBTdW5kYXkgb2YgY3VycmVudCB3ZWVrICAgIFxuICAgIGxldCBjdXJyZW50RGF0ZSA9IG5ldyBEYXRlKChuZXcgRGF0ZSgpKS5zZXRVVENIb3VycygwLCAwLCAwLCAwKSk7XG4gICAgbGV0IGN1cnJlbnRXZWVrU3VuZGF5ID0gYWRkRGF0ZShjdXJyZW50RGF0ZSwgMCwgMCwgLWN1cnJlbnREYXRlLmdldFVUQ0RheSgpKTsgICAgICAgICAgICBcbiAgICAvL2ZpbmQgU3VuZGF5IG9mIHdlZWsgd2hlcmUgbmV4dCBydW4gZGF5KHMpIGFyZSAgICAgICAgXG4gICAgd2hpbGUobmV3RGF0ZVRpbWUgPCBjdXJyZW50V2Vla1N1bmRheSkge1xuICAgICAgbmV3RGF0ZVRpbWUgPSBhZGREYXRlKG5ld0RhdGVUaW1lLCAwLCAwLCA3KnNjaGVkdWxlLmVhY2hOV2Vlayk7XG4gICAgfSAgICAgICAgICBcbiAgICAgICAgXG4gICAgbGV0IGNhbGN1bGF0aW9uUmVzdWx0ID0gY2FsY3VsYXRlV2Vla0RheU9mUnVuKHNjaGVkdWxlLCBuZXdEYXRlVGltZSk7XG4gICAgaWYoY2FsY3VsYXRpb25SZXN1bHQpXG4gICAgICBuZXdEYXRlVGltZSA9IGNhbGN1bGF0aW9uUmVzdWx0O1xuXG4gICAgLy9hcyBmYXIgYXMgYmVnaW5pbmcgb2YgdGhlIHdlZWsgd2FzIGZvdW5kIC0gc3RhcnQgdG8gc2VhcmNoIGRheSBmb3IgZXhlY3V0aW9uXG4gICAgd2hpbGUobmV3RGF0ZVRpbWUgPCBwYXJzZURhdGVUaW1lKHNjaGVkdWxlLnN0YXJ0RGF0ZVRpbWUpIHx8IG5ld0RhdGVUaW1lIDwgZ2V0RGF0ZVRpbWUoKSkge1xuICAgICAgbmV3RGF0ZVRpbWUgPSBhZGREYXRlKG5ld0RhdGVUaW1lLCAwLCAwLCA3KnNjaGVkdWxlLmVhY2hOV2Vlayk7ICAgXG4gICAgICBjYWxjdWxhdGlvblJlc3VsdCA9IGNhbGN1bGF0ZVdlZWtEYXlPZlJ1bihzY2hlZHVsZSwgbmV3RGF0ZVRpbWUpOyAgICAgICBcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICAqL1xuICAgICAgaWYoY2FsY3VsYXRpb25SZXN1bHQpXG4gICAgICAgIG5ld0RhdGVUaW1lID0gY2FsY3VsYXRpb25SZXN1bHQ7XG4gICAgfSAgICAgICAgXG5cbiAgICByZXN1bHQgPSBuZXdEYXRlVGltZTsgICAgICBcbiAgfSAgXG4gIC8vbW9udGhcbiAgaWYoc2NoZWR1bGUuaGFzT3duUHJvcGVydHkoXCJtb250aFwiKSkgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBsZXQgbmV3RGF0ZVRpbWUgPSBuZXcgRGF0ZShwYXJzZURhdGVUaW1lKHNjaGVkdWxlLnN0YXJ0RGF0ZVRpbWUpKTtcbiAgICBsZXQgY3VycmVudERhdGV0aW1lID0gZ2V0RGF0ZVRpbWUoKTtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAgKi9cbiAgICBpZihuZXdEYXRlVGltZSA8IGN1cnJlbnREYXRldGltZSkgICAgICAgICAgICAgXG4gICAgICBuZXdEYXRlVGltZSA9IGN1cnJlbnREYXRldGltZTtcbiAgICAgICAgICAgIFxuICAgIGxldCBkYXlMaXN0ID0gc2NoZWR1bGUuZGF5LnNvcnQoKGEsIGIpID0+IGEgLSBiKTsgICBcblxuICAgIG5ld0RhdGVUaW1lLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xuICAgIGxldCBtb250aEluZGV4ID0gZ2V0RGF0ZVRpbWUoKS5nZXRNb250aCgpO1xuICAgIC8vbWFrZSAxIHllYXIgcm91bmQuIElmIGRhdGUgaXMgbm90IGZvdW5kIHdpdGhpbiAxIHllYXIgLSBuZXh0IHJ1biBjYW4gbm90IGJlIGNhbGN1bGF0ZWRcbiAgICBtb250aExvb3A6XG4gICAgZm9yKGxldCBpPTA7IGk8MTM7IGkrKykge1xuICAgICAgaWYoc2NoZWR1bGUubW9udGguaW5jbHVkZXMobW9udGhMaXN0W21vbnRoSW5kZXhdKSkge1xuICAgICAgICAvL21vbnRoIGZvdW5kLCBzdGFydCB0byBjaGVjayBkYXkgbGlzdCAgICAgICAgIFxuICAgICAgICBmb3IobGV0IGk9MDsgaTxkYXlMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgbmV3RGF0ZVRpbWUuc2V0TW9udGgobW9udGhJbmRleCwgZGF5TGlzdFtpXSk7XG4gICAgICAgICAgLy9hcyBmYXIgYXMgZGF5IHdhcyBmb3VuZCAtIHN0YXJ0IHRvIHNlYXJjaCBtb21lbnQgaW4gYSBkYXkgZm9yIHJ1blxuICAgICAgICAgIGxldCBjYWxjdWxhdGlvblJlc3VsdCA9IGNhbGN1bGF0ZVRpbWVPZlJ1bihzY2hlZHVsZSwgbmV3RGF0ZVRpbWUpO1xuICAgICAgICAgIGlmKGNhbGN1bGF0aW9uUmVzdWx0ICYmIGNhbGN1bGF0aW9uUmVzdWx0ID4gZ2V0RGF0ZVRpbWUoKSkge1xuICAgICAgICAgICAgcmVzdWx0ID0gY2FsY3VsYXRpb25SZXN1bHQ7XG4gICAgICAgICAgICBicmVhayBtb250aExvb3A7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBtb250aEluZGV4Kys7XG4gICAgICBpZihtb250aEluZGV4ID09IDEyKSB7XG4gICAgICAgIG1vbnRoSW5kZXggPSAwO1xuICAgICAgICBuZXdEYXRlVGltZSA9IGFkZERhdGUobmV3RGF0ZVRpbWUsIDEpO1xuICAgICAgfVxuICAgIH0gICAgICAgICAgICAgICAgIFxuICB9ICAgICBcbiAgLy9jaGVjayBmb3IgZW5kIGRhdGUtdGltZSByZXN0cmljdGlvblxuICBpZihzY2hlZHVsZS5lbmREYXRlVGltZSAmJiByZXN1bHQpIHtcbiAgICBpZihyZXN1bHQgPiBwYXJzZURhdGVUaW1lKHNjaGVkdWxlLmVuZERhdGVUaW1lKSkgXG4gICAgICByZXR1cm4ge1wicmVzdWx0XCI6IG51bGwsIFwiZXJyb3JcIjogXCJjYWxjdWxhdGVkIGRhdGUtdGltZSBlYXJsaWVyIHRoYW4gZW5kRGF0ZVRpbWVcIn07XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIHtcInJlc3VsdFwiOiByZXN1bHQsIFwiZXJyb3JcIjogbnVsbH07ICAgICAgICAgICBcbiAgfVxuICBlbHNlIHtcbiAgICBpZihyZXN1bHQgIT0gbnVsbClcbiAgICAgIHJldHVybiB7XCJyZXN1bHRcIjogcGFyc2VEYXRlVGltZShyZXN1bHQpLCBcImVycm9yXCI6IG51bGx9O1xuICAgIGVsc2VcbiAgICAgIHJldHVybiB7XCJyZXN1bHRcIjogbnVsbCwgXCJlcnJvclwiOiBcIm5vdCBhYmxlIHRvIGNhbGN1bGF0ZSBuZXh0IHJ1biBkYXRlLXRpbWVcIn07XG4gIH1cbn07XG4vKipcbiAqIFByaW50cyBzdW1tYXJ5IG9mIHNjaGVkdWxlIG9iamVjdCBpbiBodW1hbiByZWFkYWJsZSBmb3JtYXQuIEUuZy4gXCJFYWNoIDIgZGF5KHMpIGF0IDExOjMwOjAwXCJcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY2hlZHVsZSBTY2hlZHVsZSBmb3Igd2hpY2ggc3VtbWFyeSBzaG91bGQgYmUgcHJpbnRlZFxuICogQHBhcmFtIHtzdHJpbmd9IFtvcHRpb25zXSBPcHRpb25hbC4gQSBsb2NhbGUgc3RyaW5nIG9yIGFycmF5IG9mIGxvY2FsZSAoc2VlIERhdGUudG9Mb2NhbGVTdHJpbmcpICBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbbG9jYWxlXSBPcHRpb25hbC4gQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgb25lIG9yIG1vcmUgcHJvcGVydGllcyB0aGF0IHNwZWNpZnkgY29tcGFyaXNvbiBvcHRpb25zIChzZWUgRGF0ZS50b0xvY2FsZVN0cmluZylcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFN0cmluZyB3aXRoIHN1bW1hcnlcbiAqL1xubW9kdWxlLmV4cG9ydHMuc3VtbWFyeSA9IChzY2hlZHVsZSwgbG9jYWxlLCBvcHRpb25zKSA9PiB7XG4gIGxldCByZXN1bHQgPSAnJztcblx0XG4gIGlmKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzY2hlZHVsZSwgJ29uZVRpbWUnKSkge1xuICAgIHJlc3VsdCA9IGBPbmNlIGF0ICR7Zm9ybWF0RGF0ZVRpbWUoc2NoZWR1bGUub25lVGltZSl9YDtcbiAgfVxuXHRcbiAgaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNjaGVkdWxlLCAnZWFjaE5EYXknKSkge1xuICAgIHJlc3VsdCA9IGBFYWNoICR7c2NoZWR1bGUuZWFjaE5EYXl9IGRheShzKSwgJHtnZXREYWlseUZyZXF1ZW5jeShzY2hlZHVsZS5kYWlseUZyZXF1ZW5jeSl9LCAke2dldFN0YXJ0RW5kKHNjaGVkdWxlKX1gO1xuICB9XG5cdFxuICBpZihPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc2NoZWR1bGUsICdlYWNoTldlZWsnKSkge1xuICAgIHJlc3VsdCA9IGBFYWNoICR7c2NoZWR1bGUuZWFjaE5XZWVrfSB3ZWVrKHMpIG9uICR7Z2V0V2Vla0RheXMoc2NoZWR1bGUuZGF5T2ZXZWVrKX0sICR7Z2V0RGFpbHlGcmVxdWVuY3koc2NoZWR1bGUuZGFpbHlGcmVxdWVuY3kpfSwgJHtnZXRTdGFydEVuZChzY2hlZHVsZSl9YDtcbiAgfVxuXHRcbiAgaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNjaGVkdWxlLCAnbW9udGgnKSkge1xuICAgIHJlc3VsdCA9IGBJbiAke2dldE1vbnRocyhzY2hlZHVsZS5tb250aCl9IGVhY2ggJHtnZXRNb250aERheXMoc2NoZWR1bGUuZGF5KX0gZGF5LCAke2dldERhaWx5RnJlcXVlbmN5KHNjaGVkdWxlLmRhaWx5RnJlcXVlbmN5KX0sICR7Z2V0U3RhcnRFbmQoc2NoZWR1bGUpfWA7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYWlseUZyZXF1ZW5jeSBEYWlseSBmcmVxdWVuY3kgb2JqZWN0XG4gKiBAcmV0dXJucyB7c3RyaW5nfSBIdW1hbiByZWFkYWJsZSB2YWx1ZSBvZiBkYWlseSBmcmVxdWVuY3lcbiAqL1xuZnVuY3Rpb24gZ2V0RGFpbHlGcmVxdWVuY3koZGFpbHlGcmVxdWVuY3kpIHtcbiAgaWYoZGFpbHlGcmVxdWVuY3kuaGFzT3duUHJvcGVydHkoJ29jY3Vyc09uY2VBdCcpKSB7XG4gICAgcmV0dXJuIGBhdCAke2RhaWx5RnJlcXVlbmN5Lm9jY3Vyc09uY2VBdH1gO1xuICB9IGVsc2Uge1xuICAgIGxldCBkYWlseUVuZCA9IGRhaWx5RnJlcXVlbmN5LmVuZCA9PT0gdW5kZWZpbmVkID8gJzIzOjU5OjU5JyA6IGRhaWx5RnJlcXVlbmN5LmVuZDtcbiAgICByZXR1cm4gYGV2ZXJ5ICR7ZGFpbHlGcmVxdWVuY3kub2NjdXJzRXZlcnkuaW50ZXJ2YWxWYWx1ZX0gJHtkYWlseUZyZXF1ZW5jeS5vY2N1cnNFdmVyeS5pbnRlcnZhbFR5cGV9KHMpIGJldHdlZW4gJHtkYWlseUZyZXF1ZW5jeS5zdGFydH0gYW5kICR7ZGFpbHlFbmR9YDtcbiAgfVxufVxuLyoqXG4gKiBDYWxsYmFjayBmb3IgYXJyYXkucmVkdWNlLiBSZXR1cm5zIGh1bWFuIHJlYWRhYmxlIGFuZCBiZWF1dGlmdWwgZW51bWVyYXRpb24gb2YgbGlzdCBsaWtlIFwieCwgeSwgeiBhbmQgYVwiXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBTdHJpbmcgd2hpY2ggcmVwcmVzZW50cyBsaXN0IGluIGEgZm9ybWF0IFwieCwgeSwgeiBhbmQgYVwiXG4gKi9cbmZ1bmN0aW9uIGxpc3RSZWR1Y2VyKGFjYywgY3VyLCBpbmQsIGFycikge1xuICBsZXQgcmVzdWx0ID0gYCR7YWNjfSR7Y3VyfWA7XG4gIGlmKGFyci5sZW5ndGggPiAyICYmIGluZCA8IGFyci5sZW5ndGggLSAyKVxuICAgIHJlc3VsdCA9IGAke3Jlc3VsdH0sIGA7XG4gIGlmKGluZCA9PT0gYXJyLmxlbmd0aCAtIDIpXG4gICAgcmVzdWx0ID0gYCR7cmVzdWx0fSBhbmQgYDtcblxuICByZXR1cm4gcmVzdWx0O1xufVxuLyoqXG4gKiBGb3JtYXRzIHdlZWtkYXkgbGlzdCBpbiBhIGZvcm1hdCBcIngsIHksIHogYW5kIGFcIlxuICogQHBhcmFtIHtBcnJheX0gd2Vla0RheXMgQXJyYXkgd2l0aCB3ZWVrIGRheXNcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEh1bWFuIHJlYWRhYmxlIHZhbHVlIG9mIHdlZWsgZGF5cyBsaXN0XG4gKi9cbmZ1bmN0aW9uIGdldFdlZWtEYXlzKHdlZWtEYXlzKSB7XG4gIGxldCB3ZWVrRGF5TGlzdCA9IHtcbiAgICBcInN1blwiOiBcIlN1bmRheVwiLCBcbiAgICBcIm1vblwiOiBcIk1vbmRheVwiLCBcbiAgICBcInR1ZVwiOiBcIlR1ZXNkYXlcIiwgXG4gICAgXCJ3ZWRcIjogXCJXZWRuZXNkYXlcIiwgXG4gICAgXCJ0aHVcIjogXCJUaHVyc2RheVwiLCBcbiAgICBcImZyaVwiOiBcIkZyaWRheVwiLCBcbiAgICBcInNhdFwiOiBcIlNhdHVyZGF5XCJcbiAgfTtcblxuICBsZXQgY2hvb3NlbldlZWtEYXlzID0gd2Vla0RheXMubWFwKCh2YWwpID0+IHdlZWtEYXlMaXN0W3ZhbF0pO1xuXHRcbiAgcmV0dXJuIGNob29zZW5XZWVrRGF5cy5yZWR1Y2UobGlzdFJlZHVjZXIsICcnKTtcbn1cbi8qKlxuICogRm9ybWF0cyBtb250aHMgbGlzdCBpbiBhIGZvcm1hdCBcIngsIHksIHogYW5kIGFcIlxuICogQHBhcmFtIHtBcnJheX0gd2Vla0RheXMgQXJyYXkgd2l0aCBtb250aHNcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEh1bWFuIHJlYWRhYmxlIHZhbHVlIG9mIG1vbnRocyBsaXN0XG4gKi9cbmZ1bmN0aW9uIGdldE1vbnRocyhtb250aHMpIHtcbiAgbGV0IG1vbnRoTGlzdCA9IHtcbiAgICBcImphblwiOiBcIkphbnVhcnlcIiwgXG4gICAgXCJmZWJcIjogXCJGZWJydWFyeVwiLCBcbiAgICBcIm1hclwiOiBcIk1hcmNoXCIsIFxuICAgIFwiYXByXCI6IFwiQXByaWxcIiwgXG4gICAgXCJtYXlcIjogXCJNYXlcIiwgXG4gICAgXCJqdW5cIjogXCJKdW5lXCIsIFxuICAgIFwianVsXCI6IFwiSnVseVwiLCBcbiAgICBcImF1Z1wiOiBcIkF1Z3VzdFwiLCBcbiAgICBcInNlcFwiOiBcIlNlcHRlbWJlclwiLCBcbiAgICBcIm9jdFwiOiBcIk9jdG9iZXJcIiwgXG4gICAgXCJub3ZcIjogXCJOb3ZlbWJlclwiLCBcbiAgICBcImRlY1wiOiBcIkRlY2VtYmVyXCJcbiAgfTtcblx0XG4gIGxldCBjaG9vc2VuTW9udGhzID0gbW9udGhzLm1hcCgodmFsKSA9PiBtb250aExpc3RbdmFsXSk7XG4gIHJldHVybiBjaG9vc2VuTW9udGhzLnJlZHVjZShsaXN0UmVkdWNlciwgJycpO1xufVxuLyoqXG4gKiBGb3JtYXRzIG1vbnRoIGRheXMgbGlzdCBpbiBhIGZvcm1hdCBcIngsIHksIHogYW5kIGFcIlxuICogQHBhcmFtIHtBcnJheX0gd2Vla0RheXMgQXJyYXkgd2l0aCBtb250aCBkYXlzXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBIdW1hbiByZWFkYWJsZSB2YWx1ZSBvZiBtb250aCBkYXlzIGxpc3RcbiAqL1xuZnVuY3Rpb24gZ2V0TW9udGhEYXlzKG1vbnRoRGF5cykge1xuICByZXR1cm4gbW9udGhEYXlzLnJlZHVjZShsaXN0UmVkdWNlciwgJycpO1xufVxuLyoqXG4gKiBSZXR1cm5zIGh1bWFuIHJlYWRhYmxlIHN0cmluZyB3aXRoIGluZm9ybWF0aW9uIGFib3V0IHN0YXIgYW5kIGVuZCBkYXRlLXRpbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY2hlZHVsZSBTY2hlZHVsZSBvYmplY3RcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEh1bWFuIHJlYWRhYmxlIHN0cmluZ1xuICovXG5mdW5jdGlvbiBnZXRTdGFydEVuZChzY2hlZHVsZSkge1xuICBsZXQgcmVzdWx0ID0gJyc7XG5cdFxuICBpZihzY2hlZHVsZS5oYXNPd25Qcm9wZXJ0eSgnc3RhcnREYXRlVGltZScpKSB7XG4gICAgcmVzdWx0ID0gYHN0YXJ0aW5nICR7Zm9ybWF0RGF0ZVRpbWUoc2NoZWR1bGUuc3RhcnREYXRlVGltZSl9YDsgXG4gIH1cbiAgaWYoc2NoZWR1bGUuaGFzT3duUHJvcGVydHkoJ2VuZERhdGVUaW1lJykpIHtcbiAgICByZXN1bHQgPSBgJHtyZXN1bHR9IGFuZCB0aWxsICR7Zm9ybWF0RGF0ZVRpbWUoc2NoZWR1bGUuZW5kRGF0ZVRpbWUpfWA7IFxuICB9XG5cdFxuICByZXR1cm4gcmVzdWx0O1xufSIsImxldCBBanYgPSByZXF1aXJlKFwiYWp2XCIpO1xuLy9EYXRlLXRpbWUgZnVuY3Rpb25zIGFuZCBoZWxwZXJzXG5tb2R1bGUuZXhwb3J0cy5tb250aExpc3QgPSBbXCJqYW5cIiwgXCJmZWJcIiwgXCJtYXJcIiwgXCJhcHJcIiwgXCJtYXlcIiwgXCJqdW5cIiwgXCJqdWxcIiwgXCJhdWdcIiwgXCJzZXBcIiwgXCJvY3RcIiwgXCJub3ZcIiwgXCJkZWNcIl07XG5tb2R1bGUuZXhwb3J0cy53ZWVrRGF5TGlzdCA9IFtcInN1blwiLCBcIm1vblwiLCBcInR1ZVwiLCBcIndlZFwiLCBcInRodVwiLCBcImZyaVwiLCBcInNhdFwiXTtcbi8qKlxuICogQWRkcyB6ZXJvIGJlZm9yZSBudW1iZXIgaWYgbnVtYmVyIGlzIGxlc3MgdGhhbiAxMFxuICogQHBhcmFtIHtpbnRlZ2VyfSBudW0gTnVtYmVyIHRvIHdoaWNoIGxlYWRpbmcgemVyb3Mgc2hvdWxkIGJlIGFkZGVkXG4gKi9cbmZ1bmN0aW9uIGxlYWRaZXJvKG51bSkge1xuICByZXR1cm4gKG51bSA8IDEwID8gXCIwXCIgOiBcIlwiKSArIG51bTtcbn1cbm1vZHVsZS5leHBvcnRzLmxlYWRaZXJvID0gbGVhZFplcm87XG5cbi8qKlxuICogUmV0dXJucyByZXN1bHQgb2Ygb2JqZWN0IHZhbGlkYXRpb24gYWNyb3NzIG9uZSBvciBzZXZlcmFsIG5lc3RlZCBzY2hlbWFzXG4gKiBAcGFyYW0ge29iamVjdH0gdGVzdERhdGEgT2JqZWN0IHRvIGJlIHZhbGlkYXRlZFxuICogQHBhcmFtIHtvYmplY3R9IHNjaGVtYSBTY2hlbWEgYWNyb3NzIHdoaWNoIG9iamVjdCBzaG91bGQgYmUgdmFsaWRhdGVkXG4gKiBAcGFyYW0ge29iamVjdFtdPX0gZXh0cmFTY2hlbWFMaXN0IEFueSBleHRyYSBzY2hlbWEgbGlzdCB3aGljaCBzaG91bGQgYmUgdXNlZCBmb3IgdmFsaWRhdGlvblxuICogQHJldHVybnMge2Jvb2xlYW59IFJlc3VsdCBvZiBvYmplY3QgdmFsaWRhdGlvblxuICovXG5mdW5jdGlvbiBEYXRhVnNTY2hlbWFSZXN1bHQodGVzdERhdGEsIHNjaGVtYSwgZXh0cmFTY2hlbWFMaXN0KSB7XG4gIC8vVE9ETzogdG8gYmUgb3B0aW1pemVkIHdpdGggcmVtb3ZlU2NoZW1hKC8uKi8pXG4gIHZhciBhanYgPSBuZXcgQWp2KCk7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICAqL1xuICBpZihleHRyYVNjaGVtYUxpc3QpXG4gICAgZXh0cmFTY2hlbWFMaXN0LmZvckVhY2goZnVuY3Rpb24oZSkgeyBhanYuYWRkU2NoZW1hKGUpOyB9KTsgXG4gIGxldCB2YWxpZGF0ZSA9IGFqdi5jb21waWxlKHNjaGVtYSk7XG4gIHJldHVybiB2YWxpZGF0ZSh0ZXN0RGF0YSk7XG59XG5tb2R1bGUuZXhwb3J0cy5EYXRhVnNTY2hlbWFSZXN1bHQgPSBEYXRhVnNTY2hlbWFSZXN1bHQ7XG5cbi8qKlxuICogUmV0dXJucyByZXN1bHQgb2Ygb2JqZWN0IHZhbGlkYXRpb24gYWNyb3NzIG9uZSBvciBzZXZlcmFsIG5lc3RlZCBzY2hlbWFzXG4gKiBAcGFyYW0ge29iamVjdH0gdGVzdERhdGEgT2JqZWN0IHRvIGJlIHZhbGlkYXRlZFxuICogQHBhcmFtIHtvYmplY3R9IHNjaGVtYSBTY2hlbWEgYWNyb3NzIHdoaWNoIG9iamVjdCBzaG91bGQgYmUgdmFsaWRhdGVkXG4gKiBAcGFyYW0ge29iamVjdFtdPX0gZXh0cmFTY2hlbWFMaXN0IEFueSBleHRyYSBzY2hlbWEgbGlzdCB3aGljaCBzaG91bGQgYmUgdXNlZCBmb3IgdmFsaWRhdGlvblxuICogQHJldHVybnMge3N0cmluZ30gTGlzdCBvZiBlcnJvcnNcbiAqL1xuZnVuY3Rpb24gRGF0YVZzU2NoZW1hRXJyb3JzKHRlc3REYXRhLCBzY2hlbWEsIGV4dHJhU2NoZW1hKSB7XG4gIC8vVE9ETzogdG8gYmUgb3B0aW1pemVkIHdpdGggcmVtb3ZlU2NoZW1hKC8uKi8pXG4gIHZhciBhanYgPSBuZXcgQWp2KCk7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICAqL1xuICBpZihleHRyYVNjaGVtYSlcbiAgICBleHRyYVNjaGVtYS5mb3JFYWNoKGZ1bmN0aW9uKGUpIHsgYWp2LmFkZFNjaGVtYShlKTsgfSk7IFxuICBsZXQgdmFsaWRhdGUgPSBhanYuY29tcGlsZShzY2hlbWEpO1xuICB2YWxpZGF0ZSh0ZXN0RGF0YSk7XG4gIHJldHVybiBhanYuZXJyb3JzVGV4dCh2YWxpZGF0ZS5lcnJvcnMpO1xufVxubW9kdWxlLmV4cG9ydHMuRGF0YVZzU2NoZW1hRXJyb3JzID0gRGF0YVZzU2NoZW1hRXJyb3JzO1xuLyoqXG4gKiBSZXR1cm4gZGF0ZS10aW1lIGluIGEgcHJvcGVyIGZvcm1hdFxuICogQHJldHVybnMge29iamVjdH0gRGF0ZS10aW1lXG4gKi9cbmZ1bmN0aW9uIGdldERhdGVUaW1lKCkgeyBcbiAgcmV0dXJuIG5ldyBEYXRlKCk7XG59XG5tb2R1bGUuZXhwb3J0cy5nZXREYXRlVGltZSA9IGdldERhdGVUaW1lO1xuLyoqXG4gKiBFeHRyYWN0IGZyb20gZGF0ZSBhbmQgdGltZSBhbmQgcmV0dXJuIHRpbWUgaW4gYSBmb3JtYXQgSEg6TU06U1MuIEN1cnJlbnQgZGF0ZSB0aW1lIHdpbGwgYmUgdGFrZW4gaW4gY2FzZSBpZiBkYXRlVGltZSBpcyBub3QgcHJvdmlkZWRcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRlVGltZSBEYXRlIGFuZCB0aW1lIG9iamVjdCB3aGljaCBzaG91bGQgYmUgdXNlZCBmb3IgdGltZSBleHRyYWN0aW9uXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaW1lIGluIGEgZm9ybWF0IEhIOk1NOlNTXG4gKi9cbmZ1bmN0aW9uIGdldFRpbWVmcm9tRGF0ZVRpbWUoZGF0ZVRpbWUpIHsgXG4gIGxldCBjdXJyZW50RGF0ZVRpbWU7XG4gIGlmKGRhdGVUaW1lICYmIGRhdGVUaW1lIGluc3RhbmNlb2YgRGF0ZSlcbiAgICBjdXJyZW50RGF0ZVRpbWUgPSBkYXRlVGltZTtcbiAgZWxzZVxuICAgIGN1cnJlbnREYXRlVGltZSA9IGdldERhdGVUaW1lKCk7XG4gIGxldCBob3VycyA9IGxlYWRaZXJvKGN1cnJlbnREYXRlVGltZS5nZXRVVENIb3VycygpKTtcbiAgbGV0IG1pbnV0ZXMgPSBsZWFkWmVybyhjdXJyZW50RGF0ZVRpbWUuZ2V0VVRDTWludXRlcygpKTtcbiAgbGV0IHNlY29uZHMgPSBsZWFkWmVybyhjdXJyZW50RGF0ZVRpbWUuZ2V0VVRDU2Vjb25kcygpKTsgICBcbiAgcmV0dXJuIGhvdXJzICsgXCI6XCIgKyBtaW51dGVzICsgXCI6XCIgKyBzZWNvbmRzO1xufVxubW9kdWxlLmV4cG9ydHMuZ2V0VGltZWZyb21EYXRlVGltZSA9IGdldFRpbWVmcm9tRGF0ZVRpbWU7XG4vKipcbiAqIFJldHVybnMgbmV3IGRhdGUgYmFzZWQgb24gZGF0ZSBhbmQgYWRkZWQgbnVtYmVyIG9mIHllYXJzLCBtb250aHMsIGRheXMsIGhvdXJzLCBtaW51dGVzIG9yIHNlY29uZHNcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRlIERhdGUgdmFsdWUgdG8gd2hpY2ggZGF0ZS10aW1lIGludGVydmFscyBzaG91bGQgYmUgYWRkZWRcbiAqIEBwYXJhbSB7bnVtYmVyfSB5ZWFycyBOdW1iZXIgb2YgeWVhcnMgdG8gYWRkXG4gKiBAcGFyYW0ge251bWJlcn0gbW9udGhzIE51bWJlciBvZiBtb250aHMgdG8gYWRkXG4gKiBAcGFyYW0ge251bWJlcn0gZGF5cyBOdW1iZXIgb2YgZGF5cyB0byBhZGRcbiAqIEBwYXJhbSB7bnVtYmVyfSBob3VycyBOdW1iZXIgb2YgaG91cnMgdG8gYWRkXG4gKiBAcGFyYW0ge251bWJlcn0gbWludXRlcyBOdW1iZXIgb2YgbWludXRlcyB0byBhZGRcbiAqIEBwYXJhbSB7bnVtYmVyfSBzZWNvbmRzIE51bWJlciBvZiBzZWNvbmRzIHRvIGFkZFxuICogQHJldHVybnMge29iamVjdH0gTmV3IGRhdGUgd2l0aCBhZGRlZCBudW1iZXIgb2YgZGF5c1xuICovXG5mdW5jdGlvbiBhZGREYXRlKGRhdGUsIHllYXJzLCBtb250aHMgPSAwLCBkYXlzID0gMCwgaG91cnMgPSAwLCBtaW51dGVzID0gMCwgc2Vjb25kcyA9IDApIHsgIFxuICBsZXQgcmVzdWx0ID0gcGFyc2VEYXRlVGltZShcIjIwMDAtMDEtMDFUMDA6MDA6MDAuMDAwWlwiKTtcbiAgICBcbiAgcmVzdWx0LnNldFVUQ0Z1bGxZZWFyKGRhdGUuZ2V0VVRDRnVsbFllYXIoKSArIHllYXJzKTtcbiAgcmVzdWx0LnNldFVUQ01vbnRoKGRhdGUuZ2V0VVRDTW9udGgoKSArIG1vbnRocyk7XG4gIHJlc3VsdC5zZXRVVENEYXRlKGRhdGUuZ2V0VVRDRGF0ZSgpICsgZGF5cyk7ICAgIFxuICByZXN1bHQuc2V0VVRDSG91cnMoZGF0ZS5nZXRVVENIb3VycygpICsgaG91cnMpOyAgICAgICAgIFxuICByZXN1bHQuc2V0VVRDTWludXRlcyhkYXRlLmdldFVUQ01pbnV0ZXMoKSArIG1pbnV0ZXMpOyAgICBcbiAgcmVzdWx0LnNldFVUQ1NlY29uZHMoZGF0ZS5nZXRVVENTZWNvbmRzKCkgKyBzZWNvbmRzKTsgICAgXG4gIHJlc3VsdC5zZXRVVENNaWxsaXNlY29uZHMoZGF0ZS5nZXRVVENNaWxsaXNlY29uZHMoKSk7XG4gICBcbiAgcmV0dXJuIG5ldyBEYXRlKHJlc3VsdCk7XG59XG5tb2R1bGUuZXhwb3J0cy5hZGREYXRlID0gYWRkRGF0ZTtcbi8qKlxuICogQ29udmVydCBzdHJpbmcgcmVwcmVzZW50ZWQgZGF0ZSBhbmQgdGltZSB0byBuYXRpdmUgZGF0ZS10aW1lIGZvcm1hdFxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZ0RhdGVUaW1lIFVUQyBkYXRlIGFuZCB0aW1lIHJlcHJlc2VudGVkIGFzIGEgc3RpbmcuIEV4YW1wbGU6ICcyMDE4LTAxLTMxVDIwOjU0OjIzLjA3MVonXG4gKiBAcmV0dXJucyB7ZGF0ZXRpbWV9IERhdGUgYW5kIHRpbWUgb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIHBhcnNlRGF0ZVRpbWUoc3RyaW5nRGF0ZVRpbWUpIHtcbiAgbGV0IHByZURhdGUgPSBEYXRlLnBhcnNlKHN0cmluZ0RhdGVUaW1lKTtcbiAgaWYoIWlzTmFOKHByZURhdGUpKSBcbiAgICByZXR1cm4gbmV3IERhdGUocHJlRGF0ZSk7ICAgICAgICAgICAgXG4gIGVsc2VcbiAgICByZXR1cm4gbnVsbDtcbn1cbm1vZHVsZS5leHBvcnRzLnBhcnNlRGF0ZVRpbWUgPSBwYXJzZURhdGVUaW1lO1xuXG4vKipcbiAqIFxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIERhdGUtdGltZSB2YWx1ZVxuICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMgT3B0aW9uYWwuIEEgbG9jYWxlIHN0cmluZyBvciBhcnJheSBvZiBsb2NhbGUgKHNlZSBEYXRlLnRvTG9jYWxlU3RyaW5nKVxuICogQHBhcmFtIHtPYmplY3R9IGxvY2FsZSBPcHRpb25hbC4gQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgb25lIG9yIG1vcmUgcHJvcGVydGllcyB0aGF0IHNwZWNpZnkgY29tcGFyaXNvbiBvcHRpb25zIChzZWUgRGF0ZS50b0xvY2FsZVN0cmluZylcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdGVkIGRhdGUgYW5kIHRpbWVcbiAqL1xuZnVuY3Rpb24gZm9ybWF0RGF0ZVRpbWUodmFsdWUsIG9wdGlvbnMsIGxvY2FsZSkgeyAgXG4gIGxldCBkYXRlVGltZSA9IG5ldyBEYXRlKHZhbHVlKTtcbiAgcmV0dXJuIHZhbHVlID09PSBudWxsID8gJycgOiBkYXRlVGltZS50b0xvY2FsZVN0cmluZyhsb2NhbGUsIG9wdGlvbnMpOyAgXG59XG5tb2R1bGUuZXhwb3J0cy5mb3JtYXREYXRlVGltZSA9IGZvcm1hdERhdGVUaW1lOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNvbXBpbGVTY2hlbWEgPSByZXF1aXJlKCcuL2NvbXBpbGUnKVxuICAsIHJlc29sdmUgPSByZXF1aXJlKCcuL2NvbXBpbGUvcmVzb2x2ZScpXG4gICwgQ2FjaGUgPSByZXF1aXJlKCcuL2NhY2hlJylcbiAgLCBTY2hlbWFPYmplY3QgPSByZXF1aXJlKCcuL2NvbXBpbGUvc2NoZW1hX29iaicpXG4gICwgc3RhYmxlU3RyaW5naWZ5ID0gcmVxdWlyZSgnZmFzdC1qc29uLXN0YWJsZS1zdHJpbmdpZnknKVxuICAsIGZvcm1hdHMgPSByZXF1aXJlKCcuL2NvbXBpbGUvZm9ybWF0cycpXG4gICwgcnVsZXMgPSByZXF1aXJlKCcuL2NvbXBpbGUvcnVsZXMnKVxuICAsICRkYXRhTWV0YVNjaGVtYSA9IHJlcXVpcmUoJy4vZGF0YScpXG4gICwgdXRpbCA9IHJlcXVpcmUoJy4vY29tcGlsZS91dGlsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQWp2O1xuXG5BanYucHJvdG90eXBlLnZhbGlkYXRlID0gdmFsaWRhdGU7XG5BanYucHJvdG90eXBlLmNvbXBpbGUgPSBjb21waWxlO1xuQWp2LnByb3RvdHlwZS5hZGRTY2hlbWEgPSBhZGRTY2hlbWE7XG5BanYucHJvdG90eXBlLmFkZE1ldGFTY2hlbWEgPSBhZGRNZXRhU2NoZW1hO1xuQWp2LnByb3RvdHlwZS52YWxpZGF0ZVNjaGVtYSA9IHZhbGlkYXRlU2NoZW1hO1xuQWp2LnByb3RvdHlwZS5nZXRTY2hlbWEgPSBnZXRTY2hlbWE7XG5BanYucHJvdG90eXBlLnJlbW92ZVNjaGVtYSA9IHJlbW92ZVNjaGVtYTtcbkFqdi5wcm90b3R5cGUuYWRkRm9ybWF0ID0gYWRkRm9ybWF0O1xuQWp2LnByb3RvdHlwZS5lcnJvcnNUZXh0ID0gZXJyb3JzVGV4dDtcblxuQWp2LnByb3RvdHlwZS5fYWRkU2NoZW1hID0gX2FkZFNjaGVtYTtcbkFqdi5wcm90b3R5cGUuX2NvbXBpbGUgPSBfY29tcGlsZTtcblxuQWp2LnByb3RvdHlwZS5jb21waWxlQXN5bmMgPSByZXF1aXJlKCcuL2NvbXBpbGUvYXN5bmMnKTtcbnZhciBjdXN0b21LZXl3b3JkID0gcmVxdWlyZSgnLi9rZXl3b3JkJyk7XG5BanYucHJvdG90eXBlLmFkZEtleXdvcmQgPSBjdXN0b21LZXl3b3JkLmFkZDtcbkFqdi5wcm90b3R5cGUuZ2V0S2V5d29yZCA9IGN1c3RvbUtleXdvcmQuZ2V0O1xuQWp2LnByb3RvdHlwZS5yZW1vdmVLZXl3b3JkID0gY3VzdG9tS2V5d29yZC5yZW1vdmU7XG5BanYucHJvdG90eXBlLnZhbGlkYXRlS2V5d29yZCA9IGN1c3RvbUtleXdvcmQudmFsaWRhdGU7XG5cbnZhciBlcnJvckNsYXNzZXMgPSByZXF1aXJlKCcuL2NvbXBpbGUvZXJyb3JfY2xhc3NlcycpO1xuQWp2LlZhbGlkYXRpb25FcnJvciA9IGVycm9yQ2xhc3Nlcy5WYWxpZGF0aW9uO1xuQWp2Lk1pc3NpbmdSZWZFcnJvciA9IGVycm9yQ2xhc3Nlcy5NaXNzaW5nUmVmO1xuQWp2LiRkYXRhTWV0YVNjaGVtYSA9ICRkYXRhTWV0YVNjaGVtYTtcblxudmFyIE1FVEFfU0NIRU1BX0lEID0gJ2h0dHA6Ly9qc29uLXNjaGVtYS5vcmcvZHJhZnQtMDcvc2NoZW1hJztcblxudmFyIE1FVEFfSUdOT1JFX09QVElPTlMgPSBbICdyZW1vdmVBZGRpdGlvbmFsJywgJ3VzZURlZmF1bHRzJywgJ2NvZXJjZVR5cGVzJywgJ3N0cmljdERlZmF1bHRzJyBdO1xudmFyIE1FVEFfU1VQUE9SVF9EQVRBID0gWycvcHJvcGVydGllcyddO1xuXG4vKipcbiAqIENyZWF0ZXMgdmFsaWRhdG9yIGluc3RhbmNlLlxuICogVXNhZ2U6IGBBanYob3B0cylgXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBvcHRpb25hbCBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9IGFqdiBpbnN0YW5jZVxuICovXG5mdW5jdGlvbiBBanYob3B0cykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQWp2KSkgcmV0dXJuIG5ldyBBanYob3B0cyk7XG4gIG9wdHMgPSB0aGlzLl9vcHRzID0gdXRpbC5jb3B5KG9wdHMpIHx8IHt9O1xuICBzZXRMb2dnZXIodGhpcyk7XG4gIHRoaXMuX3NjaGVtYXMgPSB7fTtcbiAgdGhpcy5fcmVmcyA9IHt9O1xuICB0aGlzLl9mcmFnbWVudHMgPSB7fTtcbiAgdGhpcy5fZm9ybWF0cyA9IGZvcm1hdHMob3B0cy5mb3JtYXQpO1xuXG4gIHRoaXMuX2NhY2hlID0gb3B0cy5jYWNoZSB8fCBuZXcgQ2FjaGU7XG4gIHRoaXMuX2xvYWRpbmdTY2hlbWFzID0ge307XG4gIHRoaXMuX2NvbXBpbGF0aW9ucyA9IFtdO1xuICB0aGlzLlJVTEVTID0gcnVsZXMoKTtcbiAgdGhpcy5fZ2V0SWQgPSBjaG9vc2VHZXRJZChvcHRzKTtcblxuICBvcHRzLmxvb3BSZXF1aXJlZCA9IG9wdHMubG9vcFJlcXVpcmVkIHx8IEluZmluaXR5O1xuICBpZiAob3B0cy5lcnJvckRhdGFQYXRoID09ICdwcm9wZXJ0eScpIG9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSA9IHRydWU7XG4gIGlmIChvcHRzLnNlcmlhbGl6ZSA9PT0gdW5kZWZpbmVkKSBvcHRzLnNlcmlhbGl6ZSA9IHN0YWJsZVN0cmluZ2lmeTtcbiAgdGhpcy5fbWV0YU9wdHMgPSBnZXRNZXRhU2NoZW1hT3B0aW9ucyh0aGlzKTtcblxuICBpZiAob3B0cy5mb3JtYXRzKSBhZGRJbml0aWFsRm9ybWF0cyh0aGlzKTtcbiAgaWYgKG9wdHMua2V5d29yZHMpIGFkZEluaXRpYWxLZXl3b3Jkcyh0aGlzKTtcbiAgYWRkRGVmYXVsdE1ldGFTY2hlbWEodGhpcyk7XG4gIGlmICh0eXBlb2Ygb3B0cy5tZXRhID09ICdvYmplY3QnKSB0aGlzLmFkZE1ldGFTY2hlbWEob3B0cy5tZXRhKTtcbiAgaWYgKG9wdHMubnVsbGFibGUpIHRoaXMuYWRkS2V5d29yZCgnbnVsbGFibGUnLCB7bWV0YVNjaGVtYToge3R5cGU6ICdib29sZWFuJ319KTtcbiAgYWRkSW5pdGlhbFNjaGVtYXModGhpcyk7XG59XG5cblxuXG4vKipcbiAqIFZhbGlkYXRlIGRhdGEgdXNpbmcgc2NoZW1hXG4gKiBTY2hlbWEgd2lsbCBiZSBjb21waWxlZCBhbmQgY2FjaGVkICh1c2luZyBzZXJpYWxpemVkIEpTT04gYXMga2V5LiBbZmFzdC1qc29uLXN0YWJsZS1zdHJpbmdpZnldKGh0dHBzOi8vZ2l0aHViLmNvbS9lcG9iZXJlemtpbi9mYXN0LWpzb24tc3RhYmxlLXN0cmluZ2lmeSkgaXMgdXNlZCB0byBzZXJpYWxpemUuXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtICB7U3RyaW5nfE9iamVjdH0gc2NoZW1hS2V5UmVmIGtleSwgcmVmIG9yIHNjaGVtYSBvYmplY3RcbiAqIEBwYXJhbSAge0FueX0gZGF0YSB0byBiZSB2YWxpZGF0ZWRcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHZhbGlkYXRpb24gcmVzdWx0LiBFcnJvcnMgZnJvbSB0aGUgbGFzdCB2YWxpZGF0aW9uIHdpbGwgYmUgYXZhaWxhYmxlIGluIGBhanYuZXJyb3JzYCAoYW5kIGFsc28gaW4gY29tcGlsZWQgc2NoZW1hOiBgc2NoZW1hLmVycm9yc2ApLlxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZShzY2hlbWFLZXlSZWYsIGRhdGEpIHtcbiAgdmFyIHY7XG4gIGlmICh0eXBlb2Ygc2NoZW1hS2V5UmVmID09ICdzdHJpbmcnKSB7XG4gICAgdiA9IHRoaXMuZ2V0U2NoZW1hKHNjaGVtYUtleVJlZik7XG4gICAgaWYgKCF2KSB0aHJvdyBuZXcgRXJyb3IoJ25vIHNjaGVtYSB3aXRoIGtleSBvciByZWYgXCInICsgc2NoZW1hS2V5UmVmICsgJ1wiJyk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHNjaGVtYU9iaiA9IHRoaXMuX2FkZFNjaGVtYShzY2hlbWFLZXlSZWYpO1xuICAgIHYgPSBzY2hlbWFPYmoudmFsaWRhdGUgfHwgdGhpcy5fY29tcGlsZShzY2hlbWFPYmopO1xuICB9XG5cbiAgdmFyIHZhbGlkID0gdihkYXRhKTtcbiAgaWYgKHYuJGFzeW5jICE9PSB0cnVlKSB0aGlzLmVycm9ycyA9IHYuZXJyb3JzO1xuICByZXR1cm4gdmFsaWQ7XG59XG5cblxuLyoqXG4gKiBDcmVhdGUgdmFsaWRhdGluZyBmdW5jdGlvbiBmb3IgcGFzc2VkIHNjaGVtYS5cbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0gIHtPYmplY3R9IHNjaGVtYSBzY2hlbWEgb2JqZWN0XG4gKiBAcGFyYW0gIHtCb29sZWFufSBfbWV0YSB0cnVlIGlmIHNjaGVtYSBpcyBhIG1ldGEtc2NoZW1hLiBVc2VkIGludGVybmFsbHkgdG8gY29tcGlsZSBtZXRhIHNjaGVtYXMgb2YgY3VzdG9tIGtleXdvcmRzLlxuICogQHJldHVybiB7RnVuY3Rpb259IHZhbGlkYXRpbmcgZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gY29tcGlsZShzY2hlbWEsIF9tZXRhKSB7XG4gIHZhciBzY2hlbWFPYmogPSB0aGlzLl9hZGRTY2hlbWEoc2NoZW1hLCB1bmRlZmluZWQsIF9tZXRhKTtcbiAgcmV0dXJuIHNjaGVtYU9iai52YWxpZGF0ZSB8fCB0aGlzLl9jb21waWxlKHNjaGVtYU9iaik7XG59XG5cblxuLyoqXG4gKiBBZGRzIHNjaGVtYSB0byB0aGUgaW5zdGFuY2UuXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IHNjaGVtYSBzY2hlbWEgb3IgYXJyYXkgb2Ygc2NoZW1hcy4gSWYgYXJyYXkgaXMgcGFzc2VkLCBga2V5YCBhbmQgb3RoZXIgcGFyYW1ldGVycyB3aWxsIGJlIGlnbm9yZWQuXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IE9wdGlvbmFsIHNjaGVtYSBrZXkuIENhbiBiZSBwYXNzZWQgdG8gYHZhbGlkYXRlYCBtZXRob2QgaW5zdGVhZCBvZiBzY2hlbWEgb2JqZWN0IG9yIGlkL3JlZi4gT25lIHNjaGVtYSBwZXIgaW5zdGFuY2UgY2FuIGhhdmUgZW1wdHkgYGlkYCBhbmQgYGtleWAuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IF9za2lwVmFsaWRhdGlvbiB0cnVlIHRvIHNraXAgc2NoZW1hIHZhbGlkYXRpb24uIFVzZWQgaW50ZXJuYWxseSwgb3B0aW9uIHZhbGlkYXRlU2NoZW1hIHNob3VsZCBiZSB1c2VkIGluc3RlYWQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IF9tZXRhIHRydWUgaWYgc2NoZW1hIGlzIGEgbWV0YS1zY2hlbWEuIFVzZWQgaW50ZXJuYWxseSwgYWRkTWV0YVNjaGVtYSBzaG91bGQgYmUgdXNlZCBpbnN0ZWFkLlxuICogQHJldHVybiB7QWp2fSB0aGlzIGZvciBtZXRob2QgY2hhaW5pbmdcbiAqL1xuZnVuY3Rpb24gYWRkU2NoZW1hKHNjaGVtYSwga2V5LCBfc2tpcFZhbGlkYXRpb24sIF9tZXRhKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KHNjaGVtYSkpe1xuICAgIGZvciAodmFyIGk9MDsgaTxzY2hlbWEubGVuZ3RoOyBpKyspIHRoaXMuYWRkU2NoZW1hKHNjaGVtYVtpXSwgdW5kZWZpbmVkLCBfc2tpcFZhbGlkYXRpb24sIF9tZXRhKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICB2YXIgaWQgPSB0aGlzLl9nZXRJZChzY2hlbWEpO1xuICBpZiAoaWQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgaWQgIT0gJ3N0cmluZycpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdzY2hlbWEgaWQgbXVzdCBiZSBzdHJpbmcnKTtcbiAga2V5ID0gcmVzb2x2ZS5ub3JtYWxpemVJZChrZXkgfHwgaWQpO1xuICBjaGVja1VuaXF1ZSh0aGlzLCBrZXkpO1xuICB0aGlzLl9zY2hlbWFzW2tleV0gPSB0aGlzLl9hZGRTY2hlbWEoc2NoZW1hLCBfc2tpcFZhbGlkYXRpb24sIF9tZXRhLCB0cnVlKTtcbiAgcmV0dXJuIHRoaXM7XG59XG5cblxuLyoqXG4gKiBBZGQgc2NoZW1hIHRoYXQgd2lsbCBiZSB1c2VkIHRvIHZhbGlkYXRlIG90aGVyIHNjaGVtYXNcbiAqIG9wdGlvbnMgaW4gTUVUQV9JR05PUkVfT1BUSU9OUyBhcmUgYWx3YXkgc2V0IHRvIGZhbHNlXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtIHtPYmplY3R9IHNjaGVtYSBzY2hlbWEgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IG9wdGlvbmFsIHNjaGVtYSBrZXlcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gc2tpcFZhbGlkYXRpb24gdHJ1ZSB0byBza2lwIHNjaGVtYSB2YWxpZGF0aW9uLCBjYW4gYmUgdXNlZCB0byBvdmVycmlkZSB2YWxpZGF0ZVNjaGVtYSBvcHRpb24gZm9yIG1ldGEtc2NoZW1hXG4gKiBAcmV0dXJuIHtBanZ9IHRoaXMgZm9yIG1ldGhvZCBjaGFpbmluZ1xuICovXG5mdW5jdGlvbiBhZGRNZXRhU2NoZW1hKHNjaGVtYSwga2V5LCBza2lwVmFsaWRhdGlvbikge1xuICB0aGlzLmFkZFNjaGVtYShzY2hlbWEsIGtleSwgc2tpcFZhbGlkYXRpb24sIHRydWUpO1xuICByZXR1cm4gdGhpcztcbn1cblxuXG4vKipcbiAqIFZhbGlkYXRlIHNjaGVtYVxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY2hlbWEgc2NoZW1hIHRvIHZhbGlkYXRlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHRocm93T3JMb2dFcnJvciBwYXNzIHRydWUgdG8gdGhyb3cgKG9yIGxvZykgYW4gZXJyb3IgaWYgaW52YWxpZFxuICogQHJldHVybiB7Qm9vbGVhbn0gdHJ1ZSBpZiBzY2hlbWEgaXMgdmFsaWRcbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVTY2hlbWEoc2NoZW1hLCB0aHJvd09yTG9nRXJyb3IpIHtcbiAgdmFyICRzY2hlbWEgPSBzY2hlbWEuJHNjaGVtYTtcbiAgaWYgKCRzY2hlbWEgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgJHNjaGVtYSAhPSAnc3RyaW5nJylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJyRzY2hlbWEgbXVzdCBiZSBhIHN0cmluZycpO1xuICAkc2NoZW1hID0gJHNjaGVtYSB8fCB0aGlzLl9vcHRzLmRlZmF1bHRNZXRhIHx8IGRlZmF1bHRNZXRhKHRoaXMpO1xuICBpZiAoISRzY2hlbWEpIHtcbiAgICB0aGlzLmxvZ2dlci53YXJuKCdtZXRhLXNjaGVtYSBub3QgYXZhaWxhYmxlJyk7XG4gICAgdGhpcy5lcnJvcnMgPSBudWxsO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHZhciB2YWxpZCA9IHRoaXMudmFsaWRhdGUoJHNjaGVtYSwgc2NoZW1hKTtcbiAgaWYgKCF2YWxpZCAmJiB0aHJvd09yTG9nRXJyb3IpIHtcbiAgICB2YXIgbWVzc2FnZSA9ICdzY2hlbWEgaXMgaW52YWxpZDogJyArIHRoaXMuZXJyb3JzVGV4dCgpO1xuICAgIGlmICh0aGlzLl9vcHRzLnZhbGlkYXRlU2NoZW1hID09ICdsb2cnKSB0aGlzLmxvZ2dlci5lcnJvcihtZXNzYWdlKTtcbiAgICBlbHNlIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgfVxuICByZXR1cm4gdmFsaWQ7XG59XG5cblxuZnVuY3Rpb24gZGVmYXVsdE1ldGEoc2VsZikge1xuICB2YXIgbWV0YSA9IHNlbGYuX29wdHMubWV0YTtcbiAgc2VsZi5fb3B0cy5kZWZhdWx0TWV0YSA9IHR5cGVvZiBtZXRhID09ICdvYmplY3QnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBzZWxmLl9nZXRJZChtZXRhKSB8fCBtZXRhXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBzZWxmLmdldFNjaGVtYShNRVRBX1NDSEVNQV9JRClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gTUVUQV9TQ0hFTUFfSURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuICByZXR1cm4gc2VsZi5fb3B0cy5kZWZhdWx0TWV0YTtcbn1cblxuXG4vKipcbiAqIEdldCBjb21waWxlZCBzY2hlbWEgZnJvbSB0aGUgaW5zdGFuY2UgYnkgYGtleWAgb3IgYHJlZmAuXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtICB7U3RyaW5nfSBrZXlSZWYgYGtleWAgdGhhdCB3YXMgcGFzc2VkIHRvIGBhZGRTY2hlbWFgIG9yIGZ1bGwgc2NoZW1hIHJlZmVyZW5jZSAoYHNjaGVtYS5pZGAgb3IgcmVzb2x2ZWQgaWQpLlxuICogQHJldHVybiB7RnVuY3Rpb259IHNjaGVtYSB2YWxpZGF0aW5nIGZ1bmN0aW9uICh3aXRoIHByb3BlcnR5IGBzY2hlbWFgKS5cbiAqL1xuZnVuY3Rpb24gZ2V0U2NoZW1hKGtleVJlZikge1xuICB2YXIgc2NoZW1hT2JqID0gX2dldFNjaGVtYU9iaih0aGlzLCBrZXlSZWYpO1xuICBzd2l0Y2ggKHR5cGVvZiBzY2hlbWFPYmopIHtcbiAgICBjYXNlICdvYmplY3QnOiByZXR1cm4gc2NoZW1hT2JqLnZhbGlkYXRlIHx8IHRoaXMuX2NvbXBpbGUoc2NoZW1hT2JqKTtcbiAgICBjYXNlICdzdHJpbmcnOiByZXR1cm4gdGhpcy5nZXRTY2hlbWEoc2NoZW1hT2JqKTtcbiAgICBjYXNlICd1bmRlZmluZWQnOiByZXR1cm4gX2dldFNjaGVtYUZyYWdtZW50KHRoaXMsIGtleVJlZik7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBfZ2V0U2NoZW1hRnJhZ21lbnQoc2VsZiwgcmVmKSB7XG4gIHZhciByZXMgPSByZXNvbHZlLnNjaGVtYS5jYWxsKHNlbGYsIHsgc2NoZW1hOiB7fSB9LCByZWYpO1xuICBpZiAocmVzKSB7XG4gICAgdmFyIHNjaGVtYSA9IHJlcy5zY2hlbWFcbiAgICAgICwgcm9vdCA9IHJlcy5yb290XG4gICAgICAsIGJhc2VJZCA9IHJlcy5iYXNlSWQ7XG4gICAgdmFyIHYgPSBjb21waWxlU2NoZW1hLmNhbGwoc2VsZiwgc2NoZW1hLCByb290LCB1bmRlZmluZWQsIGJhc2VJZCk7XG4gICAgc2VsZi5fZnJhZ21lbnRzW3JlZl0gPSBuZXcgU2NoZW1hT2JqZWN0KHtcbiAgICAgIHJlZjogcmVmLFxuICAgICAgZnJhZ21lbnQ6IHRydWUsXG4gICAgICBzY2hlbWE6IHNjaGVtYSxcbiAgICAgIHJvb3Q6IHJvb3QsXG4gICAgICBiYXNlSWQ6IGJhc2VJZCxcbiAgICAgIHZhbGlkYXRlOiB2XG4gICAgfSk7XG4gICAgcmV0dXJuIHY7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBfZ2V0U2NoZW1hT2JqKHNlbGYsIGtleVJlZikge1xuICBrZXlSZWYgPSByZXNvbHZlLm5vcm1hbGl6ZUlkKGtleVJlZik7XG4gIHJldHVybiBzZWxmLl9zY2hlbWFzW2tleVJlZl0gfHwgc2VsZi5fcmVmc1trZXlSZWZdIHx8IHNlbGYuX2ZyYWdtZW50c1trZXlSZWZdO1xufVxuXG5cbi8qKlxuICogUmVtb3ZlIGNhY2hlZCBzY2hlbWEocykuXG4gKiBJZiBubyBwYXJhbWV0ZXIgaXMgcGFzc2VkIGFsbCBzY2hlbWFzIGJ1dCBtZXRhLXNjaGVtYXMgYXJlIHJlbW92ZWQuXG4gKiBJZiBSZWdFeHAgaXMgcGFzc2VkIGFsbCBzY2hlbWFzIHdpdGgga2V5L2lkIG1hdGNoaW5nIHBhdHRlcm4gYnV0IG1ldGEtc2NoZW1hcyBhcmUgcmVtb3ZlZC5cbiAqIEV2ZW4gaWYgc2NoZW1hIGlzIHJlZmVyZW5jZWQgYnkgb3RoZXIgc2NoZW1hcyBpdCBzdGlsbCBjYW4gYmUgcmVtb3ZlZCBhcyBvdGhlciBzY2hlbWFzIGhhdmUgbG9jYWwgcmVmZXJlbmNlcy5cbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0gIHtTdHJpbmd8T2JqZWN0fFJlZ0V4cH0gc2NoZW1hS2V5UmVmIGtleSwgcmVmLCBwYXR0ZXJuIHRvIG1hdGNoIGtleS9yZWYgb3Igc2NoZW1hIG9iamVjdFxuICogQHJldHVybiB7QWp2fSB0aGlzIGZvciBtZXRob2QgY2hhaW5pbmdcbiAqL1xuZnVuY3Rpb24gcmVtb3ZlU2NoZW1hKHNjaGVtYUtleVJlZikge1xuICBpZiAoc2NoZW1hS2V5UmVmIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgX3JlbW92ZUFsbFNjaGVtYXModGhpcywgdGhpcy5fc2NoZW1hcywgc2NoZW1hS2V5UmVmKTtcbiAgICBfcmVtb3ZlQWxsU2NoZW1hcyh0aGlzLCB0aGlzLl9yZWZzLCBzY2hlbWFLZXlSZWYpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHN3aXRjaCAodHlwZW9mIHNjaGVtYUtleVJlZikge1xuICAgIGNhc2UgJ3VuZGVmaW5lZCc6XG4gICAgICBfcmVtb3ZlQWxsU2NoZW1hcyh0aGlzLCB0aGlzLl9zY2hlbWFzKTtcbiAgICAgIF9yZW1vdmVBbGxTY2hlbWFzKHRoaXMsIHRoaXMuX3JlZnMpO1xuICAgICAgdGhpcy5fY2FjaGUuY2xlYXIoKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICB2YXIgc2NoZW1hT2JqID0gX2dldFNjaGVtYU9iaih0aGlzLCBzY2hlbWFLZXlSZWYpO1xuICAgICAgaWYgKHNjaGVtYU9iaikgdGhpcy5fY2FjaGUuZGVsKHNjaGVtYU9iai5jYWNoZUtleSk7XG4gICAgICBkZWxldGUgdGhpcy5fc2NoZW1hc1tzY2hlbWFLZXlSZWZdO1xuICAgICAgZGVsZXRlIHRoaXMuX3JlZnNbc2NoZW1hS2V5UmVmXTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICB2YXIgc2VyaWFsaXplID0gdGhpcy5fb3B0cy5zZXJpYWxpemU7XG4gICAgICB2YXIgY2FjaGVLZXkgPSBzZXJpYWxpemUgPyBzZXJpYWxpemUoc2NoZW1hS2V5UmVmKSA6IHNjaGVtYUtleVJlZjtcbiAgICAgIHRoaXMuX2NhY2hlLmRlbChjYWNoZUtleSk7XG4gICAgICB2YXIgaWQgPSB0aGlzLl9nZXRJZChzY2hlbWFLZXlSZWYpO1xuICAgICAgaWYgKGlkKSB7XG4gICAgICAgIGlkID0gcmVzb2x2ZS5ub3JtYWxpemVJZChpZCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9zY2hlbWFzW2lkXTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3JlZnNbaWRdO1xuICAgICAgfVxuICB9XG4gIHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIF9yZW1vdmVBbGxTY2hlbWFzKHNlbGYsIHNjaGVtYXMsIHJlZ2V4KSB7XG4gIGZvciAodmFyIGtleVJlZiBpbiBzY2hlbWFzKSB7XG4gICAgdmFyIHNjaGVtYU9iaiA9IHNjaGVtYXNba2V5UmVmXTtcbiAgICBpZiAoIXNjaGVtYU9iai5tZXRhICYmICghcmVnZXggfHwgcmVnZXgudGVzdChrZXlSZWYpKSkge1xuICAgICAgc2VsZi5fY2FjaGUuZGVsKHNjaGVtYU9iai5jYWNoZUtleSk7XG4gICAgICBkZWxldGUgc2NoZW1hc1trZXlSZWZdO1xuICAgIH1cbiAgfVxufVxuXG5cbi8qIEB0aGlzICAgQWp2ICovXG5mdW5jdGlvbiBfYWRkU2NoZW1hKHNjaGVtYSwgc2tpcFZhbGlkYXRpb24sIG1ldGEsIHNob3VsZEFkZFNjaGVtYSkge1xuICBpZiAodHlwZW9mIHNjaGVtYSAhPSAnb2JqZWN0JyAmJiB0eXBlb2Ygc2NoZW1hICE9ICdib29sZWFuJylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NjaGVtYSBzaG91bGQgYmUgb2JqZWN0IG9yIGJvb2xlYW4nKTtcbiAgdmFyIHNlcmlhbGl6ZSA9IHRoaXMuX29wdHMuc2VyaWFsaXplO1xuICB2YXIgY2FjaGVLZXkgPSBzZXJpYWxpemUgPyBzZXJpYWxpemUoc2NoZW1hKSA6IHNjaGVtYTtcbiAgdmFyIGNhY2hlZCA9IHRoaXMuX2NhY2hlLmdldChjYWNoZUtleSk7XG4gIGlmIChjYWNoZWQpIHJldHVybiBjYWNoZWQ7XG5cbiAgc2hvdWxkQWRkU2NoZW1hID0gc2hvdWxkQWRkU2NoZW1hIHx8IHRoaXMuX29wdHMuYWRkVXNlZFNjaGVtYSAhPT0gZmFsc2U7XG5cbiAgdmFyIGlkID0gcmVzb2x2ZS5ub3JtYWxpemVJZCh0aGlzLl9nZXRJZChzY2hlbWEpKTtcbiAgaWYgKGlkICYmIHNob3VsZEFkZFNjaGVtYSkgY2hlY2tVbmlxdWUodGhpcywgaWQpO1xuXG4gIHZhciB3aWxsVmFsaWRhdGUgPSB0aGlzLl9vcHRzLnZhbGlkYXRlU2NoZW1hICE9PSBmYWxzZSAmJiAhc2tpcFZhbGlkYXRpb247XG4gIHZhciByZWN1cnNpdmVNZXRhO1xuICBpZiAod2lsbFZhbGlkYXRlICYmICEocmVjdXJzaXZlTWV0YSA9IGlkICYmIGlkID09IHJlc29sdmUubm9ybWFsaXplSWQoc2NoZW1hLiRzY2hlbWEpKSlcbiAgICB0aGlzLnZhbGlkYXRlU2NoZW1hKHNjaGVtYSwgdHJ1ZSk7XG5cbiAgdmFyIGxvY2FsUmVmcyA9IHJlc29sdmUuaWRzLmNhbGwodGhpcywgc2NoZW1hKTtcblxuICB2YXIgc2NoZW1hT2JqID0gbmV3IFNjaGVtYU9iamVjdCh7XG4gICAgaWQ6IGlkLFxuICAgIHNjaGVtYTogc2NoZW1hLFxuICAgIGxvY2FsUmVmczogbG9jYWxSZWZzLFxuICAgIGNhY2hlS2V5OiBjYWNoZUtleSxcbiAgICBtZXRhOiBtZXRhXG4gIH0pO1xuXG4gIGlmIChpZFswXSAhPSAnIycgJiYgc2hvdWxkQWRkU2NoZW1hKSB0aGlzLl9yZWZzW2lkXSA9IHNjaGVtYU9iajtcbiAgdGhpcy5fY2FjaGUucHV0KGNhY2hlS2V5LCBzY2hlbWFPYmopO1xuXG4gIGlmICh3aWxsVmFsaWRhdGUgJiYgcmVjdXJzaXZlTWV0YSkgdGhpcy52YWxpZGF0ZVNjaGVtYShzY2hlbWEsIHRydWUpO1xuXG4gIHJldHVybiBzY2hlbWFPYmo7XG59XG5cblxuLyogQHRoaXMgICBBanYgKi9cbmZ1bmN0aW9uIF9jb21waWxlKHNjaGVtYU9iaiwgcm9vdCkge1xuICBpZiAoc2NoZW1hT2JqLmNvbXBpbGluZykge1xuICAgIHNjaGVtYU9iai52YWxpZGF0ZSA9IGNhbGxWYWxpZGF0ZTtcbiAgICBjYWxsVmFsaWRhdGUuc2NoZW1hID0gc2NoZW1hT2JqLnNjaGVtYTtcbiAgICBjYWxsVmFsaWRhdGUuZXJyb3JzID0gbnVsbDtcbiAgICBjYWxsVmFsaWRhdGUucm9vdCA9IHJvb3QgPyByb290IDogY2FsbFZhbGlkYXRlO1xuICAgIGlmIChzY2hlbWFPYmouc2NoZW1hLiRhc3luYyA9PT0gdHJ1ZSlcbiAgICAgIGNhbGxWYWxpZGF0ZS4kYXN5bmMgPSB0cnVlO1xuICAgIHJldHVybiBjYWxsVmFsaWRhdGU7XG4gIH1cbiAgc2NoZW1hT2JqLmNvbXBpbGluZyA9IHRydWU7XG5cbiAgdmFyIGN1cnJlbnRPcHRzO1xuICBpZiAoc2NoZW1hT2JqLm1ldGEpIHtcbiAgICBjdXJyZW50T3B0cyA9IHRoaXMuX29wdHM7XG4gICAgdGhpcy5fb3B0cyA9IHRoaXMuX21ldGFPcHRzO1xuICB9XG5cbiAgdmFyIHY7XG4gIHRyeSB7IHYgPSBjb21waWxlU2NoZW1hLmNhbGwodGhpcywgc2NoZW1hT2JqLnNjaGVtYSwgcm9vdCwgc2NoZW1hT2JqLmxvY2FsUmVmcyk7IH1cbiAgY2F0Y2goZSkge1xuICAgIGRlbGV0ZSBzY2hlbWFPYmoudmFsaWRhdGU7XG4gICAgdGhyb3cgZTtcbiAgfVxuICBmaW5hbGx5IHtcbiAgICBzY2hlbWFPYmouY29tcGlsaW5nID0gZmFsc2U7XG4gICAgaWYgKHNjaGVtYU9iai5tZXRhKSB0aGlzLl9vcHRzID0gY3VycmVudE9wdHM7XG4gIH1cblxuICBzY2hlbWFPYmoudmFsaWRhdGUgPSB2O1xuICBzY2hlbWFPYmoucmVmcyA9IHYucmVmcztcbiAgc2NoZW1hT2JqLnJlZlZhbCA9IHYucmVmVmFsO1xuICBzY2hlbWFPYmoucm9vdCA9IHYucm9vdDtcbiAgcmV0dXJuIHY7XG5cblxuICAvKiBAdGhpcyAgIHsqfSAtIGN1c3RvbSBjb250ZXh0LCBzZWUgcGFzc0NvbnRleHQgb3B0aW9uICovXG4gIGZ1bmN0aW9uIGNhbGxWYWxpZGF0ZSgpIHtcbiAgICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIF92YWxpZGF0ZSA9IHNjaGVtYU9iai52YWxpZGF0ZTtcbiAgICB2YXIgcmVzdWx0ID0gX3ZhbGlkYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgY2FsbFZhbGlkYXRlLmVycm9ycyA9IF92YWxpZGF0ZS5lcnJvcnM7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGNob29zZUdldElkKG9wdHMpIHtcbiAgc3dpdGNoIChvcHRzLnNjaGVtYUlkKSB7XG4gICAgY2FzZSAnYXV0byc6IHJldHVybiBfZ2V0JElkT3JJZDtcbiAgICBjYXNlICdpZCc6IHJldHVybiBfZ2V0SWQ7XG4gICAgZGVmYXVsdDogcmV0dXJuIF9nZXQkSWQ7XG4gIH1cbn1cblxuLyogQHRoaXMgICBBanYgKi9cbmZ1bmN0aW9uIF9nZXRJZChzY2hlbWEpIHtcbiAgaWYgKHNjaGVtYS4kaWQpIHRoaXMubG9nZ2VyLndhcm4oJ3NjaGVtYSAkaWQgaWdub3JlZCcsIHNjaGVtYS4kaWQpO1xuICByZXR1cm4gc2NoZW1hLmlkO1xufVxuXG4vKiBAdGhpcyAgIEFqdiAqL1xuZnVuY3Rpb24gX2dldCRJZChzY2hlbWEpIHtcbiAgaWYgKHNjaGVtYS5pZCkgdGhpcy5sb2dnZXIud2Fybignc2NoZW1hIGlkIGlnbm9yZWQnLCBzY2hlbWEuaWQpO1xuICByZXR1cm4gc2NoZW1hLiRpZDtcbn1cblxuXG5mdW5jdGlvbiBfZ2V0JElkT3JJZChzY2hlbWEpIHtcbiAgaWYgKHNjaGVtYS4kaWQgJiYgc2NoZW1hLmlkICYmIHNjaGVtYS4kaWQgIT0gc2NoZW1hLmlkKVxuICAgIHRocm93IG5ldyBFcnJvcignc2NoZW1hICRpZCBpcyBkaWZmZXJlbnQgZnJvbSBpZCcpO1xuICByZXR1cm4gc2NoZW1hLiRpZCB8fCBzY2hlbWEuaWQ7XG59XG5cblxuLyoqXG4gKiBDb252ZXJ0IGFycmF5IG9mIGVycm9yIG1lc3NhZ2Ugb2JqZWN0cyB0byBzdHJpbmdcbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0gIHtBcnJheTxPYmplY3Q+fSBlcnJvcnMgb3B0aW9uYWwgYXJyYXkgb2YgdmFsaWRhdGlvbiBlcnJvcnMsIGlmIG5vdCBwYXNzZWQgZXJyb3JzIGZyb20gdGhlIGluc3RhbmNlIGFyZSB1c2VkLlxuICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zIG9wdGlvbmFsIG9wdGlvbnMgd2l0aCBwcm9wZXJ0aWVzIGBzZXBhcmF0b3JgIGFuZCBgZGF0YVZhcmAuXG4gKiBAcmV0dXJuIHtTdHJpbmd9IGh1bWFuIHJlYWRhYmxlIHN0cmluZyB3aXRoIGFsbCBlcnJvcnMgZGVzY3JpcHRpb25zXG4gKi9cbmZ1bmN0aW9uIGVycm9yc1RleHQoZXJyb3JzLCBvcHRpb25zKSB7XG4gIGVycm9ycyA9IGVycm9ycyB8fCB0aGlzLmVycm9ycztcbiAgaWYgKCFlcnJvcnMpIHJldHVybiAnTm8gZXJyb3JzJztcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBzZXBhcmF0b3IgPSBvcHRpb25zLnNlcGFyYXRvciA9PT0gdW5kZWZpbmVkID8gJywgJyA6IG9wdGlvbnMuc2VwYXJhdG9yO1xuICB2YXIgZGF0YVZhciA9IG9wdGlvbnMuZGF0YVZhciA9PT0gdW5kZWZpbmVkID8gJ2RhdGEnIDogb3B0aW9ucy5kYXRhVmFyO1xuXG4gIHZhciB0ZXh0ID0gJyc7XG4gIGZvciAodmFyIGk9MDsgaTxlcnJvcnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgZSA9IGVycm9yc1tpXTtcbiAgICBpZiAoZSkgdGV4dCArPSBkYXRhVmFyICsgZS5kYXRhUGF0aCArICcgJyArIGUubWVzc2FnZSArIHNlcGFyYXRvcjtcbiAgfVxuICByZXR1cm4gdGV4dC5zbGljZSgwLCAtc2VwYXJhdG9yLmxlbmd0aCk7XG59XG5cblxuLyoqXG4gKiBBZGQgY3VzdG9tIGZvcm1hdFxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIGZvcm1hdCBuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ3xSZWdFeHB8RnVuY3Rpb259IGZvcm1hdCBzdHJpbmcgaXMgY29udmVydGVkIHRvIFJlZ0V4cDsgZnVuY3Rpb24gc2hvdWxkIHJldHVybiBib29sZWFuICh0cnVlIHdoZW4gdmFsaWQpXG4gKiBAcmV0dXJuIHtBanZ9IHRoaXMgZm9yIG1ldGhvZCBjaGFpbmluZ1xuICovXG5mdW5jdGlvbiBhZGRGb3JtYXQobmFtZSwgZm9ybWF0KSB7XG4gIGlmICh0eXBlb2YgZm9ybWF0ID09ICdzdHJpbmcnKSBmb3JtYXQgPSBuZXcgUmVnRXhwKGZvcm1hdCk7XG4gIHRoaXMuX2Zvcm1hdHNbbmFtZV0gPSBmb3JtYXQ7XG4gIHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIGFkZERlZmF1bHRNZXRhU2NoZW1hKHNlbGYpIHtcbiAgdmFyICRkYXRhU2NoZW1hO1xuICBpZiAoc2VsZi5fb3B0cy4kZGF0YSkge1xuICAgICRkYXRhU2NoZW1hID0gcmVxdWlyZSgnLi9yZWZzL2RhdGEuanNvbicpO1xuICAgIHNlbGYuYWRkTWV0YVNjaGVtYSgkZGF0YVNjaGVtYSwgJGRhdGFTY2hlbWEuJGlkLCB0cnVlKTtcbiAgfVxuICBpZiAoc2VsZi5fb3B0cy5tZXRhID09PSBmYWxzZSkgcmV0dXJuO1xuICB2YXIgbWV0YVNjaGVtYSA9IHJlcXVpcmUoJy4vcmVmcy9qc29uLXNjaGVtYS1kcmFmdC0wNy5qc29uJyk7XG4gIGlmIChzZWxmLl9vcHRzLiRkYXRhKSBtZXRhU2NoZW1hID0gJGRhdGFNZXRhU2NoZW1hKG1ldGFTY2hlbWEsIE1FVEFfU1VQUE9SVF9EQVRBKTtcbiAgc2VsZi5hZGRNZXRhU2NoZW1hKG1ldGFTY2hlbWEsIE1FVEFfU0NIRU1BX0lELCB0cnVlKTtcbiAgc2VsZi5fcmVmc1snaHR0cDovL2pzb24tc2NoZW1hLm9yZy9zY2hlbWEnXSA9IE1FVEFfU0NIRU1BX0lEO1xufVxuXG5cbmZ1bmN0aW9uIGFkZEluaXRpYWxTY2hlbWFzKHNlbGYpIHtcbiAgdmFyIG9wdHNTY2hlbWFzID0gc2VsZi5fb3B0cy5zY2hlbWFzO1xuICBpZiAoIW9wdHNTY2hlbWFzKSByZXR1cm47XG4gIGlmIChBcnJheS5pc0FycmF5KG9wdHNTY2hlbWFzKSkgc2VsZi5hZGRTY2hlbWEob3B0c1NjaGVtYXMpO1xuICBlbHNlIGZvciAodmFyIGtleSBpbiBvcHRzU2NoZW1hcykgc2VsZi5hZGRTY2hlbWEob3B0c1NjaGVtYXNba2V5XSwga2V5KTtcbn1cblxuXG5mdW5jdGlvbiBhZGRJbml0aWFsRm9ybWF0cyhzZWxmKSB7XG4gIGZvciAodmFyIG5hbWUgaW4gc2VsZi5fb3B0cy5mb3JtYXRzKSB7XG4gICAgdmFyIGZvcm1hdCA9IHNlbGYuX29wdHMuZm9ybWF0c1tuYW1lXTtcbiAgICBzZWxmLmFkZEZvcm1hdChuYW1lLCBmb3JtYXQpO1xuICB9XG59XG5cblxuZnVuY3Rpb24gYWRkSW5pdGlhbEtleXdvcmRzKHNlbGYpIHtcbiAgZm9yICh2YXIgbmFtZSBpbiBzZWxmLl9vcHRzLmtleXdvcmRzKSB7XG4gICAgdmFyIGtleXdvcmQgPSBzZWxmLl9vcHRzLmtleXdvcmRzW25hbWVdO1xuICAgIHNlbGYuYWRkS2V5d29yZChuYW1lLCBrZXl3b3JkKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGNoZWNrVW5pcXVlKHNlbGYsIGlkKSB7XG4gIGlmIChzZWxmLl9zY2hlbWFzW2lkXSB8fCBzZWxmLl9yZWZzW2lkXSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NjaGVtYSB3aXRoIGtleSBvciBpZCBcIicgKyBpZCArICdcIiBhbHJlYWR5IGV4aXN0cycpO1xufVxuXG5cbmZ1bmN0aW9uIGdldE1ldGFTY2hlbWFPcHRpb25zKHNlbGYpIHtcbiAgdmFyIG1ldGFPcHRzID0gdXRpbC5jb3B5KHNlbGYuX29wdHMpO1xuICBmb3IgKHZhciBpPTA7IGk8TUVUQV9JR05PUkVfT1BUSU9OUy5sZW5ndGg7IGkrKylcbiAgICBkZWxldGUgbWV0YU9wdHNbTUVUQV9JR05PUkVfT1BUSU9OU1tpXV07XG4gIHJldHVybiBtZXRhT3B0cztcbn1cblxuXG5mdW5jdGlvbiBzZXRMb2dnZXIoc2VsZikge1xuICB2YXIgbG9nZ2VyID0gc2VsZi5fb3B0cy5sb2dnZXI7XG4gIGlmIChsb2dnZXIgPT09IGZhbHNlKSB7XG4gICAgc2VsZi5sb2dnZXIgPSB7bG9nOiBub29wLCB3YXJuOiBub29wLCBlcnJvcjogbm9vcH07XG4gIH0gZWxzZSB7XG4gICAgaWYgKGxvZ2dlciA9PT0gdW5kZWZpbmVkKSBsb2dnZXIgPSBjb25zb2xlO1xuICAgIGlmICghKHR5cGVvZiBsb2dnZXIgPT0gJ29iamVjdCcgJiYgbG9nZ2VyLmxvZyAmJiBsb2dnZXIud2FybiAmJiBsb2dnZXIuZXJyb3IpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdsb2dnZXIgbXVzdCBpbXBsZW1lbnQgbG9nLCB3YXJuIGFuZCBlcnJvciBtZXRob2RzJyk7XG4gICAgc2VsZi5sb2dnZXIgPSBsb2dnZXI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBub29wKCkge31cbiIsIid1c2Ugc3RyaWN0JztcblxuXG52YXIgQ2FjaGUgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIENhY2hlKCkge1xuICB0aGlzLl9jYWNoZSA9IHt9O1xufTtcblxuXG5DYWNoZS5wcm90b3R5cGUucHV0ID0gZnVuY3Rpb24gQ2FjaGVfcHV0KGtleSwgdmFsdWUpIHtcbiAgdGhpcy5fY2FjaGVba2V5XSA9IHZhbHVlO1xufTtcblxuXG5DYWNoZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gQ2FjaGVfZ2V0KGtleSkge1xuICByZXR1cm4gdGhpcy5fY2FjaGVba2V5XTtcbn07XG5cblxuQ2FjaGUucHJvdG90eXBlLmRlbCA9IGZ1bmN0aW9uIENhY2hlX2RlbChrZXkpIHtcbiAgZGVsZXRlIHRoaXMuX2NhY2hlW2tleV07XG59O1xuXG5cbkNhY2hlLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uIENhY2hlX2NsZWFyKCkge1xuICB0aGlzLl9jYWNoZSA9IHt9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1pc3NpbmdSZWZFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3JfY2xhc3NlcycpLk1pc3NpbmdSZWY7XG5cbm1vZHVsZS5leHBvcnRzID0gY29tcGlsZUFzeW5jO1xuXG5cbi8qKlxuICogQ3JlYXRlcyB2YWxpZGF0aW5nIGZ1bmN0aW9uIGZvciBwYXNzZWQgc2NoZW1hIHdpdGggYXN5bmNocm9ub3VzIGxvYWRpbmcgb2YgbWlzc2luZyBzY2hlbWFzLlxuICogYGxvYWRTY2hlbWFgIG9wdGlvbiBzaG91bGQgYmUgYSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgc2NoZW1hIHVyaSBhbmQgcmV0dXJucyBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2l0aCB0aGUgc2NoZW1hLlxuICogQHRoaXMgIEFqdlxuICogQHBhcmFtIHtPYmplY3R9ICAgc2NoZW1hIHNjaGVtYSBvYmplY3RcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gIG1ldGEgb3B0aW9uYWwgdHJ1ZSB0byBjb21waWxlIG1ldGEtc2NoZW1hOyB0aGlzIHBhcmFtZXRlciBjYW4gYmUgc2tpcHBlZFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgYW4gb3B0aW9uYWwgbm9kZS1zdHlsZSBjYWxsYmFjaywgaXQgaXMgY2FsbGVkIHdpdGggMiBwYXJhbWV0ZXJzOiBlcnJvciAob3IgbnVsbCkgYW5kIHZhbGlkYXRpbmcgZnVuY3Rpb24uXG4gKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2l0aCBhIHZhbGlkYXRpbmcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGVBc3luYyhzY2hlbWEsIG1ldGEsIGNhbGxiYWNrKSB7XG4gIC8qIGVzbGludCBuby1zaGFkb3c6IDAgKi9cbiAgLyogZ2xvYmFsIFByb21pc2UgKi9cbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICh0eXBlb2YgdGhpcy5fb3B0cy5sb2FkU2NoZW1hICE9ICdmdW5jdGlvbicpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdvcHRpb25zLmxvYWRTY2hlbWEgc2hvdWxkIGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAodHlwZW9mIG1ldGEgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gbWV0YTtcbiAgICBtZXRhID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdmFyIHAgPSBsb2FkTWV0YVNjaGVtYU9mKHNjaGVtYSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNjaGVtYU9iaiA9IHNlbGYuX2FkZFNjaGVtYShzY2hlbWEsIHVuZGVmaW5lZCwgbWV0YSk7XG4gICAgcmV0dXJuIHNjaGVtYU9iai52YWxpZGF0ZSB8fCBfY29tcGlsZUFzeW5jKHNjaGVtYU9iaik7XG4gIH0pO1xuXG4gIGlmIChjYWxsYmFjaykge1xuICAgIHAudGhlbihcbiAgICAgIGZ1bmN0aW9uKHYpIHsgY2FsbGJhY2sobnVsbCwgdik7IH0sXG4gICAgICBjYWxsYmFja1xuICAgICk7XG4gIH1cblxuICByZXR1cm4gcDtcblxuXG4gIGZ1bmN0aW9uIGxvYWRNZXRhU2NoZW1hT2Yoc2NoKSB7XG4gICAgdmFyICRzY2hlbWEgPSBzY2guJHNjaGVtYTtcbiAgICByZXR1cm4gJHNjaGVtYSAmJiAhc2VsZi5nZXRTY2hlbWEoJHNjaGVtYSlcbiAgICAgICAgICAgID8gY29tcGlsZUFzeW5jLmNhbGwoc2VsZiwgeyAkcmVmOiAkc2NoZW1hIH0sIHRydWUpXG4gICAgICAgICAgICA6IFByb21pc2UucmVzb2x2ZSgpO1xuICB9XG5cblxuICBmdW5jdGlvbiBfY29tcGlsZUFzeW5jKHNjaGVtYU9iaikge1xuICAgIHRyeSB7IHJldHVybiBzZWxmLl9jb21waWxlKHNjaGVtYU9iaik7IH1cbiAgICBjYXRjaChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIE1pc3NpbmdSZWZFcnJvcikgcmV0dXJuIGxvYWRNaXNzaW5nU2NoZW1hKGUpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGxvYWRNaXNzaW5nU2NoZW1hKGUpIHtcbiAgICAgIHZhciByZWYgPSBlLm1pc3NpbmdTY2hlbWE7XG4gICAgICBpZiAoYWRkZWQocmVmKSkgdGhyb3cgbmV3IEVycm9yKCdTY2hlbWEgJyArIHJlZiArICcgaXMgbG9hZGVkIGJ1dCAnICsgZS5taXNzaW5nUmVmICsgJyBjYW5ub3QgYmUgcmVzb2x2ZWQnKTtcblxuICAgICAgdmFyIHNjaGVtYVByb21pc2UgPSBzZWxmLl9sb2FkaW5nU2NoZW1hc1tyZWZdO1xuICAgICAgaWYgKCFzY2hlbWFQcm9taXNlKSB7XG4gICAgICAgIHNjaGVtYVByb21pc2UgPSBzZWxmLl9sb2FkaW5nU2NoZW1hc1tyZWZdID0gc2VsZi5fb3B0cy5sb2FkU2NoZW1hKHJlZik7XG4gICAgICAgIHNjaGVtYVByb21pc2UudGhlbihyZW1vdmVQcm9taXNlLCByZW1vdmVQcm9taXNlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNjaGVtYVByb21pc2UudGhlbihmdW5jdGlvbiAoc2NoKSB7XG4gICAgICAgIGlmICghYWRkZWQocmVmKSkge1xuICAgICAgICAgIHJldHVybiBsb2FkTWV0YVNjaGVtYU9mKHNjaCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIWFkZGVkKHJlZikpIHNlbGYuYWRkU2NoZW1hKHNjaCwgcmVmLCB1bmRlZmluZWQsIG1ldGEpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2NvbXBpbGVBc3luYyhzY2hlbWFPYmopO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIHJlbW92ZVByb21pc2UoKSB7XG4gICAgICAgIGRlbGV0ZSBzZWxmLl9sb2FkaW5nU2NoZW1hc1tyZWZdO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBhZGRlZChyZWYpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuX3JlZnNbcmVmXSB8fCBzZWxmLl9zY2hlbWFzW3JlZl07XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciByZXNvbHZlID0gcmVxdWlyZSgnLi9yZXNvbHZlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBWYWxpZGF0aW9uOiBlcnJvclN1YmNsYXNzKFZhbGlkYXRpb25FcnJvciksXG4gIE1pc3NpbmdSZWY6IGVycm9yU3ViY2xhc3MoTWlzc2luZ1JlZkVycm9yKVxufTtcblxuXG5mdW5jdGlvbiBWYWxpZGF0aW9uRXJyb3IoZXJyb3JzKSB7XG4gIHRoaXMubWVzc2FnZSA9ICd2YWxpZGF0aW9uIGZhaWxlZCc7XG4gIHRoaXMuZXJyb3JzID0gZXJyb3JzO1xuICB0aGlzLmFqdiA9IHRoaXMudmFsaWRhdGlvbiA9IHRydWU7XG59XG5cblxuTWlzc2luZ1JlZkVycm9yLm1lc3NhZ2UgPSBmdW5jdGlvbiAoYmFzZUlkLCByZWYpIHtcbiAgcmV0dXJuICdjYW5cXCd0IHJlc29sdmUgcmVmZXJlbmNlICcgKyByZWYgKyAnIGZyb20gaWQgJyArIGJhc2VJZDtcbn07XG5cblxuZnVuY3Rpb24gTWlzc2luZ1JlZkVycm9yKGJhc2VJZCwgcmVmLCBtZXNzYWdlKSB7XG4gIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2UgfHwgTWlzc2luZ1JlZkVycm9yLm1lc3NhZ2UoYmFzZUlkLCByZWYpO1xuICB0aGlzLm1pc3NpbmdSZWYgPSByZXNvbHZlLnVybChiYXNlSWQsIHJlZik7XG4gIHRoaXMubWlzc2luZ1NjaGVtYSA9IHJlc29sdmUubm9ybWFsaXplSWQocmVzb2x2ZS5mdWxsUGF0aCh0aGlzLm1pc3NpbmdSZWYpKTtcbn1cblxuXG5mdW5jdGlvbiBlcnJvclN1YmNsYXNzKFN1YmNsYXNzKSB7XG4gIFN1YmNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbiAgU3ViY2xhc3MucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3ViY2xhc3M7XG4gIHJldHVybiBTdWJjbGFzcztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIERBVEUgPSAvXihcXGRcXGRcXGRcXGQpLShcXGRcXGQpLShcXGRcXGQpJC87XG52YXIgREFZUyA9IFswLDMxLDI4LDMxLDMwLDMxLDMwLDMxLDMxLDMwLDMxLDMwLDMxXTtcbnZhciBUSU1FID0gL14oXFxkXFxkKTooXFxkXFxkKTooXFxkXFxkKShcXC5cXGQrKT8oenxbKy1dXFxkXFxkKD86Oj9cXGRcXGQpPyk/JC9pO1xudmFyIEhPU1ROQU1FID0gL14oPz0uezEsMjUzfVxcLj8kKVthLXowLTldKD86W2EtejAtOS1dezAsNjF9W2EtejAtOV0pPyg/OlxcLlthLXowLTldKD86Wy0wLTlhLXpdezAsNjF9WzAtOWEtel0pPykqXFwuPyQvaTtcbnZhciBVUkkgPSAvXig/OlthLXpdW2EtejAtOStcXC0uXSo6KSg/OlxcLz9cXC8oPzooPzpbYS16MC05XFwtLl9+ISQmJygpKissOz06XXwlWzAtOWEtZl17Mn0pKkApPyg/OlxcWyg/Oig/Oig/Oig/OlswLTlhLWZdezEsNH06KXs2fXw6Oig/OlswLTlhLWZdezEsNH06KXs1fXwoPzpbMC05YS1mXXsxLDR9KT86Oig/OlswLTlhLWZdezEsNH06KXs0fXwoPzooPzpbMC05YS1mXXsxLDR9Oil7MCwxfVswLTlhLWZdezEsNH0pPzo6KD86WzAtOWEtZl17MSw0fTopezN9fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDJ9WzAtOWEtZl17MSw0fSk/OjooPzpbMC05YS1mXXsxLDR9Oil7Mn18KD86KD86WzAtOWEtZl17MSw0fTopezAsM31bMC05YS1mXXsxLDR9KT86OlswLTlhLWZdezEsNH06fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDR9WzAtOWEtZl17MSw0fSk/OjopKD86WzAtOWEtZl17MSw0fTpbMC05YS1mXXsxLDR9fCg/Oig/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPylcXC4pezN9KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KSl8KD86KD86WzAtOWEtZl17MSw0fTopezAsNX1bMC05YS1mXXsxLDR9KT86OlswLTlhLWZdezEsNH18KD86KD86WzAtOWEtZl17MSw0fTopezAsNn1bMC05YS1mXXsxLDR9KT86Oil8W1Z2XVswLTlhLWZdK1xcLlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpdKylcXF18KD86KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KVxcLil7M30oPzoyNVswLTVdfDJbMC00XVxcZHxbMDFdP1xcZFxcZD8pfCg/OlthLXowLTlcXC0uX34hJCYnKCkqKyw7PV18JVswLTlhLWZdezJ9KSopKD86OlxcZCopPyg/OlxcLyg/OlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKikqfFxcLyg/Oig/OlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKyg/OlxcLyg/OlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKikqKT98KD86W2EtejAtOVxcLS5ffiEkJicoKSorLDs9OkBdfCVbMC05YS1mXXsyfSkrKD86XFwvKD86W2EtejAtOVxcLS5ffiEkJicoKSorLDs9OkBdfCVbMC05YS1mXXsyfSkqKSopKD86XFw/KD86W2EtejAtOVxcLS5ffiEkJicoKSorLDs9OkAvP118JVswLTlhLWZdezJ9KSopPyg/OiMoPzpbYS16MC05XFwtLl9+ISQmJygpKissOz06QC8/XXwlWzAtOWEtZl17Mn0pKik/JC9pO1xudmFyIFVSSVJFRiA9IC9eKD86W2Etel1bYS16MC05K1xcLS5dKjopPyg/OlxcLz9cXC8oPzooPzpbYS16MC05XFwtLl9+ISQmJygpKissOz06XXwlWzAtOWEtZl17Mn0pKkApPyg/OlxcWyg/Oig/Oig/Oig/OlswLTlhLWZdezEsNH06KXs2fXw6Oig/OlswLTlhLWZdezEsNH06KXs1fXwoPzpbMC05YS1mXXsxLDR9KT86Oig/OlswLTlhLWZdezEsNH06KXs0fXwoPzooPzpbMC05YS1mXXsxLDR9Oil7MCwxfVswLTlhLWZdezEsNH0pPzo6KD86WzAtOWEtZl17MSw0fTopezN9fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDJ9WzAtOWEtZl17MSw0fSk/OjooPzpbMC05YS1mXXsxLDR9Oil7Mn18KD86KD86WzAtOWEtZl17MSw0fTopezAsM31bMC05YS1mXXsxLDR9KT86OlswLTlhLWZdezEsNH06fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDR9WzAtOWEtZl17MSw0fSk/OjopKD86WzAtOWEtZl17MSw0fTpbMC05YS1mXXsxLDR9fCg/Oig/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPylcXC4pezN9KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KSl8KD86KD86WzAtOWEtZl17MSw0fTopezAsNX1bMC05YS1mXXsxLDR9KT86OlswLTlhLWZdezEsNH18KD86KD86WzAtOWEtZl17MSw0fTopezAsNn1bMC05YS1mXXsxLDR9KT86Oil8W1Z2XVswLTlhLWZdK1xcLlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpdKylcXF18KD86KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KVxcLil7M30oPzoyNVswLTVdfDJbMC00XVxcZHxbMDFdP1xcZFxcZD8pfCg/OlthLXowLTlcXC0uX34hJCYnXCIoKSorLDs9XXwlWzAtOWEtZl17Mn0pKikoPzo6XFxkKik/KD86XFwvKD86W2EtejAtOVxcLS5ffiEkJidcIigpKissOz06QF18JVswLTlhLWZdezJ9KSopKnxcXC8oPzooPzpbYS16MC05XFwtLl9+ISQmJ1wiKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKyg/OlxcLyg/OlthLXowLTlcXC0uX34hJCYnXCIoKSorLDs9OkBdfCVbMC05YS1mXXsyfSkqKSopP3woPzpbYS16MC05XFwtLl9+ISQmJ1wiKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKyg/OlxcLyg/OlthLXowLTlcXC0uX34hJCYnXCIoKSorLDs9OkBdfCVbMC05YS1mXXsyfSkqKSopPyg/OlxcPyg/OlthLXowLTlcXC0uX34hJCYnXCIoKSorLDs9OkAvP118JVswLTlhLWZdezJ9KSopPyg/OiMoPzpbYS16MC05XFwtLl9+ISQmJ1wiKCkqKyw7PTpALz9dfCVbMC05YS1mXXsyfSkqKT8kL2k7XG4vLyB1cmktdGVtcGxhdGU6IGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2NTcwXG52YXIgVVJJVEVNUExBVEUgPSAvXig/Oig/OlteXFx4MDAtXFx4MjBcIic8PiVcXFxcXmB7fH1dfCVbMC05YS1mXXsyfSl8XFx7WysjLi87PyY9LCFAfF0/KD86W2EtejAtOV9dfCVbMC05YS1mXXsyfSkrKD86OlsxLTldWzAtOV17MCwzfXxcXCopPyg/OiwoPzpbYS16MC05X118JVswLTlhLWZdezJ9KSsoPzo6WzEtOV1bMC05XXswLDN9fFxcKik/KSpcXH0pKiQvaTtcbi8vIEZvciB0aGUgc291cmNlOiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9kcGVyaW5pLzcyOTI5NFxuLy8gRm9yIHRlc3QgY2FzZXM6IGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9kZW1vL3VybC1yZWdleFxuLy8gQHRvZG8gRGVsZXRlIGN1cnJlbnQgVVJMIGluIGZhdm91ciBvZiB0aGUgY29tbWVudGVkIG91dCBVUkwgcnVsZSB3aGVuIHRoaXMgaXNzdWUgaXMgZml4ZWQgaHR0cHM6Ly9naXRodWIuY29tL2VzbGludC9lc2xpbnQvaXNzdWVzLzc5ODMuXG4vLyB2YXIgVVJMID0gL14oPzooPzpodHRwcz98ZnRwKTpcXC9cXC8pKD86XFxTKyg/OjpcXFMqKT9AKT8oPzooPyExMCg/OlxcLlxcZHsxLDN9KXszfSkoPyExMjcoPzpcXC5cXGR7MSwzfSl7M30pKD8hMTY5XFwuMjU0KD86XFwuXFxkezEsM30pezJ9KSg/ITE5MlxcLjE2OCg/OlxcLlxcZHsxLDN9KXsyfSkoPyExNzJcXC4oPzoxWzYtOV18MlxcZHwzWzAtMV0pKD86XFwuXFxkezEsM30pezJ9KSg/OlsxLTldXFxkP3wxXFxkXFxkfDJbMDFdXFxkfDIyWzAtM10pKD86XFwuKD86MT9cXGR7MSwyfXwyWzAtNF1cXGR8MjVbMC01XSkpezJ9KD86XFwuKD86WzEtOV1cXGQ/fDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNF0pKXwoPzooPzpbYS16XFx1ezAwYTF9LVxcdXtmZmZmfTAtOV0rLSkqW2EtelxcdXswMGExfS1cXHV7ZmZmZn0wLTldKykoPzpcXC4oPzpbYS16XFx1ezAwYTF9LVxcdXtmZmZmfTAtOV0rLSkqW2EtelxcdXswMGExfS1cXHV7ZmZmZn0wLTldKykqKD86XFwuKD86W2EtelxcdXswMGExfS1cXHV7ZmZmZn1dezIsfSkpKSg/OjpcXGR7Miw1fSk/KD86XFwvW15cXHNdKik/JC9pdTtcbnZhciBVUkwgPSAvXig/Oig/Omh0dHBbc1xcdTAxN0ZdP3xmdHApOlxcL1xcLykoPzooPzpbXFwwLVxceDA4XFx4MEUtXFx4MUYhLVxceDlGXFx4QTEtXFx1MTY3RlxcdTE2ODEtXFx1MUZGRlxcdTIwMEItXFx1MjAyN1xcdTIwMkEtXFx1MjAyRVxcdTIwMzAtXFx1MjA1RVxcdTIwNjAtXFx1MkZGRlxcdTMwMDEtXFx1RDdGRlxcdUUwMDAtXFx1RkVGRVxcdUZGMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl1bXFx1REMwMC1cXHVERkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkrKD86Oig/OltcXDAtXFx4MDhcXHgwRS1cXHgxRiEtXFx4OUZcXHhBMS1cXHUxNjdGXFx1MTY4MS1cXHUxRkZGXFx1MjAwQi1cXHUyMDI3XFx1MjAyQS1cXHUyMDJFXFx1MjAzMC1cXHUyMDVFXFx1MjA2MC1cXHUyRkZGXFx1MzAwMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRUZFXFx1RkYwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXVtcXHVEQzAwLVxcdURGRkZdfFtcXHVEODAwLVxcdURCRkZdKD8hW1xcdURDMDAtXFx1REZGRl0pfCg/OlteXFx1RDgwMC1cXHVEQkZGXXxeKVtcXHVEQzAwLVxcdURGRkZdKSopP0ApPyg/Oig/ITEwKD86XFwuWzAtOV17MSwzfSl7M30pKD8hMTI3KD86XFwuWzAtOV17MSwzfSl7M30pKD8hMTY5XFwuMjU0KD86XFwuWzAtOV17MSwzfSl7Mn0pKD8hMTkyXFwuMTY4KD86XFwuWzAtOV17MSwzfSl7Mn0pKD8hMTcyXFwuKD86MVs2LTldfDJbMC05XXwzWzAxXSkoPzpcXC5bMC05XXsxLDN9KXsyfSkoPzpbMS05XVswLTldP3wxWzAtOV1bMC05XXwyWzAxXVswLTldfDIyWzAtM10pKD86XFwuKD86MT9bMC05XXsxLDJ9fDJbMC00XVswLTldfDI1WzAtNV0pKXsyfSg/OlxcLig/OlsxLTldWzAtOV0/fDFbMC05XVswLTldfDJbMC00XVswLTldfDI1WzAtNF0pKXwoPzooPzooPzpbMC05YS16XFx4QTEtXFx1RDdGRlxcdUUwMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl0oPyFbXFx1REMwMC1cXHVERkZGXSl8KD86W15cXHVEODAwLVxcdURCRkZdfF4pW1xcdURDMDAtXFx1REZGRl0pKy0pKig/OlswLTlhLXpcXHhBMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkrKSg/OlxcLig/Oig/OlswLTlhLXpcXHhBMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkrLSkqKD86WzAtOWEtelxceEExLVxcdUQ3RkZcXHVFMDAwLVxcdUZGRkZdfFtcXHVEODAwLVxcdURCRkZdKD8hW1xcdURDMDAtXFx1REZGRl0pfCg/OlteXFx1RDgwMC1cXHVEQkZGXXxeKVtcXHVEQzAwLVxcdURGRkZdKSspKig/OlxcLig/Oig/OlthLXpcXHhBMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSl7Mix9KSkpKD86OlswLTldezIsNX0pPyg/OlxcLyg/OltcXDAtXFx4MDhcXHgwRS1cXHgxRiEtXFx4OUZcXHhBMS1cXHUxNjdGXFx1MTY4MS1cXHUxRkZGXFx1MjAwQi1cXHUyMDI3XFx1MjAyQS1cXHUyMDJFXFx1MjAzMC1cXHUyMDVFXFx1MjA2MC1cXHUyRkZGXFx1MzAwMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRUZFXFx1RkYwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXVtcXHVEQzAwLVxcdURGRkZdfFtcXHVEODAwLVxcdURCRkZdKD8hW1xcdURDMDAtXFx1REZGRl0pfCg/OlteXFx1RDgwMC1cXHVEQkZGXXxeKVtcXHVEQzAwLVxcdURGRkZdKSopPyQvaTtcbnZhciBVVUlEID0gL14oPzp1cm46dXVpZDopP1swLTlhLWZdezh9LSg/OlswLTlhLWZdezR9LSl7M31bMC05YS1mXXsxMn0kL2k7XG52YXIgSlNPTl9QT0lOVEVSID0gL14oPzpcXC8oPzpbXn4vXXx+MHx+MSkqKSokLztcbnZhciBKU09OX1BPSU5URVJfVVJJX0ZSQUdNRU5UID0gL14jKD86XFwvKD86W2EtejAtOV9cXC0uISQmJygpKissOzo9QF18JVswLTlhLWZdezJ9fH4wfH4xKSopKiQvaTtcbnZhciBSRUxBVElWRV9KU09OX1BPSU5URVIgPSAvXig/OjB8WzEtOV1bMC05XSopKD86I3woPzpcXC8oPzpbXn4vXXx+MHx+MSkqKSopJC87XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmb3JtYXRzO1xuXG5mdW5jdGlvbiBmb3JtYXRzKG1vZGUpIHtcbiAgbW9kZSA9IG1vZGUgPT0gJ2Z1bGwnID8gJ2Z1bGwnIDogJ2Zhc3QnO1xuICByZXR1cm4gdXRpbC5jb3B5KGZvcm1hdHNbbW9kZV0pO1xufVxuXG5cbmZvcm1hdHMuZmFzdCA9IHtcbiAgLy8gZGF0ZTogaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzMzOSNzZWN0aW9uLTUuNlxuICBkYXRlOiAvXlxcZFxcZFxcZFxcZC1bMC0xXVxcZC1bMC0zXVxcZCQvLFxuICAvLyBkYXRlLXRpbWU6IGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzMzMzkjc2VjdGlvbi01LjZcbiAgdGltZTogL14oPzpbMC0yXVxcZDpbMC01XVxcZDpbMC01XVxcZHwyMzo1OTo2MCkoPzpcXC5cXGQrKT8oPzp6fFsrLV1cXGRcXGQoPzo6P1xcZFxcZCk/KT8kL2ksXG4gICdkYXRlLXRpbWUnOiAvXlxcZFxcZFxcZFxcZC1bMC0xXVxcZC1bMC0zXVxcZFt0XFxzXSg/OlswLTJdXFxkOlswLTVdXFxkOlswLTVdXFxkfDIzOjU5OjYwKSg/OlxcLlxcZCspPyg/Onp8WystXVxcZFxcZCg/Ojo/XFxkXFxkKT8pJC9pLFxuICAvLyB1cmk6IGh0dHBzOi8vZ2l0aHViLmNvbS9tYWZpbnRvc2gvaXMtbXktanNvbi12YWxpZC9ibG9iL21hc3Rlci9mb3JtYXRzLmpzXG4gIHVyaTogL14oPzpbYS16XVthLXowLTkrXFwtLl0qOikoPzpcXC8/XFwvKT9bXlxcc10qJC9pLFxuICAndXJpLXJlZmVyZW5jZSc6IC9eKD86KD86W2Etel1bYS16MC05K1xcLS5dKjopP1xcLz9cXC8pPyg/OlteXFxcXFxccyNdW15cXHMjXSopPyg/OiNbXlxcXFxcXHNdKik/JC9pLFxuICAndXJpLXRlbXBsYXRlJzogVVJJVEVNUExBVEUsXG4gIHVybDogVVJMLFxuICAvLyBlbWFpbCAoc291cmNlcyBmcm9tIGpzZW4gdmFsaWRhdG9yKTpcbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8yMDEzMjMvdXNpbmctYS1yZWd1bGFyLWV4cHJlc3Npb24tdG8tdmFsaWRhdGUtYW4tZW1haWwtYWRkcmVzcyNhbnN3ZXItODgyOTM2M1xuICAvLyBodHRwOi8vd3d3LnczLm9yZy9UUi9odG1sNS9mb3Jtcy5odG1sI3ZhbGlkLWUtbWFpbC1hZGRyZXNzIChzZWFyY2ggZm9yICd3aWxsZnVsIHZpb2xhdGlvbicpXG4gIGVtYWlsOiAvXlthLXowLTkuISMkJSYnKisvPT9eX2B7fH1+LV0rQFthLXowLTldKD86W2EtejAtOS1dezAsNjF9W2EtejAtOV0pPyg/OlxcLlthLXowLTldKD86W2EtejAtOS1dezAsNjF9W2EtejAtOV0pPykqJC9pLFxuICBob3N0bmFtZTogSE9TVE5BTUUsXG4gIC8vIG9wdGltaXplZCBodHRwczovL3d3dy5zYWZhcmlib29rc29ubGluZS5jb20vbGlicmFyeS92aWV3L3JlZ3VsYXItZXhwcmVzc2lvbnMtY29va2Jvb2svOTc4MDU5NjgwMjgzNy9jaDA3czE2Lmh0bWxcbiAgaXB2NDogL14oPzooPzoyNVswLTVdfDJbMC00XVxcZHxbMDFdP1xcZFxcZD8pXFwuKXszfSg/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPykkLyxcbiAgLy8gb3B0aW1pemVkIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTM0OTcvcmVndWxhci1leHByZXNzaW9uLXRoYXQtbWF0Y2hlcy12YWxpZC1pcHY2LWFkZHJlc3Nlc1xuICBpcHY2OiAvXlxccyooPzooPzooPzpbMC05YS1mXXsxLDR9Oil7N30oPzpbMC05YS1mXXsxLDR9fDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7Nn0oPzo6WzAtOWEtZl17MSw0fXwoPzooPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoPzpcXC4oPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezV9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsMn0pfDooPzooPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoPzpcXC4oPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezR9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsM30pfCg/Oig/OjpbMC05YS1mXXsxLDR9KT86KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7M30oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw0fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsMn06KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7Mn0oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw1fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsM306KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7MX0oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw2fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsNH06KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzo6KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsN30pfCg/Oig/OjpbMC05YS1mXXsxLDR9KXswLDV9Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSkpKD86JS4rKT9cXHMqJC9pLFxuICByZWdleDogcmVnZXgsXG4gIC8vIHV1aWQ6IGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzQxMjJcbiAgdXVpZDogVVVJRCxcbiAgLy8gSlNPTi1wb2ludGVyOiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMVxuICAvLyB1cmkgZnJhZ21lbnQ6IGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzOTg2I2FwcGVuZGl4LUFcbiAgJ2pzb24tcG9pbnRlcic6IEpTT05fUE9JTlRFUixcbiAgJ2pzb24tcG9pbnRlci11cmktZnJhZ21lbnQnOiBKU09OX1BPSU5URVJfVVJJX0ZSQUdNRU5ULFxuICAvLyByZWxhdGl2ZSBKU09OLXBvaW50ZXI6IGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL2RyYWZ0LWx1ZmYtcmVsYXRpdmUtanNvbi1wb2ludGVyLTAwXG4gICdyZWxhdGl2ZS1qc29uLXBvaW50ZXInOiBSRUxBVElWRV9KU09OX1BPSU5URVJcbn07XG5cblxuZm9ybWF0cy5mdWxsID0ge1xuICBkYXRlOiBkYXRlLFxuICB0aW1lOiB0aW1lLFxuICAnZGF0ZS10aW1lJzogZGF0ZV90aW1lLFxuICB1cmk6IHVyaSxcbiAgJ3VyaS1yZWZlcmVuY2UnOiBVUklSRUYsXG4gICd1cmktdGVtcGxhdGUnOiBVUklURU1QTEFURSxcbiAgdXJsOiBVUkwsXG4gIGVtYWlsOiAvXlthLXowLTkhIyQlJicqKy89P15fYHt8fX4tXSsoPzpcXC5bYS16MC05ISMkJSYnKisvPT9eX2B7fH1+LV0rKSpAKD86W2EtejAtOV0oPzpbYS16MC05LV0qW2EtejAtOV0pP1xcLikrW2EtejAtOV0oPzpbYS16MC05LV0qW2EtejAtOV0pPyQvaSxcbiAgaG9zdG5hbWU6IEhPU1ROQU1FLFxuICBpcHY0OiAvXig/Oig/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPylcXC4pezN9KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KSQvLFxuICBpcHY2OiAvXlxccyooPzooPzooPzpbMC05YS1mXXsxLDR9Oil7N30oPzpbMC05YS1mXXsxLDR9fDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7Nn0oPzo6WzAtOWEtZl17MSw0fXwoPzooPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoPzpcXC4oPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezV9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsMn0pfDooPzooPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoPzpcXC4oPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezR9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsM30pfCg/Oig/OjpbMC05YS1mXXsxLDR9KT86KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7M30oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw0fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsMn06KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7Mn0oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw1fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsM306KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7MX0oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw2fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsNH06KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzo6KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsN30pfCg/Oig/OjpbMC05YS1mXXsxLDR9KXswLDV9Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSkpKD86JS4rKT9cXHMqJC9pLFxuICByZWdleDogcmVnZXgsXG4gIHV1aWQ6IFVVSUQsXG4gICdqc29uLXBvaW50ZXInOiBKU09OX1BPSU5URVIsXG4gICdqc29uLXBvaW50ZXItdXJpLWZyYWdtZW50JzogSlNPTl9QT0lOVEVSX1VSSV9GUkFHTUVOVCxcbiAgJ3JlbGF0aXZlLWpzb24tcG9pbnRlcic6IFJFTEFUSVZFX0pTT05fUE9JTlRFUlxufTtcblxuXG5mdW5jdGlvbiBpc0xlYXBZZWFyKHllYXIpIHtcbiAgLy8gaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzMzMzkjYXBwZW5kaXgtQ1xuICByZXR1cm4geWVhciAlIDQgPT09IDAgJiYgKHllYXIgJSAxMDAgIT09IDAgfHwgeWVhciAlIDQwMCA9PT0gMCk7XG59XG5cblxuZnVuY3Rpb24gZGF0ZShzdHIpIHtcbiAgLy8gZnVsbC1kYXRlIGZyb20gaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzMzOSNzZWN0aW9uLTUuNlxuICB2YXIgbWF0Y2hlcyA9IHN0ci5tYXRjaChEQVRFKTtcbiAgaWYgKCFtYXRjaGVzKSByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIHllYXIgPSArbWF0Y2hlc1sxXTtcbiAgdmFyIG1vbnRoID0gK21hdGNoZXNbMl07XG4gIHZhciBkYXkgPSArbWF0Y2hlc1szXTtcblxuICByZXR1cm4gbW9udGggPj0gMSAmJiBtb250aCA8PSAxMiAmJiBkYXkgPj0gMSAmJlxuICAgICAgICAgIGRheSA8PSAobW9udGggPT0gMiAmJiBpc0xlYXBZZWFyKHllYXIpID8gMjkgOiBEQVlTW21vbnRoXSk7XG59XG5cblxuZnVuY3Rpb24gdGltZShzdHIsIGZ1bGwpIHtcbiAgdmFyIG1hdGNoZXMgPSBzdHIubWF0Y2goVElNRSk7XG4gIGlmICghbWF0Y2hlcykgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBob3VyID0gbWF0Y2hlc1sxXTtcbiAgdmFyIG1pbnV0ZSA9IG1hdGNoZXNbMl07XG4gIHZhciBzZWNvbmQgPSBtYXRjaGVzWzNdO1xuICB2YXIgdGltZVpvbmUgPSBtYXRjaGVzWzVdO1xuICByZXR1cm4gKChob3VyIDw9IDIzICYmIG1pbnV0ZSA8PSA1OSAmJiBzZWNvbmQgPD0gNTkpIHx8XG4gICAgICAgICAgKGhvdXIgPT0gMjMgJiYgbWludXRlID09IDU5ICYmIHNlY29uZCA9PSA2MCkpICYmXG4gICAgICAgICAoIWZ1bGwgfHwgdGltZVpvbmUpO1xufVxuXG5cbnZhciBEQVRFX1RJTUVfU0VQQVJBVE9SID0gL3R8XFxzL2k7XG5mdW5jdGlvbiBkYXRlX3RpbWUoc3RyKSB7XG4gIC8vIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzMzMzkjc2VjdGlvbi01LjZcbiAgdmFyIGRhdGVUaW1lID0gc3RyLnNwbGl0KERBVEVfVElNRV9TRVBBUkFUT1IpO1xuICByZXR1cm4gZGF0ZVRpbWUubGVuZ3RoID09IDIgJiYgZGF0ZShkYXRlVGltZVswXSkgJiYgdGltZShkYXRlVGltZVsxXSwgdHJ1ZSk7XG59XG5cblxudmFyIE5PVF9VUklfRlJBR01FTlQgPSAvXFwvfDovO1xuZnVuY3Rpb24gdXJpKHN0cikge1xuICAvLyBodHRwOi8vam1yd2FyZS5jb20vYXJ0aWNsZXMvMjAwOS91cmlfcmVnZXhwL1VSSV9yZWdleC5odG1sICsgb3B0aW9uYWwgcHJvdG9jb2wgKyByZXF1aXJlZCBcIi5cIlxuICByZXR1cm4gTk9UX1VSSV9GUkFHTUVOVC50ZXN0KHN0cikgJiYgVVJJLnRlc3Qoc3RyKTtcbn1cblxuXG52YXIgWl9BTkNIT1IgPSAvW15cXFxcXVxcXFxaLztcbmZ1bmN0aW9uIHJlZ2V4KHN0cikge1xuICBpZiAoWl9BTkNIT1IudGVzdChzdHIpKSByZXR1cm4gZmFsc2U7XG4gIHRyeSB7XG4gICAgbmV3IFJlZ0V4cChzdHIpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoKGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJlc29sdmUgPSByZXF1aXJlKCcuL3Jlc29sdmUnKVxuICAsIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxuICAsIGVycm9yQ2xhc3NlcyA9IHJlcXVpcmUoJy4vZXJyb3JfY2xhc3NlcycpXG4gICwgc3RhYmxlU3RyaW5naWZ5ID0gcmVxdWlyZSgnZmFzdC1qc29uLXN0YWJsZS1zdHJpbmdpZnknKTtcblxudmFyIHZhbGlkYXRlR2VuZXJhdG9yID0gcmVxdWlyZSgnLi4vZG90anMvdmFsaWRhdGUnKTtcblxuLyoqXG4gKiBGdW5jdGlvbnMgYmVsb3cgYXJlIHVzZWQgaW5zaWRlIGNvbXBpbGVkIHZhbGlkYXRpb25zIGZ1bmN0aW9uXG4gKi9cblxudmFyIHVjczJsZW5ndGggPSB1dGlsLnVjczJsZW5ndGg7XG52YXIgZXF1YWwgPSByZXF1aXJlKCdmYXN0LWRlZXAtZXF1YWwnKTtcblxuLy8gdGhpcyBlcnJvciBpcyB0aHJvd24gYnkgYXN5bmMgc2NoZW1hcyB0byByZXR1cm4gdmFsaWRhdGlvbiBlcnJvcnMgdmlhIGV4Y2VwdGlvblxudmFyIFZhbGlkYXRpb25FcnJvciA9IGVycm9yQ2xhc3Nlcy5WYWxpZGF0aW9uO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBpbGU7XG5cblxuLyoqXG4gKiBDb21waWxlcyBzY2hlbWEgdG8gdmFsaWRhdGlvbiBmdW5jdGlvblxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSAge09iamVjdH0gc2NoZW1hIHNjaGVtYSBvYmplY3RcbiAqIEBwYXJhbSAge09iamVjdH0gcm9vdCBvYmplY3Qgd2l0aCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgcm9vdCBzY2hlbWEgZm9yIHRoaXMgc2NoZW1hXG4gKiBAcGFyYW0gIHtPYmplY3R9IGxvY2FsUmVmcyB0aGUgaGFzaCBvZiBsb2NhbCByZWZlcmVuY2VzIGluc2lkZSB0aGUgc2NoZW1hIChjcmVhdGVkIGJ5IHJlc29sdmUuaWQpLCB1c2VkIGZvciBpbmxpbmUgcmVzb2x1dGlvblxuICogQHBhcmFtICB7U3RyaW5nfSBiYXNlSWQgYmFzZSBJRCBmb3IgSURzIGluIHRoZSBzY2hlbWFcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSB2YWxpZGF0aW9uIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGUoc2NoZW1hLCByb290LCBsb2NhbFJlZnMsIGJhc2VJZCkge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlLCBldmlsOiB0cnVlICovXG4gIC8qIGVzbGludCBuby1zaGFkb3c6IDAgKi9cbiAgdmFyIHNlbGYgPSB0aGlzXG4gICAgLCBvcHRzID0gdGhpcy5fb3B0c1xuICAgICwgcmVmVmFsID0gWyB1bmRlZmluZWQgXVxuICAgICwgcmVmcyA9IHt9XG4gICAgLCBwYXR0ZXJucyA9IFtdXG4gICAgLCBwYXR0ZXJuc0hhc2ggPSB7fVxuICAgICwgZGVmYXVsdHMgPSBbXVxuICAgICwgZGVmYXVsdHNIYXNoID0ge31cbiAgICAsIGN1c3RvbVJ1bGVzID0gW107XG5cbiAgcm9vdCA9IHJvb3QgfHwgeyBzY2hlbWE6IHNjaGVtYSwgcmVmVmFsOiByZWZWYWwsIHJlZnM6IHJlZnMgfTtcblxuICB2YXIgYyA9IGNoZWNrQ29tcGlsaW5nLmNhbGwodGhpcywgc2NoZW1hLCByb290LCBiYXNlSWQpO1xuICB2YXIgY29tcGlsYXRpb24gPSB0aGlzLl9jb21waWxhdGlvbnNbYy5pbmRleF07XG4gIGlmIChjLmNvbXBpbGluZykgcmV0dXJuIChjb21waWxhdGlvbi5jYWxsVmFsaWRhdGUgPSBjYWxsVmFsaWRhdGUpO1xuXG4gIHZhciBmb3JtYXRzID0gdGhpcy5fZm9ybWF0cztcbiAgdmFyIFJVTEVTID0gdGhpcy5SVUxFUztcblxuICB0cnkge1xuICAgIHZhciB2ID0gbG9jYWxDb21waWxlKHNjaGVtYSwgcm9vdCwgbG9jYWxSZWZzLCBiYXNlSWQpO1xuICAgIGNvbXBpbGF0aW9uLnZhbGlkYXRlID0gdjtcbiAgICB2YXIgY3YgPSBjb21waWxhdGlvbi5jYWxsVmFsaWRhdGU7XG4gICAgaWYgKGN2KSB7XG4gICAgICBjdi5zY2hlbWEgPSB2LnNjaGVtYTtcbiAgICAgIGN2LmVycm9ycyA9IG51bGw7XG4gICAgICBjdi5yZWZzID0gdi5yZWZzO1xuICAgICAgY3YucmVmVmFsID0gdi5yZWZWYWw7XG4gICAgICBjdi5yb290ID0gdi5yb290O1xuICAgICAgY3YuJGFzeW5jID0gdi4kYXN5bmM7XG4gICAgICBpZiAob3B0cy5zb3VyY2VDb2RlKSBjdi5zb3VyY2UgPSB2LnNvdXJjZTtcbiAgICB9XG4gICAgcmV0dXJuIHY7XG4gIH0gZmluYWxseSB7XG4gICAgZW5kQ29tcGlsaW5nLmNhbGwodGhpcywgc2NoZW1hLCByb290LCBiYXNlSWQpO1xuICB9XG5cbiAgLyogQHRoaXMgICB7Kn0gLSBjdXN0b20gY29udGV4dCwgc2VlIHBhc3NDb250ZXh0IG9wdGlvbiAqL1xuICBmdW5jdGlvbiBjYWxsVmFsaWRhdGUoKSB7XG4gICAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciB2YWxpZGF0ZSA9IGNvbXBpbGF0aW9uLnZhbGlkYXRlO1xuICAgIHZhciByZXN1bHQgPSB2YWxpZGF0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGNhbGxWYWxpZGF0ZS5lcnJvcnMgPSB2YWxpZGF0ZS5lcnJvcnM7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxvY2FsQ29tcGlsZShfc2NoZW1hLCBfcm9vdCwgbG9jYWxSZWZzLCBiYXNlSWQpIHtcbiAgICB2YXIgaXNSb290ID0gIV9yb290IHx8IChfcm9vdCAmJiBfcm9vdC5zY2hlbWEgPT0gX3NjaGVtYSk7XG4gICAgaWYgKF9yb290LnNjaGVtYSAhPSByb290LnNjaGVtYSlcbiAgICAgIHJldHVybiBjb21waWxlLmNhbGwoc2VsZiwgX3NjaGVtYSwgX3Jvb3QsIGxvY2FsUmVmcywgYmFzZUlkKTtcblxuICAgIHZhciAkYXN5bmMgPSBfc2NoZW1hLiRhc3luYyA9PT0gdHJ1ZTtcblxuICAgIHZhciBzb3VyY2VDb2RlID0gdmFsaWRhdGVHZW5lcmF0b3Ioe1xuICAgICAgaXNUb3A6IHRydWUsXG4gICAgICBzY2hlbWE6IF9zY2hlbWEsXG4gICAgICBpc1Jvb3Q6IGlzUm9vdCxcbiAgICAgIGJhc2VJZDogYmFzZUlkLFxuICAgICAgcm9vdDogX3Jvb3QsXG4gICAgICBzY2hlbWFQYXRoOiAnJyxcbiAgICAgIGVyclNjaGVtYVBhdGg6ICcjJyxcbiAgICAgIGVycm9yUGF0aDogJ1wiXCInLFxuICAgICAgTWlzc2luZ1JlZkVycm9yOiBlcnJvckNsYXNzZXMuTWlzc2luZ1JlZixcbiAgICAgIFJVTEVTOiBSVUxFUyxcbiAgICAgIHZhbGlkYXRlOiB2YWxpZGF0ZUdlbmVyYXRvcixcbiAgICAgIHV0aWw6IHV0aWwsXG4gICAgICByZXNvbHZlOiByZXNvbHZlLFxuICAgICAgcmVzb2x2ZVJlZjogcmVzb2x2ZVJlZixcbiAgICAgIHVzZVBhdHRlcm46IHVzZVBhdHRlcm4sXG4gICAgICB1c2VEZWZhdWx0OiB1c2VEZWZhdWx0LFxuICAgICAgdXNlQ3VzdG9tUnVsZTogdXNlQ3VzdG9tUnVsZSxcbiAgICAgIG9wdHM6IG9wdHMsXG4gICAgICBmb3JtYXRzOiBmb3JtYXRzLFxuICAgICAgbG9nZ2VyOiBzZWxmLmxvZ2dlcixcbiAgICAgIHNlbGY6IHNlbGZcbiAgICB9KTtcblxuICAgIHNvdXJjZUNvZGUgPSB2YXJzKHJlZlZhbCwgcmVmVmFsQ29kZSkgKyB2YXJzKHBhdHRlcm5zLCBwYXR0ZXJuQ29kZSlcbiAgICAgICAgICAgICAgICAgICArIHZhcnMoZGVmYXVsdHMsIGRlZmF1bHRDb2RlKSArIHZhcnMoY3VzdG9tUnVsZXMsIGN1c3RvbVJ1bGVDb2RlKVxuICAgICAgICAgICAgICAgICAgICsgc291cmNlQ29kZTtcblxuICAgIGlmIChvcHRzLnByb2Nlc3NDb2RlKSBzb3VyY2VDb2RlID0gb3B0cy5wcm9jZXNzQ29kZShzb3VyY2VDb2RlLCBfc2NoZW1hKTtcbiAgICAvLyBjb25zb2xlLmxvZygnXFxuXFxuXFxuICoqKiBcXG4nLCBKU09OLnN0cmluZ2lmeShzb3VyY2VDb2RlKSk7XG4gICAgdmFyIHZhbGlkYXRlO1xuICAgIHRyeSB7XG4gICAgICB2YXIgbWFrZVZhbGlkYXRlID0gbmV3IEZ1bmN0aW9uKFxuICAgICAgICAnc2VsZicsXG4gICAgICAgICdSVUxFUycsXG4gICAgICAgICdmb3JtYXRzJyxcbiAgICAgICAgJ3Jvb3QnLFxuICAgICAgICAncmVmVmFsJyxcbiAgICAgICAgJ2RlZmF1bHRzJyxcbiAgICAgICAgJ2N1c3RvbVJ1bGVzJyxcbiAgICAgICAgJ2VxdWFsJyxcbiAgICAgICAgJ3VjczJsZW5ndGgnLFxuICAgICAgICAnVmFsaWRhdGlvbkVycm9yJyxcbiAgICAgICAgc291cmNlQ29kZVxuICAgICAgKTtcblxuICAgICAgdmFsaWRhdGUgPSBtYWtlVmFsaWRhdGUoXG4gICAgICAgIHNlbGYsXG4gICAgICAgIFJVTEVTLFxuICAgICAgICBmb3JtYXRzLFxuICAgICAgICByb290LFxuICAgICAgICByZWZWYWwsXG4gICAgICAgIGRlZmF1bHRzLFxuICAgICAgICBjdXN0b21SdWxlcyxcbiAgICAgICAgZXF1YWwsXG4gICAgICAgIHVjczJsZW5ndGgsXG4gICAgICAgIFZhbGlkYXRpb25FcnJvclxuICAgICAgKTtcblxuICAgICAgcmVmVmFsWzBdID0gdmFsaWRhdGU7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBzZWxmLmxvZ2dlci5lcnJvcignRXJyb3IgY29tcGlsaW5nIHNjaGVtYSwgZnVuY3Rpb24gY29kZTonLCBzb3VyY2VDb2RlKTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgdmFsaWRhdGUuc2NoZW1hID0gX3NjaGVtYTtcbiAgICB2YWxpZGF0ZS5lcnJvcnMgPSBudWxsO1xuICAgIHZhbGlkYXRlLnJlZnMgPSByZWZzO1xuICAgIHZhbGlkYXRlLnJlZlZhbCA9IHJlZlZhbDtcbiAgICB2YWxpZGF0ZS5yb290ID0gaXNSb290ID8gdmFsaWRhdGUgOiBfcm9vdDtcbiAgICBpZiAoJGFzeW5jKSB2YWxpZGF0ZS4kYXN5bmMgPSB0cnVlO1xuICAgIGlmIChvcHRzLnNvdXJjZUNvZGUgPT09IHRydWUpIHtcbiAgICAgIHZhbGlkYXRlLnNvdXJjZSA9IHtcbiAgICAgICAgY29kZTogc291cmNlQ29kZSxcbiAgICAgICAgcGF0dGVybnM6IHBhdHRlcm5zLFxuICAgICAgICBkZWZhdWx0czogZGVmYXVsdHNcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbGlkYXRlO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVzb2x2ZVJlZihiYXNlSWQsIHJlZiwgaXNSb290KSB7XG4gICAgcmVmID0gcmVzb2x2ZS51cmwoYmFzZUlkLCByZWYpO1xuICAgIHZhciByZWZJbmRleCA9IHJlZnNbcmVmXTtcbiAgICB2YXIgX3JlZlZhbCwgcmVmQ29kZTtcbiAgICBpZiAocmVmSW5kZXggIT09IHVuZGVmaW5lZCkge1xuICAgICAgX3JlZlZhbCA9IHJlZlZhbFtyZWZJbmRleF07XG4gICAgICByZWZDb2RlID0gJ3JlZlZhbFsnICsgcmVmSW5kZXggKyAnXSc7XG4gICAgICByZXR1cm4gcmVzb2x2ZWRSZWYoX3JlZlZhbCwgcmVmQ29kZSk7XG4gICAgfVxuICAgIGlmICghaXNSb290ICYmIHJvb3QucmVmcykge1xuICAgICAgdmFyIHJvb3RSZWZJZCA9IHJvb3QucmVmc1tyZWZdO1xuICAgICAgaWYgKHJvb3RSZWZJZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIF9yZWZWYWwgPSByb290LnJlZlZhbFtyb290UmVmSWRdO1xuICAgICAgICByZWZDb2RlID0gYWRkTG9jYWxSZWYocmVmLCBfcmVmVmFsKTtcbiAgICAgICAgcmV0dXJuIHJlc29sdmVkUmVmKF9yZWZWYWwsIHJlZkNvZGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJlZkNvZGUgPSBhZGRMb2NhbFJlZihyZWYpO1xuICAgIHZhciB2ID0gcmVzb2x2ZS5jYWxsKHNlbGYsIGxvY2FsQ29tcGlsZSwgcm9vdCwgcmVmKTtcbiAgICBpZiAodiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YXIgbG9jYWxTY2hlbWEgPSBsb2NhbFJlZnMgJiYgbG9jYWxSZWZzW3JlZl07XG4gICAgICBpZiAobG9jYWxTY2hlbWEpIHtcbiAgICAgICAgdiA9IHJlc29sdmUuaW5saW5lUmVmKGxvY2FsU2NoZW1hLCBvcHRzLmlubGluZVJlZnMpXG4gICAgICAgICAgICA/IGxvY2FsU2NoZW1hXG4gICAgICAgICAgICA6IGNvbXBpbGUuY2FsbChzZWxmLCBsb2NhbFNjaGVtYSwgcm9vdCwgbG9jYWxSZWZzLCBiYXNlSWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh2ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlbW92ZUxvY2FsUmVmKHJlZik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcGxhY2VMb2NhbFJlZihyZWYsIHYpO1xuICAgICAgcmV0dXJuIHJlc29sdmVkUmVmKHYsIHJlZkNvZGUpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZExvY2FsUmVmKHJlZiwgdikge1xuICAgIHZhciByZWZJZCA9IHJlZlZhbC5sZW5ndGg7XG4gICAgcmVmVmFsW3JlZklkXSA9IHY7XG4gICAgcmVmc1tyZWZdID0gcmVmSWQ7XG4gICAgcmV0dXJuICdyZWZWYWwnICsgcmVmSWQ7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVMb2NhbFJlZihyZWYpIHtcbiAgICBkZWxldGUgcmVmc1tyZWZdO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVwbGFjZUxvY2FsUmVmKHJlZiwgdikge1xuICAgIHZhciByZWZJZCA9IHJlZnNbcmVmXTtcbiAgICByZWZWYWxbcmVmSWRdID0gdjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc29sdmVkUmVmKHJlZlZhbCwgY29kZSkge1xuICAgIHJldHVybiB0eXBlb2YgcmVmVmFsID09ICdvYmplY3QnIHx8IHR5cGVvZiByZWZWYWwgPT0gJ2Jvb2xlYW4nXG4gICAgICAgICAgICA/IHsgY29kZTogY29kZSwgc2NoZW1hOiByZWZWYWwsIGlubGluZTogdHJ1ZSB9XG4gICAgICAgICAgICA6IHsgY29kZTogY29kZSwgJGFzeW5jOiByZWZWYWwgJiYgISFyZWZWYWwuJGFzeW5jIH07XG4gIH1cblxuICBmdW5jdGlvbiB1c2VQYXR0ZXJuKHJlZ2V4U3RyKSB7XG4gICAgdmFyIGluZGV4ID0gcGF0dGVybnNIYXNoW3JlZ2V4U3RyXTtcbiAgICBpZiAoaW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgaW5kZXggPSBwYXR0ZXJuc0hhc2hbcmVnZXhTdHJdID0gcGF0dGVybnMubGVuZ3RoO1xuICAgICAgcGF0dGVybnNbaW5kZXhdID0gcmVnZXhTdHI7XG4gICAgfVxuICAgIHJldHVybiAncGF0dGVybicgKyBpbmRleDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVzZURlZmF1bHQodmFsdWUpIHtcbiAgICBzd2l0Y2ggKHR5cGVvZiB2YWx1ZSkge1xuICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICByZXR1cm4gJycgKyB2YWx1ZTtcbiAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgIHJldHVybiB1dGlsLnRvUXVvdGVkU3RyaW5nKHZhbHVlKTtcbiAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkgcmV0dXJuICdudWxsJztcbiAgICAgICAgdmFyIHZhbHVlU3RyID0gc3RhYmxlU3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgICAgdmFyIGluZGV4ID0gZGVmYXVsdHNIYXNoW3ZhbHVlU3RyXTtcbiAgICAgICAgaWYgKGluZGV4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpbmRleCA9IGRlZmF1bHRzSGFzaFt2YWx1ZVN0cl0gPSBkZWZhdWx0cy5sZW5ndGg7XG4gICAgICAgICAgZGVmYXVsdHNbaW5kZXhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdkZWZhdWx0JyArIGluZGV4O1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVzZUN1c3RvbVJ1bGUocnVsZSwgc2NoZW1hLCBwYXJlbnRTY2hlbWEsIGl0KSB7XG4gICAgaWYgKHNlbGYuX29wdHMudmFsaWRhdGVTY2hlbWEgIT09IGZhbHNlKSB7XG4gICAgICB2YXIgZGVwcyA9IHJ1bGUuZGVmaW5pdGlvbi5kZXBlbmRlbmNpZXM7XG4gICAgICBpZiAoZGVwcyAmJiAhZGVwcy5ldmVyeShmdW5jdGlvbihrZXl3b3JkKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocGFyZW50U2NoZW1hLCBrZXl3b3JkKTtcbiAgICAgIH0pKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3BhcmVudCBzY2hlbWEgbXVzdCBoYXZlIGFsbCByZXF1aXJlZCBrZXl3b3JkczogJyArIGRlcHMuam9pbignLCcpKTtcblxuICAgICAgdmFyIHZhbGlkYXRlU2NoZW1hID0gcnVsZS5kZWZpbml0aW9uLnZhbGlkYXRlU2NoZW1hO1xuICAgICAgaWYgKHZhbGlkYXRlU2NoZW1hKSB7XG4gICAgICAgIHZhciB2YWxpZCA9IHZhbGlkYXRlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgIGlmICghdmFsaWQpIHtcbiAgICAgICAgICB2YXIgbWVzc2FnZSA9ICdrZXl3b3JkIHNjaGVtYSBpcyBpbnZhbGlkOiAnICsgc2VsZi5lcnJvcnNUZXh0KHZhbGlkYXRlU2NoZW1hLmVycm9ycyk7XG4gICAgICAgICAgaWYgKHNlbGYuX29wdHMudmFsaWRhdGVTY2hlbWEgPT0gJ2xvZycpIHNlbGYubG9nZ2VyLmVycm9yKG1lc3NhZ2UpO1xuICAgICAgICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGNvbXBpbGUgPSBydWxlLmRlZmluaXRpb24uY29tcGlsZVxuICAgICAgLCBpbmxpbmUgPSBydWxlLmRlZmluaXRpb24uaW5saW5lXG4gICAgICAsIG1hY3JvID0gcnVsZS5kZWZpbml0aW9uLm1hY3JvO1xuXG4gICAgdmFyIHZhbGlkYXRlO1xuICAgIGlmIChjb21waWxlKSB7XG4gICAgICB2YWxpZGF0ZSA9IGNvbXBpbGUuY2FsbChzZWxmLCBzY2hlbWEsIHBhcmVudFNjaGVtYSwgaXQpO1xuICAgIH0gZWxzZSBpZiAobWFjcm8pIHtcbiAgICAgIHZhbGlkYXRlID0gbWFjcm8uY2FsbChzZWxmLCBzY2hlbWEsIHBhcmVudFNjaGVtYSwgaXQpO1xuICAgICAgaWYgKG9wdHMudmFsaWRhdGVTY2hlbWEgIT09IGZhbHNlKSBzZWxmLnZhbGlkYXRlU2NoZW1hKHZhbGlkYXRlLCB0cnVlKTtcbiAgICB9IGVsc2UgaWYgKGlubGluZSkge1xuICAgICAgdmFsaWRhdGUgPSBpbmxpbmUuY2FsbChzZWxmLCBpdCwgcnVsZS5rZXl3b3JkLCBzY2hlbWEsIHBhcmVudFNjaGVtYSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbGlkYXRlID0gcnVsZS5kZWZpbml0aW9uLnZhbGlkYXRlO1xuICAgICAgaWYgKCF2YWxpZGF0ZSkgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh2YWxpZGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjdXN0b20ga2V5d29yZCBcIicgKyBydWxlLmtleXdvcmQgKyAnXCJmYWlsZWQgdG8gY29tcGlsZScpO1xuXG4gICAgdmFyIGluZGV4ID0gY3VzdG9tUnVsZXMubGVuZ3RoO1xuICAgIGN1c3RvbVJ1bGVzW2luZGV4XSA9IHZhbGlkYXRlO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvZGU6ICdjdXN0b21SdWxlJyArIGluZGV4LFxuICAgICAgdmFsaWRhdGU6IHZhbGlkYXRlXG4gICAgfTtcbiAgfVxufVxuXG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBzY2hlbWEgaXMgY3VycmVudGx5IGNvbXBpbGVkXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtICB7T2JqZWN0fSBzY2hlbWEgc2NoZW1hIHRvIGNvbXBpbGVcbiAqIEBwYXJhbSAge09iamVjdH0gcm9vdCByb290IG9iamVjdFxuICogQHBhcmFtICB7U3RyaW5nfSBiYXNlSWQgYmFzZSBzY2hlbWEgSURcbiAqIEByZXR1cm4ge09iamVjdH0gb2JqZWN0IHdpdGggcHJvcGVydGllcyBcImluZGV4XCIgKGNvbXBpbGF0aW9uIGluZGV4KSBhbmQgXCJjb21waWxpbmdcIiAoYm9vbGVhbilcbiAqL1xuZnVuY3Rpb24gY2hlY2tDb21waWxpbmcoc2NoZW1hLCByb290LCBiYXNlSWQpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICB2YXIgaW5kZXggPSBjb21wSW5kZXguY2FsbCh0aGlzLCBzY2hlbWEsIHJvb3QsIGJhc2VJZCk7XG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4geyBpbmRleDogaW5kZXgsIGNvbXBpbGluZzogdHJ1ZSB9O1xuICBpbmRleCA9IHRoaXMuX2NvbXBpbGF0aW9ucy5sZW5ndGg7XG4gIHRoaXMuX2NvbXBpbGF0aW9uc1tpbmRleF0gPSB7XG4gICAgc2NoZW1hOiBzY2hlbWEsXG4gICAgcm9vdDogcm9vdCxcbiAgICBiYXNlSWQ6IGJhc2VJZFxuICB9O1xuICByZXR1cm4geyBpbmRleDogaW5kZXgsIGNvbXBpbGluZzogZmFsc2UgfTtcbn1cblxuXG4vKipcbiAqIFJlbW92ZXMgdGhlIHNjaGVtYSBmcm9tIHRoZSBjdXJyZW50bHkgY29tcGlsZWQgbGlzdFxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSAge09iamVjdH0gc2NoZW1hIHNjaGVtYSB0byBjb21waWxlXG4gKiBAcGFyYW0gIHtPYmplY3R9IHJvb3Qgcm9vdCBvYmplY3RcbiAqIEBwYXJhbSAge1N0cmluZ30gYmFzZUlkIGJhc2Ugc2NoZW1hIElEXG4gKi9cbmZ1bmN0aW9uIGVuZENvbXBpbGluZyhzY2hlbWEsIHJvb3QsIGJhc2VJZCkge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gIHZhciBpID0gY29tcEluZGV4LmNhbGwodGhpcywgc2NoZW1hLCByb290LCBiYXNlSWQpO1xuICBpZiAoaSA+PSAwKSB0aGlzLl9jb21waWxhdGlvbnMuc3BsaWNlKGksIDEpO1xufVxuXG5cbi8qKlxuICogSW5kZXggb2Ygc2NoZW1hIGNvbXBpbGF0aW9uIGluIHRoZSBjdXJyZW50bHkgY29tcGlsZWQgbGlzdFxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSAge09iamVjdH0gc2NoZW1hIHNjaGVtYSB0byBjb21waWxlXG4gKiBAcGFyYW0gIHtPYmplY3R9IHJvb3Qgcm9vdCBvYmplY3RcbiAqIEBwYXJhbSAge1N0cmluZ30gYmFzZUlkIGJhc2Ugc2NoZW1hIElEXG4gKiBAcmV0dXJuIHtJbnRlZ2VyfSBjb21waWxhdGlvbiBpbmRleFxuICovXG5mdW5jdGlvbiBjb21wSW5kZXgoc2NoZW1hLCByb290LCBiYXNlSWQpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICBmb3IgKHZhciBpPTA7IGk8dGhpcy5fY29tcGlsYXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGMgPSB0aGlzLl9jb21waWxhdGlvbnNbaV07XG4gICAgaWYgKGMuc2NoZW1hID09IHNjaGVtYSAmJiBjLnJvb3QgPT0gcm9vdCAmJiBjLmJhc2VJZCA9PSBiYXNlSWQpIHJldHVybiBpO1xuICB9XG4gIHJldHVybiAtMTtcbn1cblxuXG5mdW5jdGlvbiBwYXR0ZXJuQ29kZShpLCBwYXR0ZXJucykge1xuICByZXR1cm4gJ3ZhciBwYXR0ZXJuJyArIGkgKyAnID0gbmV3IFJlZ0V4cCgnICsgdXRpbC50b1F1b3RlZFN0cmluZyhwYXR0ZXJuc1tpXSkgKyAnKTsnO1xufVxuXG5cbmZ1bmN0aW9uIGRlZmF1bHRDb2RlKGkpIHtcbiAgcmV0dXJuICd2YXIgZGVmYXVsdCcgKyBpICsgJyA9IGRlZmF1bHRzWycgKyBpICsgJ107Jztcbn1cblxuXG5mdW5jdGlvbiByZWZWYWxDb2RlKGksIHJlZlZhbCkge1xuICByZXR1cm4gcmVmVmFsW2ldID09PSB1bmRlZmluZWQgPyAnJyA6ICd2YXIgcmVmVmFsJyArIGkgKyAnID0gcmVmVmFsWycgKyBpICsgJ107Jztcbn1cblxuXG5mdW5jdGlvbiBjdXN0b21SdWxlQ29kZShpKSB7XG4gIHJldHVybiAndmFyIGN1c3RvbVJ1bGUnICsgaSArICcgPSBjdXN0b21SdWxlc1snICsgaSArICddOyc7XG59XG5cblxuZnVuY3Rpb24gdmFycyhhcnIsIHN0YXRlbWVudCkge1xuICBpZiAoIWFyci5sZW5ndGgpIHJldHVybiAnJztcbiAgdmFyIGNvZGUgPSAnJztcbiAgZm9yICh2YXIgaT0wOyBpPGFyci5sZW5ndGg7IGkrKylcbiAgICBjb2RlICs9IHN0YXRlbWVudChpLCBhcnIpO1xuICByZXR1cm4gY29kZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFVSSSA9IHJlcXVpcmUoJ3VyaS1qcycpXG4gICwgZXF1YWwgPSByZXF1aXJlKCdmYXN0LWRlZXAtZXF1YWwnKVxuICAsIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxuICAsIFNjaGVtYU9iamVjdCA9IHJlcXVpcmUoJy4vc2NoZW1hX29iaicpXG4gICwgdHJhdmVyc2UgPSByZXF1aXJlKCdqc29uLXNjaGVtYS10cmF2ZXJzZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlc29sdmU7XG5cbnJlc29sdmUubm9ybWFsaXplSWQgPSBub3JtYWxpemVJZDtcbnJlc29sdmUuZnVsbFBhdGggPSBnZXRGdWxsUGF0aDtcbnJlc29sdmUudXJsID0gcmVzb2x2ZVVybDtcbnJlc29sdmUuaWRzID0gcmVzb2x2ZUlkcztcbnJlc29sdmUuaW5saW5lUmVmID0gaW5saW5lUmVmO1xucmVzb2x2ZS5zY2hlbWEgPSByZXNvbHZlU2NoZW1hO1xuXG4vKipcbiAqIFtyZXNvbHZlIGFuZCBjb21waWxlIHRoZSByZWZlcmVuY2VzICgkcmVmKV1cbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY29tcGlsZSByZWZlcmVuY2UgdG8gc2NoZW1hIGNvbXBpbGF0aW9uIGZ1bmNpdG9uIChsb2NhbENvbXBpbGUpXG4gKiBAcGFyYW0gIHtPYmplY3R9IHJvb3Qgb2JqZWN0IHdpdGggaW5mb3JtYXRpb24gYWJvdXQgdGhlIHJvb3Qgc2NoZW1hIGZvciB0aGUgY3VycmVudCBzY2hlbWFcbiAqIEBwYXJhbSAge1N0cmluZ30gcmVmIHJlZmVyZW5jZSB0byByZXNvbHZlXG4gKiBAcmV0dXJuIHtPYmplY3R8RnVuY3Rpb259IHNjaGVtYSBvYmplY3QgKGlmIHRoZSBzY2hlbWEgY2FuIGJlIGlubGluZWQpIG9yIHZhbGlkYXRpb24gZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZShjb21waWxlLCByb290LCByZWYpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICB2YXIgcmVmVmFsID0gdGhpcy5fcmVmc1tyZWZdO1xuICBpZiAodHlwZW9mIHJlZlZhbCA9PSAnc3RyaW5nJykge1xuICAgIGlmICh0aGlzLl9yZWZzW3JlZlZhbF0pIHJlZlZhbCA9IHRoaXMuX3JlZnNbcmVmVmFsXTtcbiAgICBlbHNlIHJldHVybiByZXNvbHZlLmNhbGwodGhpcywgY29tcGlsZSwgcm9vdCwgcmVmVmFsKTtcbiAgfVxuXG4gIHJlZlZhbCA9IHJlZlZhbCB8fCB0aGlzLl9zY2hlbWFzW3JlZl07XG4gIGlmIChyZWZWYWwgaW5zdGFuY2VvZiBTY2hlbWFPYmplY3QpIHtcbiAgICByZXR1cm4gaW5saW5lUmVmKHJlZlZhbC5zY2hlbWEsIHRoaXMuX29wdHMuaW5saW5lUmVmcylcbiAgICAgICAgICAgID8gcmVmVmFsLnNjaGVtYVxuICAgICAgICAgICAgOiByZWZWYWwudmFsaWRhdGUgfHwgdGhpcy5fY29tcGlsZShyZWZWYWwpO1xuICB9XG5cbiAgdmFyIHJlcyA9IHJlc29sdmVTY2hlbWEuY2FsbCh0aGlzLCByb290LCByZWYpO1xuICB2YXIgc2NoZW1hLCB2LCBiYXNlSWQ7XG4gIGlmIChyZXMpIHtcbiAgICBzY2hlbWEgPSByZXMuc2NoZW1hO1xuICAgIHJvb3QgPSByZXMucm9vdDtcbiAgICBiYXNlSWQgPSByZXMuYmFzZUlkO1xuICB9XG5cbiAgaWYgKHNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYU9iamVjdCkge1xuICAgIHYgPSBzY2hlbWEudmFsaWRhdGUgfHwgY29tcGlsZS5jYWxsKHRoaXMsIHNjaGVtYS5zY2hlbWEsIHJvb3QsIHVuZGVmaW5lZCwgYmFzZUlkKTtcbiAgfSBlbHNlIGlmIChzY2hlbWEgIT09IHVuZGVmaW5lZCkge1xuICAgIHYgPSBpbmxpbmVSZWYoc2NoZW1hLCB0aGlzLl9vcHRzLmlubGluZVJlZnMpXG4gICAgICAgID8gc2NoZW1hXG4gICAgICAgIDogY29tcGlsZS5jYWxsKHRoaXMsIHNjaGVtYSwgcm9vdCwgdW5kZWZpbmVkLCBiYXNlSWQpO1xuICB9XG5cbiAgcmV0dXJuIHY7XG59XG5cblxuLyoqXG4gKiBSZXNvbHZlIHNjaGVtYSwgaXRzIHJvb3QgYW5kIGJhc2VJZFxuICogQHRoaXMgQWp2XG4gKiBAcGFyYW0gIHtPYmplY3R9IHJvb3Qgcm9vdCBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIHNjaGVtYSwgcmVmVmFsLCByZWZzXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHJlZiAgcmVmZXJlbmNlIHRvIHJlc29sdmVcbiAqIEByZXR1cm4ge09iamVjdH0gb2JqZWN0IHdpdGggcHJvcGVydGllcyBzY2hlbWEsIHJvb3QsIGJhc2VJZFxuICovXG5mdW5jdGlvbiByZXNvbHZlU2NoZW1hKHJvb3QsIHJlZikge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gIHZhciBwID0gVVJJLnBhcnNlKHJlZilcbiAgICAsIHJlZlBhdGggPSBfZ2V0RnVsbFBhdGgocClcbiAgICAsIGJhc2VJZCA9IGdldEZ1bGxQYXRoKHRoaXMuX2dldElkKHJvb3Quc2NoZW1hKSk7XG4gIGlmIChPYmplY3Qua2V5cyhyb290LnNjaGVtYSkubGVuZ3RoID09PSAwIHx8IHJlZlBhdGggIT09IGJhc2VJZCkge1xuICAgIHZhciBpZCA9IG5vcm1hbGl6ZUlkKHJlZlBhdGgpO1xuICAgIHZhciByZWZWYWwgPSB0aGlzLl9yZWZzW2lkXTtcbiAgICBpZiAodHlwZW9mIHJlZlZhbCA9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIHJlc29sdmVSZWN1cnNpdmUuY2FsbCh0aGlzLCByb290LCByZWZWYWwsIHApO1xuICAgIH0gZWxzZSBpZiAocmVmVmFsIGluc3RhbmNlb2YgU2NoZW1hT2JqZWN0KSB7XG4gICAgICBpZiAoIXJlZlZhbC52YWxpZGF0ZSkgdGhpcy5fY29tcGlsZShyZWZWYWwpO1xuICAgICAgcm9vdCA9IHJlZlZhbDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVmVmFsID0gdGhpcy5fc2NoZW1hc1tpZF07XG4gICAgICBpZiAocmVmVmFsIGluc3RhbmNlb2YgU2NoZW1hT2JqZWN0KSB7XG4gICAgICAgIGlmICghcmVmVmFsLnZhbGlkYXRlKSB0aGlzLl9jb21waWxlKHJlZlZhbCk7XG4gICAgICAgIGlmIChpZCA9PSBub3JtYWxpemVJZChyZWYpKVxuICAgICAgICAgIHJldHVybiB7IHNjaGVtYTogcmVmVmFsLCByb290OiByb290LCBiYXNlSWQ6IGJhc2VJZCB9O1xuICAgICAgICByb290ID0gcmVmVmFsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXJvb3Quc2NoZW1hKSByZXR1cm47XG4gICAgYmFzZUlkID0gZ2V0RnVsbFBhdGgodGhpcy5fZ2V0SWQocm9vdC5zY2hlbWEpKTtcbiAgfVxuICByZXR1cm4gZ2V0SnNvblBvaW50ZXIuY2FsbCh0aGlzLCBwLCBiYXNlSWQsIHJvb3Quc2NoZW1hLCByb290KTtcbn1cblxuXG4vKiBAdGhpcyBBanYgKi9cbmZ1bmN0aW9uIHJlc29sdmVSZWN1cnNpdmUocm9vdCwgcmVmLCBwYXJzZWRSZWYpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICB2YXIgcmVzID0gcmVzb2x2ZVNjaGVtYS5jYWxsKHRoaXMsIHJvb3QsIHJlZik7XG4gIGlmIChyZXMpIHtcbiAgICB2YXIgc2NoZW1hID0gcmVzLnNjaGVtYTtcbiAgICB2YXIgYmFzZUlkID0gcmVzLmJhc2VJZDtcbiAgICByb290ID0gcmVzLnJvb3Q7XG4gICAgdmFyIGlkID0gdGhpcy5fZ2V0SWQoc2NoZW1hKTtcbiAgICBpZiAoaWQpIGJhc2VJZCA9IHJlc29sdmVVcmwoYmFzZUlkLCBpZCk7XG4gICAgcmV0dXJuIGdldEpzb25Qb2ludGVyLmNhbGwodGhpcywgcGFyc2VkUmVmLCBiYXNlSWQsIHNjaGVtYSwgcm9vdCk7XG4gIH1cbn1cblxuXG52YXIgUFJFVkVOVF9TQ09QRV9DSEFOR0UgPSB1dGlsLnRvSGFzaChbJ3Byb3BlcnRpZXMnLCAncGF0dGVyblByb3BlcnRpZXMnLCAnZW51bScsICdkZXBlbmRlbmNpZXMnLCAnZGVmaW5pdGlvbnMnXSk7XG4vKiBAdGhpcyBBanYgKi9cbmZ1bmN0aW9uIGdldEpzb25Qb2ludGVyKHBhcnNlZFJlZiwgYmFzZUlkLCBzY2hlbWEsIHJvb3QpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICBwYXJzZWRSZWYuZnJhZ21lbnQgPSBwYXJzZWRSZWYuZnJhZ21lbnQgfHwgJyc7XG4gIGlmIChwYXJzZWRSZWYuZnJhZ21lbnQuc2xpY2UoMCwxKSAhPSAnLycpIHJldHVybjtcbiAgdmFyIHBhcnRzID0gcGFyc2VkUmVmLmZyYWdtZW50LnNwbGl0KCcvJyk7XG5cbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBwYXJ0ID0gcGFydHNbaV07XG4gICAgaWYgKHBhcnQpIHtcbiAgICAgIHBhcnQgPSB1dGlsLnVuZXNjYXBlRnJhZ21lbnQocGFydCk7XG4gICAgICBzY2hlbWEgPSBzY2hlbWFbcGFydF07XG4gICAgICBpZiAoc2NoZW1hID09PSB1bmRlZmluZWQpIGJyZWFrO1xuICAgICAgdmFyIGlkO1xuICAgICAgaWYgKCFQUkVWRU5UX1NDT1BFX0NIQU5HRVtwYXJ0XSkge1xuICAgICAgICBpZCA9IHRoaXMuX2dldElkKHNjaGVtYSk7XG4gICAgICAgIGlmIChpZCkgYmFzZUlkID0gcmVzb2x2ZVVybChiYXNlSWQsIGlkKTtcbiAgICAgICAgaWYgKHNjaGVtYS4kcmVmKSB7XG4gICAgICAgICAgdmFyICRyZWYgPSByZXNvbHZlVXJsKGJhc2VJZCwgc2NoZW1hLiRyZWYpO1xuICAgICAgICAgIHZhciByZXMgPSByZXNvbHZlU2NoZW1hLmNhbGwodGhpcywgcm9vdCwgJHJlZik7XG4gICAgICAgICAgaWYgKHJlcykge1xuICAgICAgICAgICAgc2NoZW1hID0gcmVzLnNjaGVtYTtcbiAgICAgICAgICAgIHJvb3QgPSByZXMucm9vdDtcbiAgICAgICAgICAgIGJhc2VJZCA9IHJlcy5iYXNlSWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChzY2hlbWEgIT09IHVuZGVmaW5lZCAmJiBzY2hlbWEgIT09IHJvb3Quc2NoZW1hKVxuICAgIHJldHVybiB7IHNjaGVtYTogc2NoZW1hLCByb290OiByb290LCBiYXNlSWQ6IGJhc2VJZCB9O1xufVxuXG5cbnZhciBTSU1QTEVfSU5MSU5FRCA9IHV0aWwudG9IYXNoKFtcbiAgJ3R5cGUnLCAnZm9ybWF0JywgJ3BhdHRlcm4nLFxuICAnbWF4TGVuZ3RoJywgJ21pbkxlbmd0aCcsXG4gICdtYXhQcm9wZXJ0aWVzJywgJ21pblByb3BlcnRpZXMnLFxuICAnbWF4SXRlbXMnLCAnbWluSXRlbXMnLFxuICAnbWF4aW11bScsICdtaW5pbXVtJyxcbiAgJ3VuaXF1ZUl0ZW1zJywgJ211bHRpcGxlT2YnLFxuICAncmVxdWlyZWQnLCAnZW51bSdcbl0pO1xuZnVuY3Rpb24gaW5saW5lUmVmKHNjaGVtYSwgbGltaXQpIHtcbiAgaWYgKGxpbWl0ID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlO1xuICBpZiAobGltaXQgPT09IHVuZGVmaW5lZCB8fCBsaW1pdCA9PT0gdHJ1ZSkgcmV0dXJuIGNoZWNrTm9SZWYoc2NoZW1hKTtcbiAgZWxzZSBpZiAobGltaXQpIHJldHVybiBjb3VudEtleXMoc2NoZW1hKSA8PSBsaW1pdDtcbn1cblxuXG5mdW5jdGlvbiBjaGVja05vUmVmKHNjaGVtYSkge1xuICB2YXIgaXRlbTtcbiAgaWYgKEFycmF5LmlzQXJyYXkoc2NoZW1hKSkge1xuICAgIGZvciAodmFyIGk9MDsgaTxzY2hlbWEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGl0ZW0gPSBzY2hlbWFbaV07XG4gICAgICBpZiAodHlwZW9mIGl0ZW0gPT0gJ29iamVjdCcgJiYgIWNoZWNrTm9SZWYoaXRlbSkpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIga2V5IGluIHNjaGVtYSkge1xuICAgICAgaWYgKGtleSA9PSAnJHJlZicpIHJldHVybiBmYWxzZTtcbiAgICAgIGl0ZW0gPSBzY2hlbWFba2V5XTtcbiAgICAgIGlmICh0eXBlb2YgaXRlbSA9PSAnb2JqZWN0JyAmJiAhY2hlY2tOb1JlZihpdGVtKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuXG5mdW5jdGlvbiBjb3VudEtleXMoc2NoZW1hKSB7XG4gIHZhciBjb3VudCA9IDAsIGl0ZW07XG4gIGlmIChBcnJheS5pc0FycmF5KHNjaGVtYSkpIHtcbiAgICBmb3IgKHZhciBpPTA7IGk8c2NoZW1hLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpdGVtID0gc2NoZW1hW2ldO1xuICAgICAgaWYgKHR5cGVvZiBpdGVtID09ICdvYmplY3QnKSBjb3VudCArPSBjb3VudEtleXMoaXRlbSk7XG4gICAgICBpZiAoY291bnQgPT0gSW5maW5pdHkpIHJldHVybiBJbmZpbml0eTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIga2V5IGluIHNjaGVtYSkge1xuICAgICAgaWYgKGtleSA9PSAnJHJlZicpIHJldHVybiBJbmZpbml0eTtcbiAgICAgIGlmIChTSU1QTEVfSU5MSU5FRFtrZXldKSB7XG4gICAgICAgIGNvdW50Kys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpdGVtID0gc2NoZW1hW2tleV07XG4gICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PSAnb2JqZWN0JykgY291bnQgKz0gY291bnRLZXlzKGl0ZW0pICsgMTtcbiAgICAgICAgaWYgKGNvdW50ID09IEluZmluaXR5KSByZXR1cm4gSW5maW5pdHk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBjb3VudDtcbn1cblxuXG5mdW5jdGlvbiBnZXRGdWxsUGF0aChpZCwgbm9ybWFsaXplKSB7XG4gIGlmIChub3JtYWxpemUgIT09IGZhbHNlKSBpZCA9IG5vcm1hbGl6ZUlkKGlkKTtcbiAgdmFyIHAgPSBVUkkucGFyc2UoaWQpO1xuICByZXR1cm4gX2dldEZ1bGxQYXRoKHApO1xufVxuXG5cbmZ1bmN0aW9uIF9nZXRGdWxsUGF0aChwKSB7XG4gIHJldHVybiBVUkkuc2VyaWFsaXplKHApLnNwbGl0KCcjJylbMF0gKyAnIyc7XG59XG5cblxudmFyIFRSQUlMSU5HX1NMQVNIX0hBU0ggPSAvI1xcLz8kLztcbmZ1bmN0aW9uIG5vcm1hbGl6ZUlkKGlkKSB7XG4gIHJldHVybiBpZCA/IGlkLnJlcGxhY2UoVFJBSUxJTkdfU0xBU0hfSEFTSCwgJycpIDogJyc7XG59XG5cblxuZnVuY3Rpb24gcmVzb2x2ZVVybChiYXNlSWQsIGlkKSB7XG4gIGlkID0gbm9ybWFsaXplSWQoaWQpO1xuICByZXR1cm4gVVJJLnJlc29sdmUoYmFzZUlkLCBpZCk7XG59XG5cblxuLyogQHRoaXMgQWp2ICovXG5mdW5jdGlvbiByZXNvbHZlSWRzKHNjaGVtYSkge1xuICB2YXIgc2NoZW1hSWQgPSBub3JtYWxpemVJZCh0aGlzLl9nZXRJZChzY2hlbWEpKTtcbiAgdmFyIGJhc2VJZHMgPSB7Jyc6IHNjaGVtYUlkfTtcbiAgdmFyIGZ1bGxQYXRocyA9IHsnJzogZ2V0RnVsbFBhdGgoc2NoZW1hSWQsIGZhbHNlKX07XG4gIHZhciBsb2NhbFJlZnMgPSB7fTtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHRyYXZlcnNlKHNjaGVtYSwge2FsbEtleXM6IHRydWV9LCBmdW5jdGlvbihzY2gsIGpzb25QdHIsIHJvb3RTY2hlbWEsIHBhcmVudEpzb25QdHIsIHBhcmVudEtleXdvcmQsIHBhcmVudFNjaGVtYSwga2V5SW5kZXgpIHtcbiAgICBpZiAoanNvblB0ciA9PT0gJycpIHJldHVybjtcbiAgICB2YXIgaWQgPSBzZWxmLl9nZXRJZChzY2gpO1xuICAgIHZhciBiYXNlSWQgPSBiYXNlSWRzW3BhcmVudEpzb25QdHJdO1xuICAgIHZhciBmdWxsUGF0aCA9IGZ1bGxQYXRoc1twYXJlbnRKc29uUHRyXSArICcvJyArIHBhcmVudEtleXdvcmQ7XG4gICAgaWYgKGtleUluZGV4ICE9PSB1bmRlZmluZWQpXG4gICAgICBmdWxsUGF0aCArPSAnLycgKyAodHlwZW9mIGtleUluZGV4ID09ICdudW1iZXInID8ga2V5SW5kZXggOiB1dGlsLmVzY2FwZUZyYWdtZW50KGtleUluZGV4KSk7XG5cbiAgICBpZiAodHlwZW9mIGlkID09ICdzdHJpbmcnKSB7XG4gICAgICBpZCA9IGJhc2VJZCA9IG5vcm1hbGl6ZUlkKGJhc2VJZCA/IFVSSS5yZXNvbHZlKGJhc2VJZCwgaWQpIDogaWQpO1xuXG4gICAgICB2YXIgcmVmVmFsID0gc2VsZi5fcmVmc1tpZF07XG4gICAgICBpZiAodHlwZW9mIHJlZlZhbCA9PSAnc3RyaW5nJykgcmVmVmFsID0gc2VsZi5fcmVmc1tyZWZWYWxdO1xuICAgICAgaWYgKHJlZlZhbCAmJiByZWZWYWwuc2NoZW1hKSB7XG4gICAgICAgIGlmICghZXF1YWwoc2NoLCByZWZWYWwuc2NoZW1hKSlcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2lkIFwiJyArIGlkICsgJ1wiIHJlc29sdmVzIHRvIG1vcmUgdGhhbiBvbmUgc2NoZW1hJyk7XG4gICAgICB9IGVsc2UgaWYgKGlkICE9IG5vcm1hbGl6ZUlkKGZ1bGxQYXRoKSkge1xuICAgICAgICBpZiAoaWRbMF0gPT0gJyMnKSB7XG4gICAgICAgICAgaWYgKGxvY2FsUmVmc1tpZF0gJiYgIWVxdWFsKHNjaCwgbG9jYWxSZWZzW2lkXSkpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2lkIFwiJyArIGlkICsgJ1wiIHJlc29sdmVzIHRvIG1vcmUgdGhhbiBvbmUgc2NoZW1hJyk7XG4gICAgICAgICAgbG9jYWxSZWZzW2lkXSA9IHNjaDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLl9yZWZzW2lkXSA9IGZ1bGxQYXRoO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGJhc2VJZHNbanNvblB0cl0gPSBiYXNlSWQ7XG4gICAgZnVsbFBhdGhzW2pzb25QdHJdID0gZnVsbFBhdGg7XG4gIH0pO1xuXG4gIHJldHVybiBsb2NhbFJlZnM7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBydWxlTW9kdWxlcyA9IHJlcXVpcmUoJy4uL2RvdGpzJylcbiAgLCB0b0hhc2ggPSByZXF1aXJlKCcuL3V0aWwnKS50b0hhc2g7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcnVsZXMoKSB7XG4gIHZhciBSVUxFUyA9IFtcbiAgICB7IHR5cGU6ICdudW1iZXInLFxuICAgICAgcnVsZXM6IFsgeyAnbWF4aW11bSc6IFsnZXhjbHVzaXZlTWF4aW11bSddIH0sXG4gICAgICAgICAgICAgICB7ICdtaW5pbXVtJzogWydleGNsdXNpdmVNaW5pbXVtJ10gfSwgJ211bHRpcGxlT2YnLCAnZm9ybWF0J10gfSxcbiAgICB7IHR5cGU6ICdzdHJpbmcnLFxuICAgICAgcnVsZXM6IFsgJ21heExlbmd0aCcsICdtaW5MZW5ndGgnLCAncGF0dGVybicsICdmb3JtYXQnIF0gfSxcbiAgICB7IHR5cGU6ICdhcnJheScsXG4gICAgICBydWxlczogWyAnbWF4SXRlbXMnLCAnbWluSXRlbXMnLCAnaXRlbXMnLCAnY29udGFpbnMnLCAndW5pcXVlSXRlbXMnIF0gfSxcbiAgICB7IHR5cGU6ICdvYmplY3QnLFxuICAgICAgcnVsZXM6IFsgJ21heFByb3BlcnRpZXMnLCAnbWluUHJvcGVydGllcycsICdyZXF1aXJlZCcsICdkZXBlbmRlbmNpZXMnLCAncHJvcGVydHlOYW1lcycsXG4gICAgICAgICAgICAgICB7ICdwcm9wZXJ0aWVzJzogWydhZGRpdGlvbmFsUHJvcGVydGllcycsICdwYXR0ZXJuUHJvcGVydGllcyddIH0gXSB9LFxuICAgIHsgcnVsZXM6IFsgJyRyZWYnLCAnY29uc3QnLCAnZW51bScsICdub3QnLCAnYW55T2YnLCAnb25lT2YnLCAnYWxsT2YnLCAnaWYnIF0gfVxuICBdO1xuXG4gIHZhciBBTEwgPSBbICd0eXBlJywgJyRjb21tZW50JyBdO1xuICB2YXIgS0VZV09SRFMgPSBbXG4gICAgJyRzY2hlbWEnLCAnJGlkJywgJ2lkJywgJyRkYXRhJywgJyRhc3luYycsICd0aXRsZScsXG4gICAgJ2Rlc2NyaXB0aW9uJywgJ2RlZmF1bHQnLCAnZGVmaW5pdGlvbnMnLFxuICAgICdleGFtcGxlcycsICdyZWFkT25seScsICd3cml0ZU9ubHknLFxuICAgICdjb250ZW50TWVkaWFUeXBlJywgJ2NvbnRlbnRFbmNvZGluZycsXG4gICAgJ2FkZGl0aW9uYWxJdGVtcycsICd0aGVuJywgJ2Vsc2UnXG4gIF07XG4gIHZhciBUWVBFUyA9IFsgJ251bWJlcicsICdpbnRlZ2VyJywgJ3N0cmluZycsICdhcnJheScsICdvYmplY3QnLCAnYm9vbGVhbicsICdudWxsJyBdO1xuICBSVUxFUy5hbGwgPSB0b0hhc2goQUxMKTtcbiAgUlVMRVMudHlwZXMgPSB0b0hhc2goVFlQRVMpO1xuXG4gIFJVTEVTLmZvckVhY2goZnVuY3Rpb24gKGdyb3VwKSB7XG4gICAgZ3JvdXAucnVsZXMgPSBncm91cC5ydWxlcy5tYXAoZnVuY3Rpb24gKGtleXdvcmQpIHtcbiAgICAgIHZhciBpbXBsS2V5d29yZHM7XG4gICAgICBpZiAodHlwZW9mIGtleXdvcmQgPT0gJ29iamVjdCcpIHtcbiAgICAgICAgdmFyIGtleSA9IE9iamVjdC5rZXlzKGtleXdvcmQpWzBdO1xuICAgICAgICBpbXBsS2V5d29yZHMgPSBrZXl3b3JkW2tleV07XG4gICAgICAgIGtleXdvcmQgPSBrZXk7XG4gICAgICAgIGltcGxLZXl3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICAgICAgQUxMLnB1c2goayk7XG4gICAgICAgICAgUlVMRVMuYWxsW2tdID0gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBBTEwucHVzaChrZXl3b3JkKTtcbiAgICAgIHZhciBydWxlID0gUlVMRVMuYWxsW2tleXdvcmRdID0ge1xuICAgICAgICBrZXl3b3JkOiBrZXl3b3JkLFxuICAgICAgICBjb2RlOiBydWxlTW9kdWxlc1trZXl3b3JkXSxcbiAgICAgICAgaW1wbGVtZW50czogaW1wbEtleXdvcmRzXG4gICAgICB9O1xuICAgICAgcmV0dXJuIHJ1bGU7XG4gICAgfSk7XG5cbiAgICBSVUxFUy5hbGwuJGNvbW1lbnQgPSB7XG4gICAgICBrZXl3b3JkOiAnJGNvbW1lbnQnLFxuICAgICAgY29kZTogcnVsZU1vZHVsZXMuJGNvbW1lbnRcbiAgICB9O1xuXG4gICAgaWYgKGdyb3VwLnR5cGUpIFJVTEVTLnR5cGVzW2dyb3VwLnR5cGVdID0gZ3JvdXA7XG4gIH0pO1xuXG4gIFJVTEVTLmtleXdvcmRzID0gdG9IYXNoKEFMTC5jb25jYXQoS0VZV09SRFMpKTtcbiAgUlVMRVMuY3VzdG9tID0ge307XG5cbiAgcmV0dXJuIFJVTEVTO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBTY2hlbWFPYmplY3Q7XG5cbmZ1bmN0aW9uIFNjaGVtYU9iamVjdChvYmopIHtcbiAgdXRpbC5jb3B5KG9iaiwgdGhpcyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvcHVueWNvZGUuanMgLSBwdW55Y29kZS51Y3MyLmRlY29kZVxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB1Y3MybGVuZ3RoKHN0cikge1xuICB2YXIgbGVuZ3RoID0gMFxuICAgICwgbGVuID0gc3RyLmxlbmd0aFxuICAgICwgcG9zID0gMFxuICAgICwgdmFsdWU7XG4gIHdoaWxlIChwb3MgPCBsZW4pIHtcbiAgICBsZW5ndGgrKztcbiAgICB2YWx1ZSA9IHN0ci5jaGFyQ29kZUF0KHBvcysrKTtcbiAgICBpZiAodmFsdWUgPj0gMHhEODAwICYmIHZhbHVlIDw9IDB4REJGRiAmJiBwb3MgPCBsZW4pIHtcbiAgICAgIC8vIGhpZ2ggc3Vycm9nYXRlLCBhbmQgdGhlcmUgaXMgYSBuZXh0IGNoYXJhY3RlclxuICAgICAgdmFsdWUgPSBzdHIuY2hhckNvZGVBdChwb3MpO1xuICAgICAgaWYgKCh2YWx1ZSAmIDB4RkMwMCkgPT0gMHhEQzAwKSBwb3MrKzsgLy8gbG93IHN1cnJvZ2F0ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gbGVuZ3RoO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29weTogY29weSxcbiAgY2hlY2tEYXRhVHlwZTogY2hlY2tEYXRhVHlwZSxcbiAgY2hlY2tEYXRhVHlwZXM6IGNoZWNrRGF0YVR5cGVzLFxuICBjb2VyY2VUb1R5cGVzOiBjb2VyY2VUb1R5cGVzLFxuICB0b0hhc2g6IHRvSGFzaCxcbiAgZ2V0UHJvcGVydHk6IGdldFByb3BlcnR5LFxuICBlc2NhcGVRdW90ZXM6IGVzY2FwZVF1b3RlcyxcbiAgZXF1YWw6IHJlcXVpcmUoJ2Zhc3QtZGVlcC1lcXVhbCcpLFxuICB1Y3MybGVuZ3RoOiByZXF1aXJlKCcuL3VjczJsZW5ndGgnKSxcbiAgdmFyT2NjdXJlbmNlczogdmFyT2NjdXJlbmNlcyxcbiAgdmFyUmVwbGFjZTogdmFyUmVwbGFjZSxcbiAgc2NoZW1hSGFzUnVsZXM6IHNjaGVtYUhhc1J1bGVzLFxuICBzY2hlbWFIYXNSdWxlc0V4Y2VwdDogc2NoZW1hSGFzUnVsZXNFeGNlcHQsXG4gIHNjaGVtYVVua25vd25SdWxlczogc2NoZW1hVW5rbm93blJ1bGVzLFxuICB0b1F1b3RlZFN0cmluZzogdG9RdW90ZWRTdHJpbmcsXG4gIGdldFBhdGhFeHByOiBnZXRQYXRoRXhwcixcbiAgZ2V0UGF0aDogZ2V0UGF0aCxcbiAgZ2V0RGF0YTogZ2V0RGF0YSxcbiAgdW5lc2NhcGVGcmFnbWVudDogdW5lc2NhcGVGcmFnbWVudCxcbiAgdW5lc2NhcGVKc29uUG9pbnRlcjogdW5lc2NhcGVKc29uUG9pbnRlcixcbiAgZXNjYXBlRnJhZ21lbnQ6IGVzY2FwZUZyYWdtZW50LFxuICBlc2NhcGVKc29uUG9pbnRlcjogZXNjYXBlSnNvblBvaW50ZXJcbn07XG5cblxuZnVuY3Rpb24gY29weShvLCB0bykge1xuICB0byA9IHRvIHx8IHt9O1xuICBmb3IgKHZhciBrZXkgaW4gbykgdG9ba2V5XSA9IG9ba2V5XTtcbiAgcmV0dXJuIHRvO1xufVxuXG5cbmZ1bmN0aW9uIGNoZWNrRGF0YVR5cGUoZGF0YVR5cGUsIGRhdGEsIHN0cmljdE51bWJlcnMsIG5lZ2F0ZSkge1xuICB2YXIgRVFVQUwgPSBuZWdhdGUgPyAnICE9PSAnIDogJyA9PT0gJ1xuICAgICwgQU5EID0gbmVnYXRlID8gJyB8fCAnIDogJyAmJiAnXG4gICAgLCBPSyA9IG5lZ2F0ZSA/ICchJyA6ICcnXG4gICAgLCBOT1QgPSBuZWdhdGUgPyAnJyA6ICchJztcbiAgc3dpdGNoIChkYXRhVHlwZSkge1xuICAgIGNhc2UgJ251bGwnOiByZXR1cm4gZGF0YSArIEVRVUFMICsgJ251bGwnO1xuICAgIGNhc2UgJ2FycmF5JzogcmV0dXJuIE9LICsgJ0FycmF5LmlzQXJyYXkoJyArIGRhdGEgKyAnKSc7XG4gICAgY2FzZSAnb2JqZWN0JzogcmV0dXJuICcoJyArIE9LICsgZGF0YSArIEFORCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICd0eXBlb2YgJyArIGRhdGEgKyBFUVVBTCArICdcIm9iamVjdFwiJyArIEFORCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgIE5PVCArICdBcnJheS5pc0FycmF5KCcgKyBkYXRhICsgJykpJztcbiAgICBjYXNlICdpbnRlZ2VyJzogcmV0dXJuICcodHlwZW9mICcgKyBkYXRhICsgRVFVQUwgKyAnXCJudW1iZXJcIicgKyBBTkQgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgTk9UICsgJygnICsgZGF0YSArICcgJSAxKScgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgQU5EICsgZGF0YSArIEVRVUFMICsgZGF0YSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAoc3RyaWN0TnVtYmVycyA/IChBTkQgKyBPSyArICdpc0Zpbml0ZSgnICsgZGF0YSArICcpJykgOiAnJykgKyAnKSc7XG4gICAgY2FzZSAnbnVtYmVyJzogcmV0dXJuICcodHlwZW9mICcgKyBkYXRhICsgRVFVQUwgKyAnXCInICsgZGF0YVR5cGUgKyAnXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKHN0cmljdE51bWJlcnMgPyAoQU5EICsgT0sgKyAnaXNGaW5pdGUoJyArIGRhdGEgKyAnKScpIDogJycpICsgJyknO1xuICAgIGRlZmF1bHQ6IHJldHVybiAndHlwZW9mICcgKyBkYXRhICsgRVFVQUwgKyAnXCInICsgZGF0YVR5cGUgKyAnXCInO1xuICB9XG59XG5cblxuZnVuY3Rpb24gY2hlY2tEYXRhVHlwZXMoZGF0YVR5cGVzLCBkYXRhLCBzdHJpY3ROdW1iZXJzKSB7XG4gIHN3aXRjaCAoZGF0YVR5cGVzLmxlbmd0aCkge1xuICAgIGNhc2UgMTogcmV0dXJuIGNoZWNrRGF0YVR5cGUoZGF0YVR5cGVzWzBdLCBkYXRhLCBzdHJpY3ROdW1iZXJzLCB0cnVlKTtcbiAgICBkZWZhdWx0OlxuICAgICAgdmFyIGNvZGUgPSAnJztcbiAgICAgIHZhciB0eXBlcyA9IHRvSGFzaChkYXRhVHlwZXMpO1xuICAgICAgaWYgKHR5cGVzLmFycmF5ICYmIHR5cGVzLm9iamVjdCkge1xuICAgICAgICBjb2RlID0gdHlwZXMubnVsbCA/ICcoJzogJyghJyArIGRhdGEgKyAnIHx8ICc7XG4gICAgICAgIGNvZGUgKz0gJ3R5cGVvZiAnICsgZGF0YSArICcgIT09IFwib2JqZWN0XCIpJztcbiAgICAgICAgZGVsZXRlIHR5cGVzLm51bGw7XG4gICAgICAgIGRlbGV0ZSB0eXBlcy5hcnJheTtcbiAgICAgICAgZGVsZXRlIHR5cGVzLm9iamVjdDtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlcy5udW1iZXIpIGRlbGV0ZSB0eXBlcy5pbnRlZ2VyO1xuICAgICAgZm9yICh2YXIgdCBpbiB0eXBlcylcbiAgICAgICAgY29kZSArPSAoY29kZSA/ICcgJiYgJyA6ICcnICkgKyBjaGVja0RhdGFUeXBlKHQsIGRhdGEsIHN0cmljdE51bWJlcnMsIHRydWUpO1xuXG4gICAgICByZXR1cm4gY29kZTtcbiAgfVxufVxuXG5cbnZhciBDT0VSQ0VfVE9fVFlQRVMgPSB0b0hhc2goWyAnc3RyaW5nJywgJ251bWJlcicsICdpbnRlZ2VyJywgJ2Jvb2xlYW4nLCAnbnVsbCcgXSk7XG5mdW5jdGlvbiBjb2VyY2VUb1R5cGVzKG9wdGlvbkNvZXJjZVR5cGVzLCBkYXRhVHlwZXMpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YVR5cGVzKSkge1xuICAgIHZhciB0eXBlcyA9IFtdO1xuICAgIGZvciAodmFyIGk9MDsgaTxkYXRhVHlwZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB0ID0gZGF0YVR5cGVzW2ldO1xuICAgICAgaWYgKENPRVJDRV9UT19UWVBFU1t0XSkgdHlwZXNbdHlwZXMubGVuZ3RoXSA9IHQ7XG4gICAgICBlbHNlIGlmIChvcHRpb25Db2VyY2VUeXBlcyA9PT0gJ2FycmF5JyAmJiB0ID09PSAnYXJyYXknKSB0eXBlc1t0eXBlcy5sZW5ndGhdID0gdDtcbiAgICB9XG4gICAgaWYgKHR5cGVzLmxlbmd0aCkgcmV0dXJuIHR5cGVzO1xuICB9IGVsc2UgaWYgKENPRVJDRV9UT19UWVBFU1tkYXRhVHlwZXNdKSB7XG4gICAgcmV0dXJuIFtkYXRhVHlwZXNdO1xuICB9IGVsc2UgaWYgKG9wdGlvbkNvZXJjZVR5cGVzID09PSAnYXJyYXknICYmIGRhdGFUeXBlcyA9PT0gJ2FycmF5Jykge1xuICAgIHJldHVybiBbJ2FycmF5J107XG4gIH1cbn1cblxuXG5mdW5jdGlvbiB0b0hhc2goYXJyKSB7XG4gIHZhciBoYXNoID0ge307XG4gIGZvciAodmFyIGk9MDsgaTxhcnIubGVuZ3RoOyBpKyspIGhhc2hbYXJyW2ldXSA9IHRydWU7XG4gIHJldHVybiBoYXNoO1xufVxuXG5cbnZhciBJREVOVElGSUVSID0gL15bYS16JF9dW2EteiRfMC05XSokL2k7XG52YXIgU0lOR0xFX1FVT1RFID0gLyd8XFxcXC9nO1xuZnVuY3Rpb24gZ2V0UHJvcGVydHkoa2V5KSB7XG4gIHJldHVybiB0eXBlb2Yga2V5ID09ICdudW1iZXInXG4gICAgICAgICAgPyAnWycgKyBrZXkgKyAnXSdcbiAgICAgICAgICA6IElERU5USUZJRVIudGVzdChrZXkpXG4gICAgICAgICAgICA/ICcuJyArIGtleVxuICAgICAgICAgICAgOiBcIlsnXCIgKyBlc2NhcGVRdW90ZXMoa2V5KSArIFwiJ11cIjtcbn1cblxuXG5mdW5jdGlvbiBlc2NhcGVRdW90ZXMoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZShTSU5HTEVfUVVPVEUsICdcXFxcJCYnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcci9nLCAnXFxcXHInKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcZi9nLCAnXFxcXGYnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKTtcbn1cblxuXG5mdW5jdGlvbiB2YXJPY2N1cmVuY2VzKHN0ciwgZGF0YVZhcikge1xuICBkYXRhVmFyICs9ICdbXjAtOV0nO1xuICB2YXIgbWF0Y2hlcyA9IHN0ci5tYXRjaChuZXcgUmVnRXhwKGRhdGFWYXIsICdnJykpO1xuICByZXR1cm4gbWF0Y2hlcyA/IG1hdGNoZXMubGVuZ3RoIDogMDtcbn1cblxuXG5mdW5jdGlvbiB2YXJSZXBsYWNlKHN0ciwgZGF0YVZhciwgZXhwcikge1xuICBkYXRhVmFyICs9ICcoW14wLTldKSc7XG4gIGV4cHIgPSBleHByLnJlcGxhY2UoL1xcJC9nLCAnJCQkJCcpO1xuICByZXR1cm4gc3RyLnJlcGxhY2UobmV3IFJlZ0V4cChkYXRhVmFyLCAnZycpLCBleHByICsgJyQxJyk7XG59XG5cblxuZnVuY3Rpb24gc2NoZW1hSGFzUnVsZXMoc2NoZW1hLCBydWxlcykge1xuICBpZiAodHlwZW9mIHNjaGVtYSA9PSAnYm9vbGVhbicpIHJldHVybiAhc2NoZW1hO1xuICBmb3IgKHZhciBrZXkgaW4gc2NoZW1hKSBpZiAocnVsZXNba2V5XSkgcmV0dXJuIHRydWU7XG59XG5cblxuZnVuY3Rpb24gc2NoZW1hSGFzUnVsZXNFeGNlcHQoc2NoZW1hLCBydWxlcywgZXhjZXB0S2V5d29yZCkge1xuICBpZiAodHlwZW9mIHNjaGVtYSA9PSAnYm9vbGVhbicpIHJldHVybiAhc2NoZW1hICYmIGV4Y2VwdEtleXdvcmQgIT0gJ25vdCc7XG4gIGZvciAodmFyIGtleSBpbiBzY2hlbWEpIGlmIChrZXkgIT0gZXhjZXB0S2V5d29yZCAmJiBydWxlc1trZXldKSByZXR1cm4gdHJ1ZTtcbn1cblxuXG5mdW5jdGlvbiBzY2hlbWFVbmtub3duUnVsZXMoc2NoZW1hLCBydWxlcykge1xuICBpZiAodHlwZW9mIHNjaGVtYSA9PSAnYm9vbGVhbicpIHJldHVybjtcbiAgZm9yICh2YXIga2V5IGluIHNjaGVtYSkgaWYgKCFydWxlc1trZXldKSByZXR1cm4ga2V5O1xufVxuXG5cbmZ1bmN0aW9uIHRvUXVvdGVkU3RyaW5nKHN0cikge1xuICByZXR1cm4gJ1xcJycgKyBlc2NhcGVRdW90ZXMoc3RyKSArICdcXCcnO1xufVxuXG5cbmZ1bmN0aW9uIGdldFBhdGhFeHByKGN1cnJlbnRQYXRoLCBleHByLCBqc29uUG9pbnRlcnMsIGlzTnVtYmVyKSB7XG4gIHZhciBwYXRoID0ganNvblBvaW50ZXJzIC8vIGZhbHNlIGJ5IGRlZmF1bHRcbiAgICAgICAgICAgICAgPyAnXFwnL1xcJyArICcgKyBleHByICsgKGlzTnVtYmVyID8gJycgOiAnLnJlcGxhY2UoL34vZywgXFwnfjBcXCcpLnJlcGxhY2UoL1xcXFwvL2csIFxcJ34xXFwnKScpXG4gICAgICAgICAgICAgIDogKGlzTnVtYmVyID8gJ1xcJ1tcXCcgKyAnICsgZXhwciArICcgKyBcXCddXFwnJyA6ICdcXCdbXFxcXFxcJ1xcJyArICcgKyBleHByICsgJyArIFxcJ1xcXFxcXCddXFwnJyk7XG4gIHJldHVybiBqb2luUGF0aHMoY3VycmVudFBhdGgsIHBhdGgpO1xufVxuXG5cbmZ1bmN0aW9uIGdldFBhdGgoY3VycmVudFBhdGgsIHByb3AsIGpzb25Qb2ludGVycykge1xuICB2YXIgcGF0aCA9IGpzb25Qb2ludGVycyAvLyBmYWxzZSBieSBkZWZhdWx0XG4gICAgICAgICAgICAgID8gdG9RdW90ZWRTdHJpbmcoJy8nICsgZXNjYXBlSnNvblBvaW50ZXIocHJvcCkpXG4gICAgICAgICAgICAgIDogdG9RdW90ZWRTdHJpbmcoZ2V0UHJvcGVydHkocHJvcCkpO1xuICByZXR1cm4gam9pblBhdGhzKGN1cnJlbnRQYXRoLCBwYXRoKTtcbn1cblxuXG52YXIgSlNPTl9QT0lOVEVSID0gL15cXC8oPzpbXn5dfH4wfH4xKSokLztcbnZhciBSRUxBVElWRV9KU09OX1BPSU5URVIgPSAvXihbMC05XSspKCN8XFwvKD86W15+XXx+MHx+MSkqKT8kLztcbmZ1bmN0aW9uIGdldERhdGEoJGRhdGEsIGx2bCwgcGF0aHMpIHtcbiAgdmFyIHVwLCBqc29uUG9pbnRlciwgZGF0YSwgbWF0Y2hlcztcbiAgaWYgKCRkYXRhID09PSAnJykgcmV0dXJuICdyb290RGF0YSc7XG4gIGlmICgkZGF0YVswXSA9PSAnLycpIHtcbiAgICBpZiAoIUpTT05fUE9JTlRFUi50ZXN0KCRkYXRhKSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEpTT04tcG9pbnRlcjogJyArICRkYXRhKTtcbiAgICBqc29uUG9pbnRlciA9ICRkYXRhO1xuICAgIGRhdGEgPSAncm9vdERhdGEnO1xuICB9IGVsc2Uge1xuICAgIG1hdGNoZXMgPSAkZGF0YS5tYXRjaChSRUxBVElWRV9KU09OX1BPSU5URVIpO1xuICAgIGlmICghbWF0Y2hlcykgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEpTT04tcG9pbnRlcjogJyArICRkYXRhKTtcbiAgICB1cCA9ICttYXRjaGVzWzFdO1xuICAgIGpzb25Qb2ludGVyID0gbWF0Y2hlc1syXTtcbiAgICBpZiAoanNvblBvaW50ZXIgPT0gJyMnKSB7XG4gICAgICBpZiAodXAgPj0gbHZsKSB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBhY2Nlc3MgcHJvcGVydHkvaW5kZXggJyArIHVwICsgJyBsZXZlbHMgdXAsIGN1cnJlbnQgbGV2ZWwgaXMgJyArIGx2bCk7XG4gICAgICByZXR1cm4gcGF0aHNbbHZsIC0gdXBdO1xuICAgIH1cblxuICAgIGlmICh1cCA+IGx2bCkgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgYWNjZXNzIGRhdGEgJyArIHVwICsgJyBsZXZlbHMgdXAsIGN1cnJlbnQgbGV2ZWwgaXMgJyArIGx2bCk7XG4gICAgZGF0YSA9ICdkYXRhJyArICgobHZsIC0gdXApIHx8ICcnKTtcbiAgICBpZiAoIWpzb25Qb2ludGVyKSByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHZhciBleHByID0gZGF0YTtcbiAgdmFyIHNlZ21lbnRzID0ganNvblBvaW50ZXIuc3BsaXQoJy8nKTtcbiAgZm9yICh2YXIgaT0wOyBpPHNlZ21lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlZ21lbnQgPSBzZWdtZW50c1tpXTtcbiAgICBpZiAoc2VnbWVudCkge1xuICAgICAgZGF0YSArPSBnZXRQcm9wZXJ0eSh1bmVzY2FwZUpzb25Qb2ludGVyKHNlZ21lbnQpKTtcbiAgICAgIGV4cHIgKz0gJyAmJiAnICsgZGF0YTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGV4cHI7XG59XG5cblxuZnVuY3Rpb24gam9pblBhdGhzIChhLCBiKSB7XG4gIGlmIChhID09ICdcIlwiJykgcmV0dXJuIGI7XG4gIHJldHVybiAoYSArICcgKyAnICsgYikucmVwbGFjZSgvKFteXFxcXF0pJyBcXCsgJy9nLCAnJDEnKTtcbn1cblxuXG5mdW5jdGlvbiB1bmVzY2FwZUZyYWdtZW50KHN0cikge1xuICByZXR1cm4gdW5lc2NhcGVKc29uUG9pbnRlcihkZWNvZGVVUklDb21wb25lbnQoc3RyKSk7XG59XG5cblxuZnVuY3Rpb24gZXNjYXBlRnJhZ21lbnQoc3RyKSB7XG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoZXNjYXBlSnNvblBvaW50ZXIoc3RyKSk7XG59XG5cblxuZnVuY3Rpb24gZXNjYXBlSnNvblBvaW50ZXIoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvfi9nLCAnfjAnKS5yZXBsYWNlKC9cXC8vZywgJ34xJyk7XG59XG5cblxuZnVuY3Rpb24gdW5lc2NhcGVKc29uUG9pbnRlcihzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9+MS9nLCAnLycpLnJlcGxhY2UoL34wL2csICd+Jyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBLRVlXT1JEUyA9IFtcbiAgJ211bHRpcGxlT2YnLFxuICAnbWF4aW11bScsXG4gICdleGNsdXNpdmVNYXhpbXVtJyxcbiAgJ21pbmltdW0nLFxuICAnZXhjbHVzaXZlTWluaW11bScsXG4gICdtYXhMZW5ndGgnLFxuICAnbWluTGVuZ3RoJyxcbiAgJ3BhdHRlcm4nLFxuICAnYWRkaXRpb25hbEl0ZW1zJyxcbiAgJ21heEl0ZW1zJyxcbiAgJ21pbkl0ZW1zJyxcbiAgJ3VuaXF1ZUl0ZW1zJyxcbiAgJ21heFByb3BlcnRpZXMnLFxuICAnbWluUHJvcGVydGllcycsXG4gICdyZXF1aXJlZCcsXG4gICdhZGRpdGlvbmFsUHJvcGVydGllcycsXG4gICdlbnVtJyxcbiAgJ2Zvcm1hdCcsXG4gICdjb25zdCdcbl07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG1ldGFTY2hlbWEsIGtleXdvcmRzSnNvblBvaW50ZXJzKSB7XG4gIGZvciAodmFyIGk9MDsgaTxrZXl3b3Jkc0pzb25Qb2ludGVycy5sZW5ndGg7IGkrKykge1xuICAgIG1ldGFTY2hlbWEgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG1ldGFTY2hlbWEpKTtcbiAgICB2YXIgc2VnbWVudHMgPSBrZXl3b3Jkc0pzb25Qb2ludGVyc1tpXS5zcGxpdCgnLycpO1xuICAgIHZhciBrZXl3b3JkcyA9IG1ldGFTY2hlbWE7XG4gICAgdmFyIGo7XG4gICAgZm9yIChqPTE7IGo8c2VnbWVudHMubGVuZ3RoOyBqKyspXG4gICAgICBrZXl3b3JkcyA9IGtleXdvcmRzW3NlZ21lbnRzW2pdXTtcblxuICAgIGZvciAoaj0wOyBqPEtFWVdPUkRTLmxlbmd0aDsgaisrKSB7XG4gICAgICB2YXIga2V5ID0gS0VZV09SRFNbal07XG4gICAgICB2YXIgc2NoZW1hID0ga2V5d29yZHNba2V5XTtcbiAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAga2V5d29yZHNba2V5XSA9IHtcbiAgICAgICAgICBhbnlPZjogW1xuICAgICAgICAgICAgc2NoZW1hLFxuICAgICAgICAgICAgeyAkcmVmOiAnaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2Fqdi12YWxpZGF0b3IvYWp2L21hc3Rlci9saWIvcmVmcy9kYXRhLmpzb24jJyB9XG4gICAgICAgICAgXVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtZXRhU2NoZW1hO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG1ldGFTY2hlbWEgPSByZXF1aXJlKCcuL3JlZnMvanNvbi1zY2hlbWEtZHJhZnQtMDcuanNvbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgJGlkOiAnaHR0cHM6Ly9naXRodWIuY29tL2Fqdi12YWxpZGF0b3IvYWp2L2Jsb2IvbWFzdGVyL2xpYi9kZWZpbml0aW9uX3NjaGVtYS5qcycsXG4gIGRlZmluaXRpb25zOiB7XG4gICAgc2ltcGxlVHlwZXM6IG1ldGFTY2hlbWEuZGVmaW5pdGlvbnMuc2ltcGxlVHlwZXNcbiAgfSxcbiAgdHlwZTogJ29iamVjdCcsXG4gIGRlcGVuZGVuY2llczoge1xuICAgIHNjaGVtYTogWyd2YWxpZGF0ZSddLFxuICAgICRkYXRhOiBbJ3ZhbGlkYXRlJ10sXG4gICAgc3RhdGVtZW50czogWydpbmxpbmUnXSxcbiAgICB2YWxpZDoge25vdDoge3JlcXVpcmVkOiBbJ21hY3JvJ119fVxuICB9LFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgdHlwZTogbWV0YVNjaGVtYS5wcm9wZXJ0aWVzLnR5cGUsXG4gICAgc2NoZW1hOiB7dHlwZTogJ2Jvb2xlYW4nfSxcbiAgICBzdGF0ZW1lbnRzOiB7dHlwZTogJ2Jvb2xlYW4nfSxcbiAgICBkZXBlbmRlbmNpZXM6IHtcbiAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICBpdGVtczoge3R5cGU6ICdzdHJpbmcnfVxuICAgIH0sXG4gICAgbWV0YVNjaGVtYToge3R5cGU6ICdvYmplY3QnfSxcbiAgICBtb2RpZnlpbmc6IHt0eXBlOiAnYm9vbGVhbid9LFxuICAgIHZhbGlkOiB7dHlwZTogJ2Jvb2xlYW4nfSxcbiAgICAkZGF0YToge3R5cGU6ICdib29sZWFuJ30sXG4gICAgYXN5bmM6IHt0eXBlOiAnYm9vbGVhbid9LFxuICAgIGVycm9yczoge1xuICAgICAgYW55T2Y6IFtcbiAgICAgICAge3R5cGU6ICdib29sZWFuJ30sXG4gICAgICAgIHtjb25zdDogJ2Z1bGwnfVxuICAgICAgXVxuICAgIH1cbiAgfVxufTtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfX2xpbWl0KGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZXJyb3JLZXl3b3JkO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgdmFyICRpc01heCA9ICRrZXl3b3JkID09ICdtYXhpbXVtJyxcbiAgICAkZXhjbHVzaXZlS2V5d29yZCA9ICRpc01heCA/ICdleGNsdXNpdmVNYXhpbXVtJyA6ICdleGNsdXNpdmVNaW5pbXVtJyxcbiAgICAkc2NoZW1hRXhjbCA9IGl0LnNjaGVtYVskZXhjbHVzaXZlS2V5d29yZF0sXG4gICAgJGlzRGF0YUV4Y2wgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWFFeGNsICYmICRzY2hlbWFFeGNsLiRkYXRhLFxuICAgICRvcCA9ICRpc01heCA/ICc8JyA6ICc+JyxcbiAgICAkbm90T3AgPSAkaXNNYXggPyAnPicgOiAnPCcsXG4gICAgJGVycm9yS2V5d29yZCA9IHVuZGVmaW5lZDtcbiAgaWYgKCEoJGlzRGF0YSB8fCB0eXBlb2YgJHNjaGVtYSA9PSAnbnVtYmVyJyB8fCAkc2NoZW1hID09PSB1bmRlZmluZWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCRrZXl3b3JkICsgJyBtdXN0IGJlIG51bWJlcicpO1xuICB9XG4gIGlmICghKCRpc0RhdGFFeGNsIHx8ICRzY2hlbWFFeGNsID09PSB1bmRlZmluZWQgfHwgdHlwZW9mICRzY2hlbWFFeGNsID09ICdudW1iZXInIHx8IHR5cGVvZiAkc2NoZW1hRXhjbCA9PSAnYm9vbGVhbicpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCRleGNsdXNpdmVLZXl3b3JkICsgJyBtdXN0IGJlIG51bWJlciBvciBib29sZWFuJyk7XG4gIH1cbiAgaWYgKCRpc0RhdGFFeGNsKSB7XG4gICAgdmFyICRzY2hlbWFWYWx1ZUV4Y2wgPSBpdC51dGlsLmdldERhdGEoJHNjaGVtYUV4Y2wuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFyciksXG4gICAgICAkZXhjbHVzaXZlID0gJ2V4Y2x1c2l2ZScgKyAkbHZsLFxuICAgICAgJGV4Y2xUeXBlID0gJ2V4Y2xUeXBlJyArICRsdmwsXG4gICAgICAkZXhjbElzTnVtYmVyID0gJ2V4Y2xJc051bWJlcicgKyAkbHZsLFxuICAgICAgJG9wRXhwciA9ICdvcCcgKyAkbHZsLFxuICAgICAgJG9wU3RyID0gJ1xcJyArICcgKyAkb3BFeHByICsgJyArIFxcJyc7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYUV4Y2wnICsgKCRsdmwpICsgJyA9ICcgKyAoJHNjaGVtYVZhbHVlRXhjbCkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZUV4Y2wgPSAnc2NoZW1hRXhjbCcgKyAkbHZsO1xuICAgIG91dCArPSAnIHZhciAnICsgKCRleGNsdXNpdmUpICsgJzsgdmFyICcgKyAoJGV4Y2xUeXBlKSArICcgPSB0eXBlb2YgJyArICgkc2NoZW1hVmFsdWVFeGNsKSArICc7IGlmICgnICsgKCRleGNsVHlwZSkgKyAnICE9IFxcJ2Jvb2xlYW5cXCcgJiYgJyArICgkZXhjbFR5cGUpICsgJyAhPSBcXCd1bmRlZmluZWRcXCcgJiYgJyArICgkZXhjbFR5cGUpICsgJyAhPSBcXCdudW1iZXJcXCcpIHsgJztcbiAgICB2YXIgJGVycm9yS2V5d29yZCA9ICRleGNsdXNpdmVLZXl3b3JkO1xuICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ19leGNsdXNpdmVMaW1pdCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHt9ICc7XG4gICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCcnICsgKCRleGNsdXNpdmVLZXl3b3JkKSArICcgc2hvdWxkIGJlIGJvb2xlYW5cXCcgJztcbiAgICAgIH1cbiAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcge30gJztcbiAgICB9XG4gICAgdmFyIF9fZXJyID0gb3V0O1xuICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9IGVsc2UgaWYgKCAnO1xuICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ251bWJlclxcJykgfHwgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgJyArICgkZXhjbFR5cGUpICsgJyA9PSBcXCdudW1iZXJcXCcgPyAoICgnICsgKCRleGNsdXNpdmUpICsgJyA9ICcgKyAoJHNjaGVtYVZhbHVlKSArICcgPT09IHVuZGVmaW5lZCB8fCAnICsgKCRzY2hlbWFWYWx1ZUV4Y2wpICsgJyAnICsgKCRvcCkgKyAnPSAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnKSA/ICcgKyAoJGRhdGEpICsgJyAnICsgKCRub3RPcCkgKyAnPSAnICsgKCRzY2hlbWFWYWx1ZUV4Y2wpICsgJyA6ICcgKyAoJGRhdGEpICsgJyAnICsgKCRub3RPcCkgKyAnICcgKyAoJHNjaGVtYVZhbHVlKSArICcgKSA6ICggKCcgKyAoJGV4Y2x1c2l2ZSkgKyAnID0gJyArICgkc2NoZW1hVmFsdWVFeGNsKSArICcgPT09IHRydWUpID8gJyArICgkZGF0YSkgKyAnICcgKyAoJG5vdE9wKSArICc9ICcgKyAoJHNjaGVtYVZhbHVlKSArICcgOiAnICsgKCRkYXRhKSArICcgJyArICgkbm90T3ApICsgJyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICkgfHwgJyArICgkZGF0YSkgKyAnICE9PSAnICsgKCRkYXRhKSArICcpIHsgdmFyIG9wJyArICgkbHZsKSArICcgPSAnICsgKCRleGNsdXNpdmUpICsgJyA/IFxcJycgKyAoJG9wKSArICdcXCcgOiBcXCcnICsgKCRvcCkgKyAnPVxcJzsgJztcbiAgICBpZiAoJHNjaGVtYSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAkZXJyb3JLZXl3b3JkID0gJGV4Y2x1c2l2ZUtleXdvcmQ7XG4gICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAkZXhjbHVzaXZlS2V5d29yZDtcbiAgICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWFWYWx1ZUV4Y2w7XG4gICAgICAkaXNEYXRhID0gJGlzRGF0YUV4Y2w7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciAkZXhjbElzTnVtYmVyID0gdHlwZW9mICRzY2hlbWFFeGNsID09ICdudW1iZXInLFxuICAgICAgJG9wU3RyID0gJG9wO1xuICAgIGlmICgkZXhjbElzTnVtYmVyICYmICRpc0RhdGEpIHtcbiAgICAgIHZhciAkb3BFeHByID0gJ1xcJycgKyAkb3BTdHIgKyAnXFwnJztcbiAgICAgIG91dCArPSAnIGlmICggJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAnICgnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mICcgKyAoJHNjaGVtYVZhbHVlKSArICcgIT0gXFwnbnVtYmVyXFwnKSB8fCAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgKCAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnID09PSB1bmRlZmluZWQgfHwgJyArICgkc2NoZW1hRXhjbCkgKyAnICcgKyAoJG9wKSArICc9ICcgKyAoJHNjaGVtYVZhbHVlKSArICcgPyAnICsgKCRkYXRhKSArICcgJyArICgkbm90T3ApICsgJz0gJyArICgkc2NoZW1hRXhjbCkgKyAnIDogJyArICgkZGF0YSkgKyAnICcgKyAoJG5vdE9wKSArICcgJyArICgkc2NoZW1hVmFsdWUpICsgJyApIHx8ICcgKyAoJGRhdGEpICsgJyAhPT0gJyArICgkZGF0YSkgKyAnKSB7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICgkZXhjbElzTnVtYmVyICYmICRzY2hlbWEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAkZXhjbHVzaXZlID0gdHJ1ZTtcbiAgICAgICAgJGVycm9yS2V5d29yZCA9ICRleGNsdXNpdmVLZXl3b3JkO1xuICAgICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAkZXhjbHVzaXZlS2V5d29yZDtcbiAgICAgICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYUV4Y2w7XG4gICAgICAgICRub3RPcCArPSAnPSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoJGV4Y2xJc051bWJlcikgJHNjaGVtYVZhbHVlID0gTWF0aFskaXNNYXggPyAnbWluJyA6ICdtYXgnXSgkc2NoZW1hRXhjbCwgJHNjaGVtYSk7XG4gICAgICAgIGlmICgkc2NoZW1hRXhjbCA9PT0gKCRleGNsSXNOdW1iZXIgPyAkc2NoZW1hVmFsdWUgOiB0cnVlKSkge1xuICAgICAgICAgICRleGNsdXNpdmUgPSB0cnVlO1xuICAgICAgICAgICRlcnJvcktleXdvcmQgPSAkZXhjbHVzaXZlS2V5d29yZDtcbiAgICAgICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAkZXhjbHVzaXZlS2V5d29yZDtcbiAgICAgICAgICAkbm90T3AgKz0gJz0nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRleGNsdXNpdmUgPSBmYWxzZTtcbiAgICAgICAgICAkb3BTdHIgKz0gJz0nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgJG9wRXhwciA9ICdcXCcnICsgJG9wU3RyICsgJ1xcJyc7XG4gICAgICBvdXQgKz0gJyBpZiAoICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ251bWJlclxcJykgfHwgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnICcgKyAoJGRhdGEpICsgJyAnICsgKCRub3RPcCkgKyAnICcgKyAoJHNjaGVtYVZhbHVlKSArICcgfHwgJyArICgkZGF0YSkgKyAnICE9PSAnICsgKCRkYXRhKSArICcpIHsgJztcbiAgICB9XG4gIH1cbiAgJGVycm9yS2V5d29yZCA9ICRlcnJvcktleXdvcmQgfHwgJGtleXdvcmQ7XG4gIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgkZXJyb3JLZXl3b3JkIHx8ICdfbGltaXQnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGNvbXBhcmlzb246ICcgKyAoJG9wRXhwcikgKyAnLCBsaW1pdDogJyArICgkc2NoZW1hVmFsdWUpICsgJywgZXhjbHVzaXZlOiAnICsgKCRleGNsdXNpdmUpICsgJyB9ICc7XG4gICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBiZSAnICsgKCRvcFN0cikgKyAnICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ1xcJyArICcgKyAoJHNjaGVtYVZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArICgkc2NoZW1hVmFsdWUpICsgJ1xcJyc7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnIH0gJztcbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9fbGltaXRJdGVtcyhpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGVycm9yS2V5d29yZDtcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICRpc0RhdGEgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWEgJiYgJHNjaGVtYS4kZGF0YSxcbiAgICAkc2NoZW1hVmFsdWU7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLmdldERhdGEoJHNjaGVtYS4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgfSBlbHNlIHtcbiAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hO1xuICB9XG4gIGlmICghKCRpc0RhdGEgfHwgdHlwZW9mICRzY2hlbWEgPT0gJ251bWJlcicpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCRrZXl3b3JkICsgJyBtdXN0IGJlIG51bWJlcicpO1xuICB9XG4gIHZhciAkb3AgPSAka2V5d29yZCA9PSAnbWF4SXRlbXMnID8gJz4nIDogJzwnO1xuICBvdXQgKz0gJ2lmICggJztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ251bWJlclxcJykgfHwgJztcbiAgfVxuICBvdXQgKz0gJyAnICsgKCRkYXRhKSArICcubGVuZ3RoICcgKyAoJG9wKSArICcgJyArICgkc2NoZW1hVmFsdWUpICsgJykgeyAnO1xuICB2YXIgJGVycm9yS2V5d29yZCA9ICRrZXl3b3JkO1xuICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJGVycm9yS2V5d29yZCB8fCAnX2xpbWl0SXRlbXMnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGxpbWl0OiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIE5PVCBoYXZlICc7XG4gICAgICBpZiAoJGtleXdvcmQgPT0gJ21heEl0ZW1zJykge1xuICAgICAgICBvdXQgKz0gJ21vcmUnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICdmZXdlcic7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB0aGFuICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ1xcJyArICcgKyAoJHNjaGVtYVZhbHVlKSArICcgKyBcXCcnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKCRzY2hlbWEpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgaXRlbXNcXCcgJztcbiAgICB9XG4gICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6ICAnO1xuICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgb3V0ICs9ICd2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArICgkc2NoZW1hKTtcbiAgICAgIH1cbiAgICAgIG91dCArPSAnICAgICAgICAgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB7fSAnO1xuICB9XG4gIHZhciBfX2VyciA9IG91dDtcbiAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gIH1cbiAgb3V0ICs9ICd9ICc7XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfX2xpbWl0TGVuZ3RoKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZXJyb3JLZXl3b3JkO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgaWYgKCEoJGlzRGF0YSB8fCB0eXBlb2YgJHNjaGVtYSA9PSAnbnVtYmVyJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJGtleXdvcmQgKyAnIG11c3QgYmUgbnVtYmVyJyk7XG4gIH1cbiAgdmFyICRvcCA9ICRrZXl3b3JkID09ICdtYXhMZW5ndGgnID8gJz4nIDogJzwnO1xuICBvdXQgKz0gJ2lmICggJztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ251bWJlclxcJykgfHwgJztcbiAgfVxuICBpZiAoaXQub3B0cy51bmljb2RlID09PSBmYWxzZSkge1xuICAgIG91dCArPSAnICcgKyAoJGRhdGEpICsgJy5sZW5ndGggJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB1Y3MybGVuZ3RoKCcgKyAoJGRhdGEpICsgJykgJztcbiAgfVxuICBvdXQgKz0gJyAnICsgKCRvcCkgKyAnICcgKyAoJHNjaGVtYVZhbHVlKSArICcpIHsgJztcbiAgdmFyICRlcnJvcktleXdvcmQgPSAka2V5d29yZDtcbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ19saW1pdExlbmd0aCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbGltaXQ6ICcgKyAoJHNjaGVtYVZhbHVlKSArICcgfSAnO1xuICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgTk9UIGJlICc7XG4gICAgICBpZiAoJGtleXdvcmQgPT0gJ21heExlbmd0aCcpIHtcbiAgICAgICAgb3V0ICs9ICdsb25nZXInO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICdzaG9ydGVyJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIHRoYW4gJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAnXFwnICsgJyArICgkc2NoZW1hVmFsdWUpICsgJyArIFxcJyc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyBjaGFyYWN0ZXJzXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnfSAnO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX19saW1pdFByb3BlcnRpZXMoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRlcnJvcktleXdvcmQ7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkaXNEYXRhID0gaXQub3B0cy4kZGF0YSAmJiAkc2NoZW1hICYmICRzY2hlbWEuJGRhdGEsXG4gICAgJHNjaGVtYVZhbHVlO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciBzY2hlbWEnICsgKCRsdmwpICsgJyA9ICcgKyAoaXQudXRpbC5nZXREYXRhKCRzY2hlbWEuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFycikpICsgJzsgJztcbiAgICAkc2NoZW1hVmFsdWUgPSAnc2NoZW1hJyArICRsdmw7XG4gIH0gZWxzZSB7XG4gICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYTtcbiAgfVxuICBpZiAoISgkaXNEYXRhIHx8IHR5cGVvZiAkc2NoZW1hID09ICdudW1iZXInKSkge1xuICAgIHRocm93IG5ldyBFcnJvcigka2V5d29yZCArICcgbXVzdCBiZSBudW1iZXInKTtcbiAgfVxuICB2YXIgJG9wID0gJGtleXdvcmQgPT0gJ21heFByb3BlcnRpZXMnID8gJz4nIDogJzwnO1xuICBvdXQgKz0gJ2lmICggJztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ251bWJlclxcJykgfHwgJztcbiAgfVxuICBvdXQgKz0gJyBPYmplY3Qua2V5cygnICsgKCRkYXRhKSArICcpLmxlbmd0aCAnICsgKCRvcCkgKyAnICcgKyAoJHNjaGVtYVZhbHVlKSArICcpIHsgJztcbiAgdmFyICRlcnJvcktleXdvcmQgPSAka2V5d29yZDtcbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ19saW1pdFByb3BlcnRpZXMnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGxpbWl0OiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIE5PVCBoYXZlICc7XG4gICAgICBpZiAoJGtleXdvcmQgPT0gJ21heFByb3BlcnRpZXMnKSB7XG4gICAgICAgIG91dCArPSAnbW9yZSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJ2Zld2VyJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIHRoYW4gJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAnXFwnICsgJyArICgkc2NoZW1hVmFsdWUpICsgJyArIFxcJyc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyBwcm9wZXJ0aWVzXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnfSAnO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2FsbE9mKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGl0ID0gaXQudXRpbC5jb3B5KGl0KTtcbiAgdmFyICRjbG9zaW5nQnJhY2VzID0gJyc7XG4gICRpdC5sZXZlbCsrO1xuICB2YXIgJG5leHRWYWxpZCA9ICd2YWxpZCcgKyAkaXQubGV2ZWw7XG4gIHZhciAkY3VycmVudEJhc2VJZCA9ICRpdC5iYXNlSWQsXG4gICAgJGFsbFNjaGVtYXNFbXB0eSA9IHRydWU7XG4gIHZhciBhcnIxID0gJHNjaGVtYTtcbiAgaWYgKGFycjEpIHtcbiAgICB2YXIgJHNjaCwgJGkgPSAtMSxcbiAgICAgIGwxID0gYXJyMS5sZW5ndGggLSAxO1xuICAgIHdoaWxlICgkaSA8IGwxKSB7XG4gICAgICAkc2NoID0gYXJyMVskaSArPSAxXTtcbiAgICAgIGlmICgoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHNjaCA9PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cygkc2NoKS5sZW5ndGggPiAwKSB8fCAkc2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHNjaCwgaXQuUlVMRVMuYWxsKSkpIHtcbiAgICAgICAgJGFsbFNjaGVtYXNFbXB0eSA9IGZhbHNlO1xuICAgICAgICAkaXQuc2NoZW1hID0gJHNjaDtcbiAgICAgICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aCArICdbJyArICRpICsgJ10nO1xuICAgICAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoICsgJy8nICsgJGk7XG4gICAgICAgIG91dCArPSAnICAnICsgKGl0LnZhbGlkYXRlKCRpdCkpICsgJyAnO1xuICAgICAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgaWYgKCRhbGxTY2hlbWFzRW1wdHkpIHtcbiAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnICcgKyAoJGNsb3NpbmdCcmFjZXMuc2xpY2UoMCwgLTEpKSArICcgJztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfYW55T2YoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICB2YXIgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgdmFyICRub0VtcHR5U2NoZW1hID0gJHNjaGVtYS5ldmVyeShmdW5jdGlvbigkc2NoKSB7XG4gICAgcmV0dXJuIChpdC5vcHRzLnN0cmljdEtleXdvcmRzID8gKHR5cGVvZiAkc2NoID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRzY2gpLmxlbmd0aCA+IDApIHx8ICRzY2ggPT09IGZhbHNlIDogaXQudXRpbC5zY2hlbWFIYXNSdWxlcygkc2NoLCBpdC5SVUxFUy5hbGwpKTtcbiAgfSk7XG4gIGlmICgkbm9FbXB0eVNjaGVtYSkge1xuICAgIHZhciAkY3VycmVudEJhc2VJZCA9ICRpdC5iYXNlSWQ7XG4gICAgb3V0ICs9ICcgdmFyICcgKyAoJGVycnMpICsgJyA9IGVycm9yczsgdmFyICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgICc7XG4gICAgdmFyICR3YXNDb21wb3NpdGUgPSBpdC5jb21wb3NpdGVSdWxlO1xuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9IHRydWU7XG4gICAgdmFyIGFycjEgPSAkc2NoZW1hO1xuICAgIGlmIChhcnIxKSB7XG4gICAgICB2YXIgJHNjaCwgJGkgPSAtMSxcbiAgICAgICAgbDEgPSBhcnIxLmxlbmd0aCAtIDE7XG4gICAgICB3aGlsZSAoJGkgPCBsMSkge1xuICAgICAgICAkc2NoID0gYXJyMVskaSArPSAxXTtcbiAgICAgICAgJGl0LnNjaGVtYSA9ICRzY2g7XG4gICAgICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGggKyAnWycgKyAkaSArICddJztcbiAgICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aCArICcvJyArICRpO1xuICAgICAgICBvdXQgKz0gJyAgJyArIChpdC52YWxpZGF0ZSgkaXQpKSArICcgJztcbiAgICAgICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gJyArICgkdmFsaWQpICsgJyB8fCAnICsgKCRuZXh0VmFsaWQpICsgJzsgaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICc7XG4gICAgICAgICRjbG9zaW5nQnJhY2VzICs9ICd9JztcbiAgICAgIH1cbiAgICB9XG4gICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gJHdhc0NvbXBvc2l0ZTtcbiAgICBvdXQgKz0gJyAnICsgKCRjbG9zaW5nQnJhY2VzKSArICcgaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdhbnlPZicpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHt9ICc7XG4gICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgbWF0Y2ggc29tZSBzY2hlbWEgaW4gYW55T2ZcXCcgJztcbiAgICAgIH1cbiAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcge30gJztcbiAgICB9XG4gICAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcih2RXJyb3JzKTsgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IHZFcnJvcnM7IHJldHVybiBmYWxzZTsgJztcbiAgICAgIH1cbiAgICB9XG4gICAgb3V0ICs9ICcgfSBlbHNlIHsgIGVycm9ycyA9ICcgKyAoJGVycnMpICsgJzsgaWYgKHZFcnJvcnMgIT09IG51bGwpIHsgaWYgKCcgKyAoJGVycnMpICsgJykgdkVycm9ycy5sZW5ndGggPSAnICsgKCRlcnJzKSArICc7IGVsc2UgdkVycm9ycyA9IG51bGw7IH0gJztcbiAgICBpZiAoaXQub3B0cy5hbGxFcnJvcnMpIHtcbiAgICAgIG91dCArPSAnIH0gJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2NvbW1lbnQoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGNvbW1lbnQgPSBpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRzY2hlbWEpO1xuICBpZiAoaXQub3B0cy4kY29tbWVudCA9PT0gdHJ1ZSkge1xuICAgIG91dCArPSAnIGNvbnNvbGUubG9nKCcgKyAoJGNvbW1lbnQpICsgJyk7JztcbiAgfSBlbHNlIGlmICh0eXBlb2YgaXQub3B0cy4kY29tbWVudCA9PSAnZnVuY3Rpb24nKSB7XG4gICAgb3V0ICs9ICcgc2VsZi5fb3B0cy4kY29tbWVudCgnICsgKCRjb21tZW50KSArICcsICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJywgdmFsaWRhdGUucm9vdC5zY2hlbWEpOyc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfY29uc3QoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgaWYgKCEkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnOyc7XG4gIH1cbiAgb3V0ICs9ICd2YXIgJyArICgkdmFsaWQpICsgJyA9IGVxdWFsKCcgKyAoJGRhdGEpICsgJywgc2NoZW1hJyArICgkbHZsKSArICcpOyBpZiAoIScgKyAoJHZhbGlkKSArICcpIHsgICAnO1xuICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ2NvbnN0JykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBhbGxvd2VkVmFsdWU6IHNjaGVtYScgKyAoJGx2bCkgKyAnIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGJlIGVxdWFsIHRvIGNvbnN0YW50XFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB7fSAnO1xuICB9XG4gIHZhciBfX2VyciA9IG91dDtcbiAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gIH1cbiAgb3V0ICs9ICcgfSc7XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfY29udGFpbnMoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICB2YXIgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgdmFyICRpZHggPSAnaScgKyAkbHZsLFxuICAgICRkYXRhTnh0ID0gJGl0LmRhdGFMZXZlbCA9IGl0LmRhdGFMZXZlbCArIDEsXG4gICAgJG5leHREYXRhID0gJ2RhdGEnICsgJGRhdGFOeHQsXG4gICAgJGN1cnJlbnRCYXNlSWQgPSBpdC5iYXNlSWQsXG4gICAgJG5vbkVtcHR5U2NoZW1hID0gKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2hlbWEgPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaGVtYSkubGVuZ3RoID4gMCkgfHwgJHNjaGVtYSA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2hlbWEsIGl0LlJVTEVTLmFsbCkpO1xuICBvdXQgKz0gJ3ZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7dmFyICcgKyAoJHZhbGlkKSArICc7JztcbiAgaWYgKCRub25FbXB0eVNjaGVtYSkge1xuICAgIHZhciAkd2FzQ29tcG9zaXRlID0gaXQuY29tcG9zaXRlUnVsZTtcbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICAgICRpdC5zY2hlbWEgPSAkc2NoZW1hO1xuICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGg7XG4gICAgJGl0LmVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aDtcbiAgICBvdXQgKz0gJyB2YXIgJyArICgkbmV4dFZhbGlkKSArICcgPSBmYWxzZTsgZm9yICh2YXIgJyArICgkaWR4KSArICcgPSAwOyAnICsgKCRpZHgpICsgJyA8ICcgKyAoJGRhdGEpICsgJy5sZW5ndGg7ICcgKyAoJGlkeCkgKyAnKyspIHsgJztcbiAgICAkaXQuZXJyb3JQYXRoID0gaXQudXRpbC5nZXRQYXRoRXhwcihpdC5lcnJvclBhdGgsICRpZHgsIGl0Lm9wdHMuanNvblBvaW50ZXJzLCB0cnVlKTtcbiAgICB2YXIgJHBhc3NEYXRhID0gJGRhdGEgKyAnWycgKyAkaWR4ICsgJ10nO1xuICAgICRpdC5kYXRhUGF0aEFyclskZGF0YU54dF0gPSAkaWR4O1xuICAgIHZhciAkY29kZSA9IGl0LnZhbGlkYXRlKCRpdCk7XG4gICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgIGlmIChpdC51dGlsLnZhck9jY3VyZW5jZXMoJGNvZGUsICRuZXh0RGF0YSkgPCAyKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKGl0LnV0aWwudmFyUmVwbGFjZSgkY29kZSwgJG5leHREYXRhLCAkcGFzc0RhdGEpKSArICcgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJG5leHREYXRhKSArICcgPSAnICsgKCRwYXNzRGF0YSkgKyAnOyAnICsgKCRjb2RlKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSBicmVhazsgfSAgJztcbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSAkd2FzQ29tcG9zaXRlO1xuICAgIG91dCArPSAnICcgKyAoJGNsb3NpbmdCcmFjZXMpICsgJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSB7JztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyBpZiAoJyArICgkZGF0YSkgKyAnLmxlbmd0aCA9PSAwKSB7JztcbiAgfVxuICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ2NvbnRhaW5zJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczoge30gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGNvbnRhaW4gYSB2YWxpZCBpdGVtXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB7fSAnO1xuICB9XG4gIHZhciBfX2VyciA9IG91dDtcbiAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gIH1cbiAgb3V0ICs9ICcgfSBlbHNlIHsgJztcbiAgaWYgKCRub25FbXB0eVNjaGVtYSkge1xuICAgIG91dCArPSAnICBlcnJvcnMgPSAnICsgKCRlcnJzKSArICc7IGlmICh2RXJyb3JzICE9PSBudWxsKSB7IGlmICgnICsgKCRlcnJzKSArICcpIHZFcnJvcnMubGVuZ3RoID0gJyArICgkZXJycykgKyAnOyBlbHNlIHZFcnJvcnMgPSBudWxsOyB9ICc7XG4gIH1cbiAgaWYgKGl0Lm9wdHMuYWxsRXJyb3JzKSB7XG4gICAgb3V0ICs9ICcgfSAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2N1c3RvbShpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGVycm9yS2V5d29yZDtcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXNEYXRhID0gaXQub3B0cy4kZGF0YSAmJiAkc2NoZW1hICYmICRzY2hlbWEuJGRhdGEsXG4gICAgJHNjaGVtYVZhbHVlO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciBzY2hlbWEnICsgKCRsdmwpICsgJyA9ICcgKyAoaXQudXRpbC5nZXREYXRhKCRzY2hlbWEuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFycikpICsgJzsgJztcbiAgICAkc2NoZW1hVmFsdWUgPSAnc2NoZW1hJyArICRsdmw7XG4gIH0gZWxzZSB7XG4gICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYTtcbiAgfVxuICB2YXIgJHJ1bGUgPSB0aGlzLFxuICAgICRkZWZpbml0aW9uID0gJ2RlZmluaXRpb24nICsgJGx2bCxcbiAgICAkckRlZiA9ICRydWxlLmRlZmluaXRpb24sXG4gICAgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgdmFyICRjb21waWxlLCAkaW5saW5lLCAkbWFjcm8sICRydWxlVmFsaWRhdGUsICR2YWxpZGF0ZUNvZGU7XG4gIGlmICgkaXNEYXRhICYmICRyRGVmLiRkYXRhKSB7XG4gICAgJHZhbGlkYXRlQ29kZSA9ICdrZXl3b3JkVmFsaWRhdGUnICsgJGx2bDtcbiAgICB2YXIgJHZhbGlkYXRlU2NoZW1hID0gJHJEZWYudmFsaWRhdGVTY2hlbWE7XG4gICAgb3V0ICs9ICcgdmFyICcgKyAoJGRlZmluaXRpb24pICsgJyA9IFJVTEVTLmN1c3RvbVtcXCcnICsgKCRrZXl3b3JkKSArICdcXCddLmRlZmluaXRpb247IHZhciAnICsgKCR2YWxpZGF0ZUNvZGUpICsgJyA9ICcgKyAoJGRlZmluaXRpb24pICsgJy52YWxpZGF0ZTsnO1xuICB9IGVsc2Uge1xuICAgICRydWxlVmFsaWRhdGUgPSBpdC51c2VDdXN0b21SdWxlKCRydWxlLCAkc2NoZW1hLCBpdC5zY2hlbWEsIGl0KTtcbiAgICBpZiAoISRydWxlVmFsaWRhdGUpIHJldHVybjtcbiAgICAkc2NoZW1hVmFsdWUgPSAndmFsaWRhdGUuc2NoZW1hJyArICRzY2hlbWFQYXRoO1xuICAgICR2YWxpZGF0ZUNvZGUgPSAkcnVsZVZhbGlkYXRlLmNvZGU7XG4gICAgJGNvbXBpbGUgPSAkckRlZi5jb21waWxlO1xuICAgICRpbmxpbmUgPSAkckRlZi5pbmxpbmU7XG4gICAgJG1hY3JvID0gJHJEZWYubWFjcm87XG4gIH1cbiAgdmFyICRydWxlRXJycyA9ICR2YWxpZGF0ZUNvZGUgKyAnLmVycm9ycycsXG4gICAgJGkgPSAnaScgKyAkbHZsLFxuICAgICRydWxlRXJyID0gJ3J1bGVFcnInICsgJGx2bCxcbiAgICAkYXN5bmNLZXl3b3JkID0gJHJEZWYuYXN5bmM7XG4gIGlmICgkYXN5bmNLZXl3b3JkICYmICFpdC5hc3luYykgdGhyb3cgbmV3IEVycm9yKCdhc3luYyBrZXl3b3JkIGluIHN5bmMgc2NoZW1hJyk7XG4gIGlmICghKCRpbmxpbmUgfHwgJG1hY3JvKSkge1xuICAgIG91dCArPSAnJyArICgkcnVsZUVycnMpICsgJyA9IG51bGw7JztcbiAgfVxuICBvdXQgKz0gJ3ZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7dmFyICcgKyAoJHZhbGlkKSArICc7JztcbiAgaWYgKCRpc0RhdGEgJiYgJHJEZWYuJGRhdGEpIHtcbiAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgb3V0ICs9ICcgaWYgKCcgKyAoJHNjaGVtYVZhbHVlKSArICcgPT09IHVuZGVmaW5lZCkgeyAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZTsgfSBlbHNlIHsgJztcbiAgICBpZiAoJHZhbGlkYXRlU2NoZW1hKSB7XG4gICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gJyArICgkZGVmaW5pdGlvbikgKyAnLnZhbGlkYXRlU2NoZW1hKCcgKyAoJHNjaGVtYVZhbHVlKSArICcpOyBpZiAoJyArICgkdmFsaWQpICsgJykgeyAnO1xuICAgIH1cbiAgfVxuICBpZiAoJGlubGluZSkge1xuICAgIGlmICgkckRlZi5zdGF0ZW1lbnRzKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCRydWxlVmFsaWRhdGUudmFsaWRhdGUpICsgJyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gJyArICgkcnVsZVZhbGlkYXRlLnZhbGlkYXRlKSArICc7ICc7XG4gICAgfVxuICB9IGVsc2UgaWYgKCRtYWNybykge1xuICAgIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICAgIHZhciAkY2xvc2luZ0JyYWNlcyA9ICcnO1xuICAgICRpdC5sZXZlbCsrO1xuICAgIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgICAkaXQuc2NoZW1hID0gJHJ1bGVWYWxpZGF0ZS52YWxpZGF0ZTtcbiAgICAkaXQuc2NoZW1hUGF0aCA9ICcnO1xuICAgIHZhciAkd2FzQ29tcG9zaXRlID0gaXQuY29tcG9zaXRlUnVsZTtcbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICAgIHZhciAkY29kZSA9IGl0LnZhbGlkYXRlKCRpdCkucmVwbGFjZSgvdmFsaWRhdGVcXC5zY2hlbWEvZywgJHZhbGlkYXRlQ29kZSk7XG4gICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gJHdhc0NvbXBvc2l0ZTtcbiAgICBvdXQgKz0gJyAnICsgKCRjb2RlKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgb3V0ID0gJyc7XG4gICAgb3V0ICs9ICcgICcgKyAoJHZhbGlkYXRlQ29kZSkgKyAnLmNhbGwoICc7XG4gICAgaWYgKGl0Lm9wdHMucGFzc0NvbnRleHQpIHtcbiAgICAgIG91dCArPSAndGhpcyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnc2VsZic7XG4gICAgfVxuICAgIGlmICgkY29tcGlsZSB8fCAkckRlZi5zY2hlbWEgPT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyAsICcgKyAoJHNjaGVtYVZhbHVlKSArICcgLCAnICsgKCRkYXRhKSArICcgLCB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyAsIChkYXRhUGF0aCB8fCBcXCdcXCcpJztcbiAgICBpZiAoaXQuZXJyb3JQYXRoICE9ICdcIlwiJykge1xuICAgICAgb3V0ICs9ICcgKyAnICsgKGl0LmVycm9yUGF0aCk7XG4gICAgfVxuICAgIHZhciAkcGFyZW50RGF0YSA9ICRkYXRhTHZsID8gJ2RhdGEnICsgKCgkZGF0YUx2bCAtIDEpIHx8ICcnKSA6ICdwYXJlbnREYXRhJyxcbiAgICAgICRwYXJlbnREYXRhUHJvcGVydHkgPSAkZGF0YUx2bCA/IGl0LmRhdGFQYXRoQXJyWyRkYXRhTHZsXSA6ICdwYXJlbnREYXRhUHJvcGVydHknO1xuICAgIG91dCArPSAnICwgJyArICgkcGFyZW50RGF0YSkgKyAnICwgJyArICgkcGFyZW50RGF0YVByb3BlcnR5KSArICcgLCByb290RGF0YSApICAnO1xuICAgIHZhciBkZWZfY2FsbFJ1bGVWYWxpZGF0ZSA9IG91dDtcbiAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgIGlmICgkckRlZi5lcnJvcnMgPT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gJztcbiAgICAgIGlmICgkYXN5bmNLZXl3b3JkKSB7XG4gICAgICAgIG91dCArPSAnYXdhaXQgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnJyArIChkZWZfY2FsbFJ1bGVWYWxpZGF0ZSkgKyAnOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoJGFzeW5jS2V5d29yZCkge1xuICAgICAgICAkcnVsZUVycnMgPSAnY3VzdG9tRXJyb3JzJyArICRsdmw7XG4gICAgICAgIG91dCArPSAnIHZhciAnICsgKCRydWxlRXJycykgKyAnID0gbnVsbDsgdHJ5IHsgJyArICgkdmFsaWQpICsgJyA9IGF3YWl0ICcgKyAoZGVmX2NhbGxSdWxlVmFsaWRhdGUpICsgJzsgfSBjYXRjaCAoZSkgeyAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7IGlmIChlIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSAnICsgKCRydWxlRXJycykgKyAnID0gZS5lcnJvcnM7IGVsc2UgdGhyb3cgZTsgfSAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgJyArICgkcnVsZUVycnMpICsgJyA9IG51bGw7ICcgKyAoJHZhbGlkKSArICcgPSAnICsgKGRlZl9jYWxsUnVsZVZhbGlkYXRlKSArICc7ICc7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICgkckRlZi5tb2RpZnlpbmcpIHtcbiAgICBvdXQgKz0gJyBpZiAoJyArICgkcGFyZW50RGF0YSkgKyAnKSAnICsgKCRkYXRhKSArICcgPSAnICsgKCRwYXJlbnREYXRhKSArICdbJyArICgkcGFyZW50RGF0YVByb3BlcnR5KSArICddOyc7XG4gIH1cbiAgb3V0ICs9ICcnICsgKCRjbG9zaW5nQnJhY2VzKTtcbiAgaWYgKCRyRGVmLnZhbGlkKSB7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIGlmICggJztcbiAgICBpZiAoJHJEZWYudmFsaWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgb3V0ICs9ICcgISc7XG4gICAgICBpZiAoJG1hY3JvKSB7XG4gICAgICAgIG91dCArPSAnJyArICgkbmV4dFZhbGlkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArICgkdmFsaWQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCEkckRlZi52YWxpZCkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnKSB7ICc7XG4gICAgJGVycm9yS2V5d29yZCA9ICRydWxlLmtleXdvcmQ7XG4gICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgIG91dCA9ICcnO1xuICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ2N1c3RvbScpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsga2V5d29yZDogXFwnJyArICgkcnVsZS5rZXl3b3JkKSArICdcXCcgfSAnO1xuICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIHBhc3MgXCInICsgKCRydWxlLmtleXdvcmQpICsgJ1wiIGtleXdvcmQgdmFsaWRhdGlvblxcJyAnO1xuICAgICAgfVxuICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB7fSAnO1xuICAgIH1cbiAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgfVxuICAgIHZhciBkZWZfY3VzdG9tRXJyb3IgPSBvdXQ7XG4gICAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgICBpZiAoJGlubGluZSkge1xuICAgICAgaWYgKCRyRGVmLmVycm9ycykge1xuICAgICAgICBpZiAoJHJEZWYuZXJyb3JzICE9ICdmdWxsJykge1xuICAgICAgICAgIG91dCArPSAnICBmb3IgKHZhciAnICsgKCRpKSArICc9JyArICgkZXJycykgKyAnOyAnICsgKCRpKSArICc8ZXJyb3JzOyAnICsgKCRpKSArICcrKykgeyB2YXIgJyArICgkcnVsZUVycikgKyAnID0gdkVycm9yc1snICsgKCRpKSArICddOyBpZiAoJyArICgkcnVsZUVycikgKyAnLmRhdGFQYXRoID09PSB1bmRlZmluZWQpICcgKyAoJHJ1bGVFcnIpICsgJy5kYXRhUGF0aCA9IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJzsgaWYgKCcgKyAoJHJ1bGVFcnIpICsgJy5zY2hlbWFQYXRoID09PSB1bmRlZmluZWQpIHsgJyArICgkcnVsZUVycikgKyAnLnNjaGVtYVBhdGggPSBcIicgKyAoJGVyclNjaGVtYVBhdGgpICsgJ1wiOyB9ICc7XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArICgkcnVsZUVycikgKyAnLnNjaGVtYSA9ICcgKyAoJHNjaGVtYVZhbHVlKSArICc7ICcgKyAoJHJ1bGVFcnIpICsgJy5kYXRhID0gJyArICgkZGF0YSkgKyAnOyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICgkckRlZi5lcnJvcnMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgJyArIChkZWZfY3VzdG9tRXJyb3IpICsgJyAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCRlcnJzKSArICcgPT0gZXJyb3JzKSB7ICcgKyAoZGVmX2N1c3RvbUVycm9yKSArICcgfSBlbHNlIHsgIGZvciAodmFyICcgKyAoJGkpICsgJz0nICsgKCRlcnJzKSArICc7ICcgKyAoJGkpICsgJzxlcnJvcnM7ICcgKyAoJGkpICsgJysrKSB7IHZhciAnICsgKCRydWxlRXJyKSArICcgPSB2RXJyb3JzWycgKyAoJGkpICsgJ107IGlmICgnICsgKCRydWxlRXJyKSArICcuZGF0YVBhdGggPT09IHVuZGVmaW5lZCkgJyArICgkcnVsZUVycikgKyAnLmRhdGFQYXRoID0gKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnOyBpZiAoJyArICgkcnVsZUVycikgKyAnLnNjaGVtYVBhdGggPT09IHVuZGVmaW5lZCkgeyAnICsgKCRydWxlRXJyKSArICcuc2NoZW1hUGF0aCA9IFwiJyArICgkZXJyU2NoZW1hUGF0aCkgKyAnXCI7IH0gJztcbiAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAnICsgKCRydWxlRXJyKSArICcuc2NoZW1hID0gJyArICgkc2NoZW1hVmFsdWUpICsgJzsgJyArICgkcnVsZUVycikgKyAnLmRhdGEgPSAnICsgKCRkYXRhKSArICc7ICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnIH0gfSAnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICgkbWFjcm8pIHtcbiAgICAgIG91dCArPSAnICAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgkZXJyb3JLZXl3b3JkIHx8ICdjdXN0b20nKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGtleXdvcmQ6IFxcJycgKyAoJHJ1bGUua2V5d29yZCkgKyAnXFwnIH0gJztcbiAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgcGFzcyBcIicgKyAoJHJ1bGUua2V5d29yZCkgKyAnXCIga2V5d29yZCB2YWxpZGF0aW9uXFwnICc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcih2RXJyb3JzKTsgJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSB2RXJyb3JzOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCRyRGVmLmVycm9ycyA9PT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgJyArIChkZWZfY3VzdG9tRXJyb3IpICsgJyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKEFycmF5LmlzQXJyYXkoJyArICgkcnVsZUVycnMpICsgJykpIHsgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSAnICsgKCRydWxlRXJycykgKyAnOyBlbHNlIHZFcnJvcnMgPSB2RXJyb3JzLmNvbmNhdCgnICsgKCRydWxlRXJycykgKyAnKTsgZXJyb3JzID0gdkVycm9ycy5sZW5ndGg7ICBmb3IgKHZhciAnICsgKCRpKSArICc9JyArICgkZXJycykgKyAnOyAnICsgKCRpKSArICc8ZXJyb3JzOyAnICsgKCRpKSArICcrKykgeyB2YXIgJyArICgkcnVsZUVycikgKyAnID0gdkVycm9yc1snICsgKCRpKSArICddOyBpZiAoJyArICgkcnVsZUVycikgKyAnLmRhdGFQYXRoID09PSB1bmRlZmluZWQpICcgKyAoJHJ1bGVFcnIpICsgJy5kYXRhUGF0aCA9IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJzsgICcgKyAoJHJ1bGVFcnIpICsgJy5zY2hlbWFQYXRoID0gXCInICsgKCRlcnJTY2hlbWFQYXRoKSArICdcIjsgICc7XG4gICAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyAnICsgKCRydWxlRXJyKSArICcuc2NoZW1hID0gJyArICgkc2NoZW1hVmFsdWUpICsgJzsgJyArICgkcnVsZUVycikgKyAnLmRhdGEgPSAnICsgKCRkYXRhKSArICc7ICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgfSB9IGVsc2UgeyAnICsgKGRlZl9jdXN0b21FcnJvcikgKyAnIH0gJztcbiAgICAgIH1cbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfZGVwZW5kZW5jaWVzKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkZXJycyA9ICdlcnJzX18nICsgJGx2bDtcbiAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gIHZhciAkY2xvc2luZ0JyYWNlcyA9ICcnO1xuICAkaXQubGV2ZWwrKztcbiAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICB2YXIgJHNjaGVtYURlcHMgPSB7fSxcbiAgICAkcHJvcGVydHlEZXBzID0ge30sXG4gICAgJG93blByb3BlcnRpZXMgPSBpdC5vcHRzLm93blByb3BlcnRpZXM7XG4gIGZvciAoJHByb3BlcnR5IGluICRzY2hlbWEpIHtcbiAgICBpZiAoJHByb3BlcnR5ID09ICdfX3Byb3RvX18nKSBjb250aW51ZTtcbiAgICB2YXIgJHNjaCA9ICRzY2hlbWFbJHByb3BlcnR5XTtcbiAgICB2YXIgJGRlcHMgPSBBcnJheS5pc0FycmF5KCRzY2gpID8gJHByb3BlcnR5RGVwcyA6ICRzY2hlbWFEZXBzO1xuICAgICRkZXBzWyRwcm9wZXJ0eV0gPSAkc2NoO1xuICB9XG4gIG91dCArPSAndmFyICcgKyAoJGVycnMpICsgJyA9IGVycm9yczsnO1xuICB2YXIgJGN1cnJlbnRFcnJvclBhdGggPSBpdC5lcnJvclBhdGg7XG4gIG91dCArPSAndmFyIG1pc3NpbmcnICsgKCRsdmwpICsgJzsnO1xuICBmb3IgKHZhciAkcHJvcGVydHkgaW4gJHByb3BlcnR5RGVwcykge1xuICAgICRkZXBzID0gJHByb3BlcnR5RGVwc1skcHJvcGVydHldO1xuICAgIGlmICgkZGVwcy5sZW5ndGgpIHtcbiAgICAgIG91dCArPSAnIGlmICggJyArICgkZGF0YSkgKyAoaXQudXRpbC5nZXRQcm9wZXJ0eSgkcHJvcGVydHkpKSArICcgIT09IHVuZGVmaW5lZCAnO1xuICAgICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICAgIG91dCArPSAnICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCgnICsgKCRkYXRhKSArICcsIFxcJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5KSkgKyAnXFwnKSAnO1xuICAgICAgfVxuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgb3V0ICs9ICcgJiYgKCAnO1xuICAgICAgICB2YXIgYXJyMSA9ICRkZXBzO1xuICAgICAgICBpZiAoYXJyMSkge1xuICAgICAgICAgIHZhciAkcHJvcGVydHlLZXksICRpID0gLTEsXG4gICAgICAgICAgICBsMSA9IGFycjEubGVuZ3RoIC0gMTtcbiAgICAgICAgICB3aGlsZSAoJGkgPCBsMSkge1xuICAgICAgICAgICAgJHByb3BlcnR5S2V5ID0gYXJyMVskaSArPSAxXTtcbiAgICAgICAgICAgIGlmICgkaSkge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB8fCAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyICRwcm9wID0gaXQudXRpbC5nZXRQcm9wZXJ0eSgkcHJvcGVydHlLZXkpLFxuICAgICAgICAgICAgICAkdXNlRGF0YSA9ICRkYXRhICsgJHByb3A7XG4gICAgICAgICAgICBvdXQgKz0gJyAoICggJyArICgkdXNlRGF0YSkgKyAnID09PSB1bmRlZmluZWQgJztcbiAgICAgICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB8fCAhIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCgnICsgKCRkYXRhKSArICcsIFxcJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5S2V5KSkgKyAnXFwnKSAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICcpICYmIChtaXNzaW5nJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoaXQub3B0cy5qc29uUG9pbnRlcnMgPyAkcHJvcGVydHlLZXkgOiAkcHJvcCkpICsgJykgKSAnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJykpIHsgICc7XG4gICAgICAgIHZhciAkcHJvcGVydHlQYXRoID0gJ21pc3NpbmcnICsgJGx2bCxcbiAgICAgICAgICAkbWlzc2luZ1Byb3BlcnR5ID0gJ1xcJyArICcgKyAkcHJvcGVydHlQYXRoICsgJyArIFxcJyc7XG4gICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICBpdC5lcnJvclBhdGggPSBpdC5vcHRzLmpzb25Qb2ludGVycyA/IGl0LnV0aWwuZ2V0UGF0aEV4cHIoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eVBhdGgsIHRydWUpIDogJGN1cnJlbnRFcnJvclBhdGggKyAnICsgJyArICRwcm9wZXJ0eVBhdGg7XG4gICAgICAgIH1cbiAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdkZXBlbmRlbmNpZXMnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IHByb3BlcnR5OiBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eSkpICsgJ1xcJywgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJywgZGVwc0NvdW50OiAnICsgKCRkZXBzLmxlbmd0aCkgKyAnLCBkZXBzOiBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRkZXBzLmxlbmd0aCA9PSAxID8gJGRlcHNbMF0gOiAkZGVwcy5qb2luKFwiLCBcIikpKSArICdcXCcgfSAnO1xuICAgICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgaGF2ZSAnO1xuICAgICAgICAgICAgaWYgKCRkZXBzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgIG91dCArPSAncHJvcGVydHkgJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkZGVwc1swXSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICdwcm9wZXJ0aWVzICcgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJGRlcHMuam9pbihcIiwgXCIpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJyB3aGVuIHByb3BlcnR5ICcgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5KSkgKyAnIGlzIHByZXNlbnRcXCcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgKSB7ICc7XG4gICAgICAgIHZhciBhcnIyID0gJGRlcHM7XG4gICAgICAgIGlmIChhcnIyKSB7XG4gICAgICAgICAgdmFyICRwcm9wZXJ0eUtleSwgaTIgPSAtMSxcbiAgICAgICAgICAgIGwyID0gYXJyMi5sZW5ndGggLSAxO1xuICAgICAgICAgIHdoaWxlIChpMiA8IGwyKSB7XG4gICAgICAgICAgICAkcHJvcGVydHlLZXkgPSBhcnIyW2kyICs9IDFdO1xuICAgICAgICAgICAgdmFyICRwcm9wID0gaXQudXRpbC5nZXRQcm9wZXJ0eSgkcHJvcGVydHlLZXkpLFxuICAgICAgICAgICAgICAkbWlzc2luZ1Byb3BlcnR5ID0gaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5S2V5KSxcbiAgICAgICAgICAgICAgJHVzZURhdGEgPSAkZGF0YSArICRwcm9wO1xuICAgICAgICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICAgICAgICBpdC5lcnJvclBhdGggPSBpdC51dGlsLmdldFBhdGgoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eUtleSwgaXQub3B0cy5qc29uUG9pbnRlcnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICcgaWYgKCAnICsgKCR1c2VEYXRhKSArICcgPT09IHVuZGVmaW5lZCAnO1xuICAgICAgICAgICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIHx8ICEgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHlLZXkpKSArICdcXCcpICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJykgeyAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnZGVwZW5kZW5jaWVzJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBwcm9wZXJ0eTogXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHkpKSArICdcXCcsIG1pc3NpbmdQcm9wZXJ0eTogXFwnJyArICgkbWlzc2luZ1Byb3BlcnR5KSArICdcXCcsIGRlcHNDb3VudDogJyArICgkZGVwcy5sZW5ndGgpICsgJywgZGVwczogXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkZGVwcy5sZW5ndGggPT0gMSA/ICRkZXBzWzBdIDogJGRlcHMuam9pbihcIiwgXCIpKSkgKyAnXFwnIH0gJztcbiAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgaGF2ZSAnO1xuICAgICAgICAgICAgICAgIGlmICgkZGVwcy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICdwcm9wZXJ0eSAnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRkZXBzWzBdKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAncHJvcGVydGllcyAnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRkZXBzLmpvaW4oXCIsIFwiKSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvdXQgKz0gJyB3aGVuIHByb3BlcnR5ICcgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5KSkgKyAnIGlzIHByZXNlbnRcXCcgJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB7fSAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgfSAnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAgICc7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpdC5lcnJvclBhdGggPSAkY3VycmVudEVycm9yUGF0aDtcbiAgdmFyICRjdXJyZW50QmFzZUlkID0gJGl0LmJhc2VJZDtcbiAgZm9yICh2YXIgJHByb3BlcnR5IGluICRzY2hlbWFEZXBzKSB7XG4gICAgdmFyICRzY2ggPSAkc2NoZW1hRGVwc1skcHJvcGVydHldO1xuICAgIGlmICgoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHNjaCA9PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cygkc2NoKS5sZW5ndGggPiAwKSB8fCAkc2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHNjaCwgaXQuUlVMRVMuYWxsKSkpIHtcbiAgICAgIG91dCArPSAnICcgKyAoJG5leHRWYWxpZCkgKyAnID0gdHJ1ZTsgaWYgKCAnICsgKCRkYXRhKSArIChpdC51dGlsLmdldFByb3BlcnR5KCRwcm9wZXJ0eSkpICsgJyAhPT0gdW5kZWZpbmVkICc7XG4gICAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgICAgb3V0ICs9ICcgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHkpKSArICdcXCcpICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJykgeyAnO1xuICAgICAgJGl0LnNjaGVtYSA9ICRzY2g7XG4gICAgICAkaXQuc2NoZW1hUGF0aCA9ICRzY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgkcHJvcGVydHkpO1xuICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aCArICcvJyArIGl0LnV0aWwuZXNjYXBlRnJhZ21lbnQoJHByb3BlcnR5KTtcbiAgICAgIG91dCArPSAnICAnICsgKGl0LnZhbGlkYXRlKCRpdCkpICsgJyAnO1xuICAgICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgICAgb3V0ICs9ICcgfSAgJztcbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJykgeyAnO1xuICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgICAnICsgKCRjbG9zaW5nQnJhY2VzKSArICcgaWYgKCcgKyAoJGVycnMpICsgJyA9PSBlcnJvcnMpIHsnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2VudW0oaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgdmFyICRpID0gJ2knICsgJGx2bCxcbiAgICAkdlNjaGVtYSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgaWYgKCEkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyICcgKyAoJHZTY2hlbWEpICsgJyA9IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJzsnO1xuICB9XG4gIG91dCArPSAndmFyICcgKyAoJHZhbGlkKSArICc7JztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyBpZiAoc2NoZW1hJyArICgkbHZsKSArICcgPT09IHVuZGVmaW5lZCkgJyArICgkdmFsaWQpICsgJyA9IHRydWU7IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KHNjaGVtYScgKyAoJGx2bCkgKyAnKSkgJyArICgkdmFsaWQpICsgJyA9IGZhbHNlOyBlbHNlIHsnO1xuICB9XG4gIG91dCArPSAnJyArICgkdmFsaWQpICsgJyA9IGZhbHNlO2ZvciAodmFyICcgKyAoJGkpICsgJz0wOyAnICsgKCRpKSArICc8JyArICgkdlNjaGVtYSkgKyAnLmxlbmd0aDsgJyArICgkaSkgKyAnKyspIGlmIChlcXVhbCgnICsgKCRkYXRhKSArICcsICcgKyAoJHZTY2hlbWEpICsgJ1snICsgKCRpKSArICddKSkgeyAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZTsgYnJlYWs7IH0nO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnICB9ICAnO1xuICB9XG4gIG91dCArPSAnIGlmICghJyArICgkdmFsaWQpICsgJykgeyAgICc7XG4gIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnZW51bScpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgYWxsb3dlZFZhbHVlczogc2NoZW1hJyArICgkbHZsKSArICcgfSAnO1xuICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgYmUgZXF1YWwgdG8gb25lIG9mIHRoZSBhbGxvd2VkIHZhbHVlc1xcJyAnO1xuICAgIH1cbiAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnIH0nO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2Zvcm1hdChpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICBpZiAoaXQub3B0cy5mb3JtYXQgPT09IGZhbHNlKSB7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG4gIH1cbiAgdmFyICRpc0RhdGEgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWEgJiYgJHNjaGVtYS4kZGF0YSxcbiAgICAkc2NoZW1hVmFsdWU7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLmdldERhdGEoJHNjaGVtYS4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgfSBlbHNlIHtcbiAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hO1xuICB9XG4gIHZhciAkdW5rbm93bkZvcm1hdHMgPSBpdC5vcHRzLnVua25vd25Gb3JtYXRzLFxuICAgICRhbGxvd1Vua25vd24gPSBBcnJheS5pc0FycmF5KCR1bmtub3duRm9ybWF0cyk7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgdmFyICRmb3JtYXQgPSAnZm9ybWF0JyArICRsdmwsXG4gICAgICAkaXNPYmplY3QgPSAnaXNPYmplY3QnICsgJGx2bCxcbiAgICAgICRmb3JtYXRUeXBlID0gJ2Zvcm1hdFR5cGUnICsgJGx2bDtcbiAgICBvdXQgKz0gJyB2YXIgJyArICgkZm9ybWF0KSArICcgPSBmb3JtYXRzWycgKyAoJHNjaGVtYVZhbHVlKSArICddOyB2YXIgJyArICgkaXNPYmplY3QpICsgJyA9IHR5cGVvZiAnICsgKCRmb3JtYXQpICsgJyA9PSBcXCdvYmplY3RcXCcgJiYgISgnICsgKCRmb3JtYXQpICsgJyBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgJyArICgkZm9ybWF0KSArICcudmFsaWRhdGU7IHZhciAnICsgKCRmb3JtYXRUeXBlKSArICcgPSAnICsgKCRpc09iamVjdCkgKyAnICYmICcgKyAoJGZvcm1hdCkgKyAnLnR5cGUgfHwgXFwnc3RyaW5nXFwnOyBpZiAoJyArICgkaXNPYmplY3QpICsgJykgeyAnO1xuICAgIGlmIChpdC5hc3luYykge1xuICAgICAgb3V0ICs9ICcgdmFyIGFzeW5jJyArICgkbHZsKSArICcgPSAnICsgKCRmb3JtYXQpICsgJy5hc3luYzsgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgJyArICgkZm9ybWF0KSArICcgPSAnICsgKCRmb3JtYXQpICsgJy52YWxpZGF0ZTsgfSBpZiAoICAnO1xuICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ3N0cmluZ1xcJykgfHwgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgKCc7XG4gICAgaWYgKCR1bmtub3duRm9ybWF0cyAhPSAnaWdub3JlJykge1xuICAgICAgb3V0ICs9ICcgKCcgKyAoJHNjaGVtYVZhbHVlKSArICcgJiYgIScgKyAoJGZvcm1hdCkgKyAnICc7XG4gICAgICBpZiAoJGFsbG93VW5rbm93bikge1xuICAgICAgICBvdXQgKz0gJyAmJiBzZWxmLl9vcHRzLnVua25vd25Gb3JtYXRzLmluZGV4T2YoJyArICgkc2NoZW1hVmFsdWUpICsgJykgPT0gLTEgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnKSB8fCAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyAoJyArICgkZm9ybWF0KSArICcgJiYgJyArICgkZm9ybWF0VHlwZSkgKyAnID09IFxcJycgKyAoJHJ1bGVUeXBlKSArICdcXCcgJiYgISh0eXBlb2YgJyArICgkZm9ybWF0KSArICcgPT0gXFwnZnVuY3Rpb25cXCcgPyAnO1xuICAgIGlmIChpdC5hc3luYykge1xuICAgICAgb3V0ICs9ICcgKGFzeW5jJyArICgkbHZsKSArICcgPyBhd2FpdCAnICsgKCRmb3JtYXQpICsgJygnICsgKCRkYXRhKSArICcpIDogJyArICgkZm9ybWF0KSArICcoJyArICgkZGF0YSkgKyAnKSkgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgJyArICgkZm9ybWF0KSArICcoJyArICgkZGF0YSkgKyAnKSAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyA6ICcgKyAoJGZvcm1hdCkgKyAnLnRlc3QoJyArICgkZGF0YSkgKyAnKSkpKSkgeyc7XG4gIH0gZWxzZSB7XG4gICAgdmFyICRmb3JtYXQgPSBpdC5mb3JtYXRzWyRzY2hlbWFdO1xuICAgIGlmICghJGZvcm1hdCkge1xuICAgICAgaWYgKCR1bmtub3duRm9ybWF0cyA9PSAnaWdub3JlJykge1xuICAgICAgICBpdC5sb2dnZXIud2FybigndW5rbm93biBmb3JtYXQgXCInICsgJHNjaGVtYSArICdcIiBpZ25vcmVkIGluIHNjaGVtYSBhdCBwYXRoIFwiJyArIGl0LmVyclNjaGVtYVBhdGggKyAnXCInKTtcbiAgICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgICBvdXQgKz0gJyBpZiAodHJ1ZSkgeyAnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgICB9IGVsc2UgaWYgKCRhbGxvd1Vua25vd24gJiYgJHVua25vd25Gb3JtYXRzLmluZGV4T2YoJHNjaGVtYSkgPj0gMCkge1xuICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5rbm93biBmb3JtYXQgXCInICsgJHNjaGVtYSArICdcIiBpcyB1c2VkIGluIHNjaGVtYSBhdCBwYXRoIFwiJyArIGl0LmVyclNjaGVtYVBhdGggKyAnXCInKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyICRpc09iamVjdCA9IHR5cGVvZiAkZm9ybWF0ID09ICdvYmplY3QnICYmICEoJGZvcm1hdCBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgJGZvcm1hdC52YWxpZGF0ZTtcbiAgICB2YXIgJGZvcm1hdFR5cGUgPSAkaXNPYmplY3QgJiYgJGZvcm1hdC50eXBlIHx8ICdzdHJpbmcnO1xuICAgIGlmICgkaXNPYmplY3QpIHtcbiAgICAgIHZhciAkYXN5bmMgPSAkZm9ybWF0LmFzeW5jID09PSB0cnVlO1xuICAgICAgJGZvcm1hdCA9ICRmb3JtYXQudmFsaWRhdGU7XG4gICAgfVxuICAgIGlmICgkZm9ybWF0VHlwZSAhPSAkcnVsZVR5cGUpIHtcbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3V0O1xuICAgIH1cbiAgICBpZiAoJGFzeW5jKSB7XG4gICAgICBpZiAoIWl0LmFzeW5jKSB0aHJvdyBuZXcgRXJyb3IoJ2FzeW5jIGZvcm1hdCBpbiBzeW5jIHNjaGVtYScpO1xuICAgICAgdmFyICRmb3JtYXRSZWYgPSAnZm9ybWF0cycgKyBpdC51dGlsLmdldFByb3BlcnR5KCRzY2hlbWEpICsgJy52YWxpZGF0ZSc7XG4gICAgICBvdXQgKz0gJyBpZiAoIShhd2FpdCAnICsgKCRmb3JtYXRSZWYpICsgJygnICsgKCRkYXRhKSArICcpKSkgeyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyBpZiAoISAnO1xuICAgICAgdmFyICRmb3JtYXRSZWYgPSAnZm9ybWF0cycgKyBpdC51dGlsLmdldFByb3BlcnR5KCRzY2hlbWEpO1xuICAgICAgaWYgKCRpc09iamVjdCkgJGZvcm1hdFJlZiArPSAnLnZhbGlkYXRlJztcbiAgICAgIGlmICh0eXBlb2YgJGZvcm1hdCA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG91dCArPSAnICcgKyAoJGZvcm1hdFJlZikgKyAnKCcgKyAoJGRhdGEpICsgJykgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnICcgKyAoJGZvcm1hdFJlZikgKyAnLnRlc3QoJyArICgkZGF0YSkgKyAnKSAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcpIHsgJztcbiAgICB9XG4gIH1cbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdmb3JtYXQnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGZvcm1hdDogICc7XG4gICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgIG91dCArPSAnJyArICgkc2NoZW1hVmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJycgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkc2NoZW1hKSk7XG4gICAgfVxuICAgIG91dCArPSAnICB9ICc7XG4gICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBtYXRjaCBmb3JtYXQgXCInO1xuICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgb3V0ICs9ICdcXCcgKyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICsgXFwnJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArIChpdC51dGlsLmVzY2FwZVF1b3Rlcygkc2NoZW1hKSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJ1wiXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkc2NoZW1hKSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnIH0gJztcbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9pZihpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmw7XG4gIHZhciAkZXJycyA9ICdlcnJzX18nICsgJGx2bDtcbiAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gICRpdC5sZXZlbCsrO1xuICB2YXIgJG5leHRWYWxpZCA9ICd2YWxpZCcgKyAkaXQubGV2ZWw7XG4gIHZhciAkdGhlblNjaCA9IGl0LnNjaGVtYVsndGhlbiddLFxuICAgICRlbHNlU2NoID0gaXQuc2NoZW1hWydlbHNlJ10sXG4gICAgJHRoZW5QcmVzZW50ID0gJHRoZW5TY2ggIT09IHVuZGVmaW5lZCAmJiAoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHRoZW5TY2ggPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHRoZW5TY2gpLmxlbmd0aCA+IDApIHx8ICR0aGVuU2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHRoZW5TY2gsIGl0LlJVTEVTLmFsbCkpLFxuICAgICRlbHNlUHJlc2VudCA9ICRlbHNlU2NoICE9PSB1bmRlZmluZWQgJiYgKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRlbHNlU2NoID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRlbHNlU2NoKS5sZW5ndGggPiAwKSB8fCAkZWxzZVNjaCA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRlbHNlU2NoLCBpdC5SVUxFUy5hbGwpKSxcbiAgICAkY3VycmVudEJhc2VJZCA9ICRpdC5iYXNlSWQ7XG4gIGlmICgkdGhlblByZXNlbnQgfHwgJGVsc2VQcmVzZW50KSB7XG4gICAgdmFyICRpZkNsYXVzZTtcbiAgICAkaXQuY3JlYXRlRXJyb3JzID0gZmFsc2U7XG4gICAgJGl0LnNjaGVtYSA9ICRzY2hlbWE7XG4gICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aDtcbiAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoO1xuICAgIG91dCArPSAnIHZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7IHZhciAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZTsgICc7XG4gICAgdmFyICR3YXNDb21wb3NpdGUgPSBpdC5jb21wb3NpdGVSdWxlO1xuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9IHRydWU7XG4gICAgb3V0ICs9ICcgICcgKyAoaXQudmFsaWRhdGUoJGl0KSkgKyAnICc7XG4gICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgICRpdC5jcmVhdGVFcnJvcnMgPSB0cnVlO1xuICAgIG91dCArPSAnICBlcnJvcnMgPSAnICsgKCRlcnJzKSArICc7IGlmICh2RXJyb3JzICE9PSBudWxsKSB7IGlmICgnICsgKCRlcnJzKSArICcpIHZFcnJvcnMubGVuZ3RoID0gJyArICgkZXJycykgKyAnOyBlbHNlIHZFcnJvcnMgPSBudWxsOyB9ICAnO1xuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9ICR3YXNDb21wb3NpdGU7XG4gICAgaWYgKCR0aGVuUHJlc2VudCkge1xuICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICAnO1xuICAgICAgJGl0LnNjaGVtYSA9IGl0LnNjaGVtYVsndGhlbiddO1xuICAgICAgJGl0LnNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgJy50aGVuJztcbiAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvdGhlbic7XG4gICAgICBvdXQgKz0gJyAgJyArIChpdC52YWxpZGF0ZSgkaXQpKSArICcgJztcbiAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgIG91dCArPSAnICcgKyAoJHZhbGlkKSArICcgPSAnICsgKCRuZXh0VmFsaWQpICsgJzsgJztcbiAgICAgIGlmICgkdGhlblByZXNlbnQgJiYgJGVsc2VQcmVzZW50KSB7XG4gICAgICAgICRpZkNsYXVzZSA9ICdpZkNsYXVzZScgKyAkbHZsO1xuICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkaWZDbGF1c2UpICsgJyA9IFxcJ3RoZW5cXCc7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkaWZDbGF1c2UgPSAnXFwndGhlblxcJyc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICBpZiAoJGVsc2VQcmVzZW50KSB7XG4gICAgICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgfVxuICAgIGlmICgkZWxzZVByZXNlbnQpIHtcbiAgICAgICRpdC5zY2hlbWEgPSBpdC5zY2hlbWFbJ2Vsc2UnXTtcbiAgICAgICRpdC5zY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArICcuZWxzZSc7XG4gICAgICAkaXQuZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnL2Vsc2UnO1xuICAgICAgb3V0ICs9ICcgICcgKyAoaXQudmFsaWRhdGUoJGl0KSkgKyAnICc7XG4gICAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gJyArICgkbmV4dFZhbGlkKSArICc7ICc7XG4gICAgICBpZiAoJHRoZW5QcmVzZW50ICYmICRlbHNlUHJlc2VudCkge1xuICAgICAgICAkaWZDbGF1c2UgPSAnaWZDbGF1c2UnICsgJGx2bDtcbiAgICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJGlmQ2xhdXNlKSArICcgPSBcXCdlbHNlXFwnOyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJGlmQ2xhdXNlID0gJ1xcJ2Vsc2VcXCcnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyBpZiAoIScgKyAoJHZhbGlkKSArICcpIHsgICB2YXIgZXJyID0gICAnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ2lmJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBmYWlsaW5nS2V5d29yZDogJyArICgkaWZDbGF1c2UpICsgJyB9ICc7XG4gICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgbWF0Y2ggXCJcXCcgKyAnICsgKCRpZkNsYXVzZSkgKyAnICsgXFwnXCIgc2NoZW1hXFwnICc7XG4gICAgICB9XG4gICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgfVxuICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IodkVycm9ycyk7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSB2RXJyb3JzOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICB9XG4gICAgfVxuICAgIG91dCArPSAnIH0gICAnO1xuICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vYWxsIHJlcXVpcmVzIG11c3QgYmUgZXhwbGljaXQgYmVjYXVzZSBicm93c2VyaWZ5IHdvbid0IHdvcmsgd2l0aCBkeW5hbWljIHJlcXVpcmVzXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgJyRyZWYnOiByZXF1aXJlKCcuL3JlZicpLFxuICBhbGxPZjogcmVxdWlyZSgnLi9hbGxPZicpLFxuICBhbnlPZjogcmVxdWlyZSgnLi9hbnlPZicpLFxuICAnJGNvbW1lbnQnOiByZXF1aXJlKCcuL2NvbW1lbnQnKSxcbiAgY29uc3Q6IHJlcXVpcmUoJy4vY29uc3QnKSxcbiAgY29udGFpbnM6IHJlcXVpcmUoJy4vY29udGFpbnMnKSxcbiAgZGVwZW5kZW5jaWVzOiByZXF1aXJlKCcuL2RlcGVuZGVuY2llcycpLFxuICAnZW51bSc6IHJlcXVpcmUoJy4vZW51bScpLFxuICBmb3JtYXQ6IHJlcXVpcmUoJy4vZm9ybWF0JyksXG4gICdpZic6IHJlcXVpcmUoJy4vaWYnKSxcbiAgaXRlbXM6IHJlcXVpcmUoJy4vaXRlbXMnKSxcbiAgbWF4aW11bTogcmVxdWlyZSgnLi9fbGltaXQnKSxcbiAgbWluaW11bTogcmVxdWlyZSgnLi9fbGltaXQnKSxcbiAgbWF4SXRlbXM6IHJlcXVpcmUoJy4vX2xpbWl0SXRlbXMnKSxcbiAgbWluSXRlbXM6IHJlcXVpcmUoJy4vX2xpbWl0SXRlbXMnKSxcbiAgbWF4TGVuZ3RoOiByZXF1aXJlKCcuL19saW1pdExlbmd0aCcpLFxuICBtaW5MZW5ndGg6IHJlcXVpcmUoJy4vX2xpbWl0TGVuZ3RoJyksXG4gIG1heFByb3BlcnRpZXM6IHJlcXVpcmUoJy4vX2xpbWl0UHJvcGVydGllcycpLFxuICBtaW5Qcm9wZXJ0aWVzOiByZXF1aXJlKCcuL19saW1pdFByb3BlcnRpZXMnKSxcbiAgbXVsdGlwbGVPZjogcmVxdWlyZSgnLi9tdWx0aXBsZU9mJyksXG4gIG5vdDogcmVxdWlyZSgnLi9ub3QnKSxcbiAgb25lT2Y6IHJlcXVpcmUoJy4vb25lT2YnKSxcbiAgcGF0dGVybjogcmVxdWlyZSgnLi9wYXR0ZXJuJyksXG4gIHByb3BlcnRpZXM6IHJlcXVpcmUoJy4vcHJvcGVydGllcycpLFxuICBwcm9wZXJ0eU5hbWVzOiByZXF1aXJlKCcuL3Byb3BlcnR5TmFtZXMnKSxcbiAgcmVxdWlyZWQ6IHJlcXVpcmUoJy4vcmVxdWlyZWQnKSxcbiAgdW5pcXVlSXRlbXM6IHJlcXVpcmUoJy4vdW5pcXVlSXRlbXMnKSxcbiAgdmFsaWRhdGU6IHJlcXVpcmUoJy4vdmFsaWRhdGUnKVxufTtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfaXRlbXMoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICB2YXIgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgdmFyICRpZHggPSAnaScgKyAkbHZsLFxuICAgICRkYXRhTnh0ID0gJGl0LmRhdGFMZXZlbCA9IGl0LmRhdGFMZXZlbCArIDEsXG4gICAgJG5leHREYXRhID0gJ2RhdGEnICsgJGRhdGFOeHQsXG4gICAgJGN1cnJlbnRCYXNlSWQgPSBpdC5iYXNlSWQ7XG4gIG91dCArPSAndmFyICcgKyAoJGVycnMpICsgJyA9IGVycm9yczt2YXIgJyArICgkdmFsaWQpICsgJzsnO1xuICBpZiAoQXJyYXkuaXNBcnJheSgkc2NoZW1hKSkge1xuICAgIHZhciAkYWRkaXRpb25hbEl0ZW1zID0gaXQuc2NoZW1hLmFkZGl0aW9uYWxJdGVtcztcbiAgICBpZiAoJGFkZGl0aW9uYWxJdGVtcyA9PT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICcgKyAoJHZhbGlkKSArICcgPSAnICsgKCRkYXRhKSArICcubGVuZ3RoIDw9ICcgKyAoJHNjaGVtYS5sZW5ndGgpICsgJzsgJztcbiAgICAgIHZhciAkY3VyckVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aDtcbiAgICAgICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvYWRkaXRpb25hbEl0ZW1zJztcbiAgICAgIG91dCArPSAnICBpZiAoIScgKyAoJHZhbGlkKSArICcpIHsgICAnO1xuICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnYWRkaXRpb25hbEl0ZW1zJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBsaW1pdDogJyArICgkc2NoZW1hLmxlbmd0aCkgKyAnIH0gJztcbiAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgTk9UIGhhdmUgbW9yZSB0aGFuICcgKyAoJHNjaGVtYS5sZW5ndGgpICsgJyBpdGVtc1xcJyAnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogZmFsc2UgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgIH1cbiAgICAgIHZhciBfX2VyciA9IG91dDtcbiAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgJGVyclNjaGVtYVBhdGggPSAkY3VyckVyclNjaGVtYVBhdGg7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgYXJyMSA9ICRzY2hlbWE7XG4gICAgaWYgKGFycjEpIHtcbiAgICAgIHZhciAkc2NoLCAkaSA9IC0xLFxuICAgICAgICBsMSA9IGFycjEubGVuZ3RoIC0gMTtcbiAgICAgIHdoaWxlICgkaSA8IGwxKSB7XG4gICAgICAgICRzY2ggPSBhcnIxWyRpICs9IDFdO1xuICAgICAgICBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2ggPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaCkubGVuZ3RoID4gMCkgfHwgJHNjaCA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2gsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgICAgICAgb3V0ICs9ICcgJyArICgkbmV4dFZhbGlkKSArICcgPSB0cnVlOyBpZiAoJyArICgkZGF0YSkgKyAnLmxlbmd0aCA+ICcgKyAoJGkpICsgJykgeyAnO1xuICAgICAgICAgIHZhciAkcGFzc0RhdGEgPSAkZGF0YSArICdbJyArICRpICsgJ10nO1xuICAgICAgICAgICRpdC5zY2hlbWEgPSAkc2NoO1xuICAgICAgICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGggKyAnWycgKyAkaSArICddJztcbiAgICAgICAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoICsgJy8nICsgJGk7XG4gICAgICAgICAgJGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAkaSwgaXQub3B0cy5qc29uUG9pbnRlcnMsIHRydWUpO1xuICAgICAgICAgICRpdC5kYXRhUGF0aEFyclskZGF0YU54dF0gPSAkaTtcbiAgICAgICAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpO1xuICAgICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgICAgICBpZiAoaXQudXRpbC52YXJPY2N1cmVuY2VzKCRjb2RlLCAkbmV4dERhdGEpIDwgMikge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51dGlsLnZhclJlcGxhY2UoJGNvZGUsICRuZXh0RGF0YSwgJHBhc3NEYXRhKSkgKyAnICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJyArICgkY29kZSkgKyAnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnIH0gICc7XG4gICAgICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJykgeyAnO1xuICAgICAgICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHlwZW9mICRhZGRpdGlvbmFsSXRlbXMgPT0gJ29iamVjdCcgJiYgKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRhZGRpdGlvbmFsSXRlbXMgPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJGFkZGl0aW9uYWxJdGVtcykubGVuZ3RoID4gMCkgfHwgJGFkZGl0aW9uYWxJdGVtcyA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRhZGRpdGlvbmFsSXRlbXMsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgICAkaXQuc2NoZW1hID0gJGFkZGl0aW9uYWxJdGVtcztcbiAgICAgICRpdC5zY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArICcuYWRkaXRpb25hbEl0ZW1zJztcbiAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvYWRkaXRpb25hbEl0ZW1zJztcbiAgICAgIG91dCArPSAnICcgKyAoJG5leHRWYWxpZCkgKyAnID0gdHJ1ZTsgaWYgKCcgKyAoJGRhdGEpICsgJy5sZW5ndGggPiAnICsgKCRzY2hlbWEubGVuZ3RoKSArICcpIHsgIGZvciAodmFyICcgKyAoJGlkeCkgKyAnID0gJyArICgkc2NoZW1hLmxlbmd0aCkgKyAnOyAnICsgKCRpZHgpICsgJyA8ICcgKyAoJGRhdGEpICsgJy5sZW5ndGg7ICcgKyAoJGlkeCkgKyAnKyspIHsgJztcbiAgICAgICRpdC5lcnJvclBhdGggPSBpdC51dGlsLmdldFBhdGhFeHByKGl0LmVycm9yUGF0aCwgJGlkeCwgaXQub3B0cy5qc29uUG9pbnRlcnMsIHRydWUpO1xuICAgICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgJ1snICsgJGlkeCArICddJztcbiAgICAgICRpdC5kYXRhUGF0aEFyclskZGF0YU54dF0gPSAkaWR4O1xuICAgICAgdmFyICRjb2RlID0gaXQudmFsaWRhdGUoJGl0KTtcbiAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgIGlmIChpdC51dGlsLnZhck9jY3VyZW5jZXMoJGNvZGUsICRuZXh0RGF0YSkgPCAyKSB7XG4gICAgICAgIG91dCArPSAnICcgKyAoaXQudXRpbC52YXJSZXBsYWNlKCRjb2RlLCAkbmV4dERhdGEsICRwYXNzRGF0YSkpICsgJyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJG5leHREYXRhKSArICcgPSAnICsgKCRwYXNzRGF0YSkgKyAnOyAnICsgKCRjb2RlKSArICcgJztcbiAgICAgIH1cbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnIGlmICghJyArICgkbmV4dFZhbGlkKSArICcpIGJyZWFrOyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSB9ICAnO1xuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgICAgICRjbG9zaW5nQnJhY2VzICs9ICd9JztcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2hlbWEgPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaGVtYSkubGVuZ3RoID4gMCkgfHwgJHNjaGVtYSA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2hlbWEsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgJGl0LnNjaGVtYSA9ICRzY2hlbWE7XG4gICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aDtcbiAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoO1xuICAgIG91dCArPSAnICBmb3IgKHZhciAnICsgKCRpZHgpICsgJyA9ICcgKyAoMCkgKyAnOyAnICsgKCRpZHgpICsgJyA8ICcgKyAoJGRhdGEpICsgJy5sZW5ndGg7ICcgKyAoJGlkeCkgKyAnKyspIHsgJztcbiAgICAkaXQuZXJyb3JQYXRoID0gaXQudXRpbC5nZXRQYXRoRXhwcihpdC5lcnJvclBhdGgsICRpZHgsIGl0Lm9wdHMuanNvblBvaW50ZXJzLCB0cnVlKTtcbiAgICB2YXIgJHBhc3NEYXRhID0gJGRhdGEgKyAnWycgKyAkaWR4ICsgJ10nO1xuICAgICRpdC5kYXRhUGF0aEFyclskZGF0YU54dF0gPSAkaWR4O1xuICAgIHZhciAkY29kZSA9IGl0LnZhbGlkYXRlKCRpdCk7XG4gICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgIGlmIChpdC51dGlsLnZhck9jY3VyZW5jZXMoJGNvZGUsICRuZXh0RGF0YSkgPCAyKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKGl0LnV0aWwudmFyUmVwbGFjZSgkY29kZSwgJG5leHREYXRhLCAkcGFzc0RhdGEpKSArICcgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJG5leHREYXRhKSArICcgPSAnICsgKCRwYXNzRGF0YSkgKyAnOyAnICsgKCRjb2RlKSArICcgJztcbiAgICB9XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICghJyArICgkbmV4dFZhbGlkKSArICcpIGJyZWFrOyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9JztcbiAgfVxuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnICcgKyAoJGNsb3NpbmdCcmFjZXMpICsgJyBpZiAoJyArICgkZXJycykgKyAnID09IGVycm9ycykgeyc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfbXVsdGlwbGVPZihpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgaWYgKCEoJGlzRGF0YSB8fCB0eXBlb2YgJHNjaGVtYSA9PSAnbnVtYmVyJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJGtleXdvcmQgKyAnIG11c3QgYmUgbnVtYmVyJyk7XG4gIH1cbiAgb3V0ICs9ICd2YXIgZGl2aXNpb24nICsgKCRsdmwpICsgJztpZiAoJztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9PSB1bmRlZmluZWQgJiYgKCB0eXBlb2YgJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPSBcXCdudW1iZXJcXCcgfHwgJztcbiAgfVxuICBvdXQgKz0gJyAoZGl2aXNpb24nICsgKCRsdmwpICsgJyA9ICcgKyAoJGRhdGEpICsgJyAvICcgKyAoJHNjaGVtYVZhbHVlKSArICcsICc7XG4gIGlmIChpdC5vcHRzLm11bHRpcGxlT2ZQcmVjaXNpb24pIHtcbiAgICBvdXQgKz0gJyBNYXRoLmFicyhNYXRoLnJvdW5kKGRpdmlzaW9uJyArICgkbHZsKSArICcpIC0gZGl2aXNpb24nICsgKCRsdmwpICsgJykgPiAxZS0nICsgKGl0Lm9wdHMubXVsdGlwbGVPZlByZWNpc2lvbikgKyAnICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgZGl2aXNpb24nICsgKCRsdmwpICsgJyAhPT0gcGFyc2VJbnQoZGl2aXNpb24nICsgKCRsdmwpICsgJykgJztcbiAgfVxuICBvdXQgKz0gJyApICc7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgICkgICc7XG4gIH1cbiAgb3V0ICs9ICcgKSB7ICAgJztcbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdtdWx0aXBsZU9mJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBtdWx0aXBsZU9mOiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGJlIG11bHRpcGxlIG9mICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ1xcJyArICcgKyAoJHNjaGVtYVZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArICgkc2NoZW1hVmFsdWUpICsgJ1xcJyc7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnfSAnO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX25vdChpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICAkaXQubGV2ZWwrKztcbiAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2hlbWEgPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaGVtYSkubGVuZ3RoID4gMCkgfHwgJHNjaGVtYSA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2hlbWEsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgJGl0LnNjaGVtYSA9ICRzY2hlbWE7XG4gICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aDtcbiAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoO1xuICAgIG91dCArPSAnIHZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7ICAnO1xuICAgIHZhciAkd2FzQ29tcG9zaXRlID0gaXQuY29tcG9zaXRlUnVsZTtcbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICAgICRpdC5jcmVhdGVFcnJvcnMgPSBmYWxzZTtcbiAgICB2YXIgJGFsbEVycm9yc09wdGlvbjtcbiAgICBpZiAoJGl0Lm9wdHMuYWxsRXJyb3JzKSB7XG4gICAgICAkYWxsRXJyb3JzT3B0aW9uID0gJGl0Lm9wdHMuYWxsRXJyb3JzO1xuICAgICAgJGl0Lm9wdHMuYWxsRXJyb3JzID0gZmFsc2U7XG4gICAgfVxuICAgIG91dCArPSAnICcgKyAoaXQudmFsaWRhdGUoJGl0KSkgKyAnICc7XG4gICAgJGl0LmNyZWF0ZUVycm9ycyA9IHRydWU7XG4gICAgaWYgKCRhbGxFcnJvcnNPcHRpb24pICRpdC5vcHRzLmFsbEVycm9ycyA9ICRhbGxFcnJvcnNPcHRpb247XG4gICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gJHdhc0NvbXBvc2l0ZTtcbiAgICBvdXQgKz0gJyBpZiAoJyArICgkbmV4dFZhbGlkKSArICcpIHsgICAnO1xuICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdub3QnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7fSAnO1xuICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIE5PVCBiZSB2YWxpZFxcJyAnO1xuICAgICAgfVxuICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB7fSAnO1xuICAgIH1cbiAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gZWxzZSB7ICBlcnJvcnMgPSAnICsgKCRlcnJzKSArICc7IGlmICh2RXJyb3JzICE9PSBudWxsKSB7IGlmICgnICsgKCRlcnJzKSArICcpIHZFcnJvcnMubGVuZ3RoID0gJyArICgkZXJycykgKyAnOyBlbHNlIHZFcnJvcnMgPSBudWxsOyB9ICc7XG4gICAgaWYgKGl0Lm9wdHMuYWxsRXJyb3JzKSB7XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnICB2YXIgZXJyID0gICAnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ25vdCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHt9ICc7XG4gICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgTk9UIGJlIHZhbGlkXFwnICc7XG4gICAgICB9XG4gICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgfVxuICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmIChmYWxzZSkgeyAnO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb3V0O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9vbmVPZihpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmw7XG4gIHZhciAkZXJycyA9ICdlcnJzX18nICsgJGx2bDtcbiAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gIHZhciAkY2xvc2luZ0JyYWNlcyA9ICcnO1xuICAkaXQubGV2ZWwrKztcbiAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICB2YXIgJGN1cnJlbnRCYXNlSWQgPSAkaXQuYmFzZUlkLFxuICAgICRwcmV2VmFsaWQgPSAncHJldlZhbGlkJyArICRsdmwsXG4gICAgJHBhc3NpbmdTY2hlbWFzID0gJ3Bhc3NpbmdTY2hlbWFzJyArICRsdmw7XG4gIG91dCArPSAndmFyICcgKyAoJGVycnMpICsgJyA9IGVycm9ycyAsICcgKyAoJHByZXZWYWxpZCkgKyAnID0gZmFsc2UgLCAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2UgLCAnICsgKCRwYXNzaW5nU2NoZW1hcykgKyAnID0gbnVsbDsgJztcbiAgdmFyICR3YXNDb21wb3NpdGUgPSBpdC5jb21wb3NpdGVSdWxlO1xuICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICB2YXIgYXJyMSA9ICRzY2hlbWE7XG4gIGlmIChhcnIxKSB7XG4gICAgdmFyICRzY2gsICRpID0gLTEsXG4gICAgICBsMSA9IGFycjEubGVuZ3RoIC0gMTtcbiAgICB3aGlsZSAoJGkgPCBsMSkge1xuICAgICAgJHNjaCA9IGFycjFbJGkgKz0gMV07XG4gICAgICBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2ggPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaCkubGVuZ3RoID4gMCkgfHwgJHNjaCA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2gsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgICAgICRpdC5zY2hlbWEgPSAkc2NoO1xuICAgICAgICAkaXQuc2NoZW1hUGF0aCA9ICRzY2hlbWFQYXRoICsgJ1snICsgJGkgKyAnXSc7XG4gICAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGggKyAnLycgKyAkaTtcbiAgICAgICAgb3V0ICs9ICcgICcgKyAoaXQudmFsaWRhdGUoJGl0KSkgKyAnICc7XG4gICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0VmFsaWQpICsgJyA9IHRydWU7ICc7XG4gICAgICB9XG4gICAgICBpZiAoJGkpIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnICYmICcgKyAoJHByZXZWYWxpZCkgKyAnKSB7ICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgJyArICgkcGFzc2luZ1NjaGVtYXMpICsgJyA9IFsnICsgKCRwYXNzaW5nU2NoZW1hcykgKyAnLCAnICsgKCRpKSArICddOyB9IGVsc2UgeyAnO1xuICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyBpZiAoJyArICgkbmV4dFZhbGlkKSArICcpIHsgJyArICgkdmFsaWQpICsgJyA9ICcgKyAoJHByZXZWYWxpZCkgKyAnID0gdHJ1ZTsgJyArICgkcGFzc2luZ1NjaGVtYXMpICsgJyA9ICcgKyAoJGkpICsgJzsgfSc7XG4gICAgfVxuICB9XG4gIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9ICR3YXNDb21wb3NpdGU7XG4gIG91dCArPSAnJyArICgkY2xvc2luZ0JyYWNlcykgKyAnaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ29uZU9mJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBwYXNzaW5nU2NoZW1hczogJyArICgkcGFzc2luZ1NjaGVtYXMpICsgJyB9ICc7XG4gICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBtYXRjaCBleGFjdGx5IG9uZSBzY2hlbWEgaW4gb25lT2ZcXCcgJztcbiAgICB9XG4gICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHt9ICc7XG4gIH1cbiAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IodkVycm9ycyk7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IHZFcnJvcnM7IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH1cbiAgb3V0ICs9ICd9IGVsc2UgeyAgZXJyb3JzID0gJyArICgkZXJycykgKyAnOyBpZiAodkVycm9ycyAhPT0gbnVsbCkgeyBpZiAoJyArICgkZXJycykgKyAnKSB2RXJyb3JzLmxlbmd0aCA9ICcgKyAoJGVycnMpICsgJzsgZWxzZSB2RXJyb3JzID0gbnVsbDsgfSc7XG4gIGlmIChpdC5vcHRzLmFsbEVycm9ycykge1xuICAgIG91dCArPSAnIH0gJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9wYXR0ZXJuKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkaXNEYXRhID0gaXQub3B0cy4kZGF0YSAmJiAkc2NoZW1hICYmICRzY2hlbWEuJGRhdGEsXG4gICAgJHNjaGVtYVZhbHVlO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciBzY2hlbWEnICsgKCRsdmwpICsgJyA9ICcgKyAoaXQudXRpbC5nZXREYXRhKCRzY2hlbWEuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFycikpICsgJzsgJztcbiAgICAkc2NoZW1hVmFsdWUgPSAnc2NoZW1hJyArICRsdmw7XG4gIH0gZWxzZSB7XG4gICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYTtcbiAgfVxuICB2YXIgJHJlZ2V4cCA9ICRpc0RhdGEgPyAnKG5ldyBSZWdFeHAoJyArICRzY2hlbWFWYWx1ZSArICcpKScgOiBpdC51c2VQYXR0ZXJuKCRzY2hlbWEpO1xuICBvdXQgKz0gJ2lmICggJztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ3N0cmluZ1xcJykgfHwgJztcbiAgfVxuICBvdXQgKz0gJyAhJyArICgkcmVnZXhwKSArICcudGVzdCgnICsgKCRkYXRhKSArICcpICkgeyAgICc7XG4gIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgncGF0dGVybicpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgcGF0dGVybjogICc7XG4gICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgIG91dCArPSAnJyArICgkc2NoZW1hVmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJycgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkc2NoZW1hKSk7XG4gICAgfVxuICAgIG91dCArPSAnICB9ICc7XG4gICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBtYXRjaCBwYXR0ZXJuIFwiJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAnXFwnICsgJyArICgkc2NoZW1hVmFsdWUpICsgJyArIFxcJyc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHNjaGVtYSkpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICdcIlxcJyAnO1xuICAgIH1cbiAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICBvdXQgKz0gJyAsIHNjaGVtYTogICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ3ZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJHNjaGVtYSkpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgICAgICAgICAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHt9ICc7XG4gIH1cbiAgdmFyIF9fZXJyID0gb3V0O1xuICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgIGlmIChpdC5hc3luYykge1xuICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgfVxuICBvdXQgKz0gJ30gJztcbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9wcm9wZXJ0aWVzKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkZXJycyA9ICdlcnJzX18nICsgJGx2bDtcbiAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gIHZhciAkY2xvc2luZ0JyYWNlcyA9ICcnO1xuICAkaXQubGV2ZWwrKztcbiAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICB2YXIgJGtleSA9ICdrZXknICsgJGx2bCxcbiAgICAkaWR4ID0gJ2lkeCcgKyAkbHZsLFxuICAgICRkYXRhTnh0ID0gJGl0LmRhdGFMZXZlbCA9IGl0LmRhdGFMZXZlbCArIDEsXG4gICAgJG5leHREYXRhID0gJ2RhdGEnICsgJGRhdGFOeHQsXG4gICAgJGRhdGFQcm9wZXJ0aWVzID0gJ2RhdGFQcm9wZXJ0aWVzJyArICRsdmw7XG4gIHZhciAkc2NoZW1hS2V5cyA9IE9iamVjdC5rZXlzKCRzY2hlbWEgfHwge30pLmZpbHRlcihub3RQcm90byksXG4gICAgJHBQcm9wZXJ0aWVzID0gaXQuc2NoZW1hLnBhdHRlcm5Qcm9wZXJ0aWVzIHx8IHt9LFxuICAgICRwUHJvcGVydHlLZXlzID0gT2JqZWN0LmtleXMoJHBQcm9wZXJ0aWVzKS5maWx0ZXIobm90UHJvdG8pLFxuICAgICRhUHJvcGVydGllcyA9IGl0LnNjaGVtYS5hZGRpdGlvbmFsUHJvcGVydGllcyxcbiAgICAkc29tZVByb3BlcnRpZXMgPSAkc2NoZW1hS2V5cy5sZW5ndGggfHwgJHBQcm9wZXJ0eUtleXMubGVuZ3RoLFxuICAgICRub0FkZGl0aW9uYWwgPSAkYVByb3BlcnRpZXMgPT09IGZhbHNlLFxuICAgICRhZGRpdGlvbmFsSXNTY2hlbWEgPSB0eXBlb2YgJGFQcm9wZXJ0aWVzID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRhUHJvcGVydGllcykubGVuZ3RoLFxuICAgICRyZW1vdmVBZGRpdGlvbmFsID0gaXQub3B0cy5yZW1vdmVBZGRpdGlvbmFsLFxuICAgICRjaGVja0FkZGl0aW9uYWwgPSAkbm9BZGRpdGlvbmFsIHx8ICRhZGRpdGlvbmFsSXNTY2hlbWEgfHwgJHJlbW92ZUFkZGl0aW9uYWwsXG4gICAgJG93blByb3BlcnRpZXMgPSBpdC5vcHRzLm93blByb3BlcnRpZXMsXG4gICAgJGN1cnJlbnRCYXNlSWQgPSBpdC5iYXNlSWQ7XG4gIHZhciAkcmVxdWlyZWQgPSBpdC5zY2hlbWEucmVxdWlyZWQ7XG4gIGlmICgkcmVxdWlyZWQgJiYgIShpdC5vcHRzLiRkYXRhICYmICRyZXF1aXJlZC4kZGF0YSkgJiYgJHJlcXVpcmVkLmxlbmd0aCA8IGl0Lm9wdHMubG9vcFJlcXVpcmVkKSB7XG4gICAgdmFyICRyZXF1aXJlZEhhc2ggPSBpdC51dGlsLnRvSGFzaCgkcmVxdWlyZWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gbm90UHJvdG8ocCkge1xuICAgIHJldHVybiBwICE9PSAnX19wcm90b19fJztcbiAgfVxuICBvdXQgKz0gJ3ZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7dmFyICcgKyAoJG5leHRWYWxpZCkgKyAnID0gdHJ1ZTsnO1xuICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICBvdXQgKz0gJyB2YXIgJyArICgkZGF0YVByb3BlcnRpZXMpICsgJyA9IHVuZGVmaW5lZDsnO1xuICB9XG4gIGlmICgkY2hlY2tBZGRpdGlvbmFsKSB7XG4gICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnID0gJyArICgkZGF0YVByb3BlcnRpZXMpICsgJyB8fCBPYmplY3Qua2V5cygnICsgKCRkYXRhKSArICcpOyBmb3IgKHZhciAnICsgKCRpZHgpICsgJz0wOyAnICsgKCRpZHgpICsgJzwnICsgKCRkYXRhUHJvcGVydGllcykgKyAnLmxlbmd0aDsgJyArICgkaWR4KSArICcrKykgeyB2YXIgJyArICgka2V5KSArICcgPSAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnWycgKyAoJGlkeCkgKyAnXTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgZm9yICh2YXIgJyArICgka2V5KSArICcgaW4gJyArICgkZGF0YSkgKyAnKSB7ICc7XG4gICAgfVxuICAgIGlmICgkc29tZVByb3BlcnRpZXMpIHtcbiAgICAgIG91dCArPSAnIHZhciBpc0FkZGl0aW9uYWwnICsgKCRsdmwpICsgJyA9ICEoZmFsc2UgJztcbiAgICAgIGlmICgkc2NoZW1hS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKCRzY2hlbWFLZXlzLmxlbmd0aCA+IDgpIHtcbiAgICAgICAgICBvdXQgKz0gJyB8fCB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcuaGFzT3duUHJvcGVydHkoJyArICgka2V5KSArICcpICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGFycjEgPSAkc2NoZW1hS2V5cztcbiAgICAgICAgICBpZiAoYXJyMSkge1xuICAgICAgICAgICAgdmFyICRwcm9wZXJ0eUtleSwgaTEgPSAtMSxcbiAgICAgICAgICAgICAgbDEgPSBhcnIxLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICB3aGlsZSAoaTEgPCBsMSkge1xuICAgICAgICAgICAgICAkcHJvcGVydHlLZXkgPSBhcnIxW2kxICs9IDFdO1xuICAgICAgICAgICAgICBvdXQgKz0gJyB8fCAnICsgKCRrZXkpICsgJyA9PSAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJHByb3BlcnR5S2V5KSkgKyAnICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoJHBQcm9wZXJ0eUtleXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBhcnIyID0gJHBQcm9wZXJ0eUtleXM7XG4gICAgICAgIGlmIChhcnIyKSB7XG4gICAgICAgICAgdmFyICRwUHJvcGVydHksICRpID0gLTEsXG4gICAgICAgICAgICBsMiA9IGFycjIubGVuZ3RoIC0gMTtcbiAgICAgICAgICB3aGlsZSAoJGkgPCBsMikge1xuICAgICAgICAgICAgJHBQcm9wZXJ0eSA9IGFycjJbJGkgKz0gMV07XG4gICAgICAgICAgICBvdXQgKz0gJyB8fCAnICsgKGl0LnVzZVBhdHRlcm4oJHBQcm9wZXJ0eSkpICsgJy50ZXN0KCcgKyAoJGtleSkgKyAnKSAnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb3V0ICs9ICcgKTsgaWYgKGlzQWRkaXRpb25hbCcgKyAoJGx2bCkgKyAnKSB7ICc7XG4gICAgfVxuICAgIGlmICgkcmVtb3ZlQWRkaXRpb25hbCA9PSAnYWxsJykge1xuICAgICAgb3V0ICs9ICcgZGVsZXRlICcgKyAoJGRhdGEpICsgJ1snICsgKCRrZXkpICsgJ107ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciAkY3VycmVudEVycm9yUGF0aCA9IGl0LmVycm9yUGF0aDtcbiAgICAgIHZhciAkYWRkaXRpb25hbFByb3BlcnR5ID0gJ1xcJyArICcgKyAka2V5ICsgJyArIFxcJyc7XG4gICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgIGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAka2V5LCBpdC5vcHRzLmpzb25Qb2ludGVycyk7XG4gICAgICB9XG4gICAgICBpZiAoJG5vQWRkaXRpb25hbCkge1xuICAgICAgICBpZiAoJHJlbW92ZUFkZGl0aW9uYWwpIHtcbiAgICAgICAgICBvdXQgKz0gJyBkZWxldGUgJyArICgkZGF0YSkgKyAnWycgKyAoJGtleSkgKyAnXTsgJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXQgKz0gJyAnICsgKCRuZXh0VmFsaWQpICsgJyA9IGZhbHNlOyAnO1xuICAgICAgICAgIHZhciAkY3VyckVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aDtcbiAgICAgICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnL2FkZGl0aW9uYWxQcm9wZXJ0aWVzJztcbiAgICAgICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAgICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnYWRkaXRpb25hbFByb3BlcnRpZXMnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGFkZGl0aW9uYWxQcm9wZXJ0eTogXFwnJyArICgkYWRkaXRpb25hbFByb3BlcnR5KSArICdcXCcgfSAnO1xuICAgICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnJztcbiAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIG91dCArPSAnaXMgYW4gaW52YWxpZCBhZGRpdGlvbmFsIHByb3BlcnR5JztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBOT1QgaGF2ZSBhZGRpdGlvbmFsIHByb3BlcnRpZXMnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG91dCArPSAnXFwnICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiBmYWxzZSAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICAkZXJyU2NoZW1hUGF0aCA9ICRjdXJyRXJyU2NoZW1hUGF0aDtcbiAgICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgb3V0ICs9ICcgYnJlYWs7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCRhZGRpdGlvbmFsSXNTY2hlbWEpIHtcbiAgICAgICAgaWYgKCRyZW1vdmVBZGRpdGlvbmFsID09ICdmYWlsaW5nJykge1xuICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7ICAnO1xuICAgICAgICAgIHZhciAkd2FzQ29tcG9zaXRlID0gaXQuY29tcG9zaXRlUnVsZTtcbiAgICAgICAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICAgICAgICAgICRpdC5zY2hlbWEgPSAkYVByb3BlcnRpZXM7XG4gICAgICAgICAgJGl0LnNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgJy5hZGRpdGlvbmFsUHJvcGVydGllcyc7XG4gICAgICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy9hZGRpdGlvbmFsUHJvcGVydGllcyc7XG4gICAgICAgICAgJGl0LmVycm9yUGF0aCA9IGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSA/IGl0LmVycm9yUGF0aCA6IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAka2V5LCBpdC5vcHRzLmpzb25Qb2ludGVycyk7XG4gICAgICAgICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgJ1snICsgJGtleSArICddJztcbiAgICAgICAgICAkaXQuZGF0YVBhdGhBcnJbJGRhdGFOeHRdID0gJGtleTtcbiAgICAgICAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpO1xuICAgICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgICAgICBpZiAoaXQudXRpbC52YXJPY2N1cmVuY2VzKCRjb2RlLCAkbmV4dERhdGEpIDwgMikge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51dGlsLnZhclJlcGxhY2UoJGNvZGUsICRuZXh0RGF0YSwgJHBhc3NEYXRhKSkgKyAnICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJyArICgkY29kZSkgKyAnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnIGlmICghJyArICgkbmV4dFZhbGlkKSArICcpIHsgZXJyb3JzID0gJyArICgkZXJycykgKyAnOyBpZiAodmFsaWRhdGUuZXJyb3JzICE9PSBudWxsKSB7IGlmIChlcnJvcnMpIHZhbGlkYXRlLmVycm9ycy5sZW5ndGggPSBlcnJvcnM7IGVsc2UgdmFsaWRhdGUuZXJyb3JzID0gbnVsbDsgfSBkZWxldGUgJyArICgkZGF0YSkgKyAnWycgKyAoJGtleSkgKyAnXTsgfSAgJztcbiAgICAgICAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSAkd2FzQ29tcG9zaXRlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRpdC5zY2hlbWEgPSAkYVByb3BlcnRpZXM7XG4gICAgICAgICAgJGl0LnNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgJy5hZGRpdGlvbmFsUHJvcGVydGllcyc7XG4gICAgICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy9hZGRpdGlvbmFsUHJvcGVydGllcyc7XG4gICAgICAgICAgJGl0LmVycm9yUGF0aCA9IGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSA/IGl0LmVycm9yUGF0aCA6IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAka2V5LCBpdC5vcHRzLmpzb25Qb2ludGVycyk7XG4gICAgICAgICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgJ1snICsgJGtleSArICddJztcbiAgICAgICAgICAkaXQuZGF0YVBhdGhBcnJbJGRhdGFOeHRdID0gJGtleTtcbiAgICAgICAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpO1xuICAgICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgICAgICBpZiAoaXQudXRpbC52YXJPY2N1cmVuY2VzKCRjb2RlLCAkbmV4dERhdGEpIDwgMikge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51dGlsLnZhclJlcGxhY2UoJGNvZGUsICRuZXh0RGF0YSwgJHBhc3NEYXRhKSkgKyAnICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJyArICgkY29kZSkgKyAnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSBicmVhazsgJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGl0LmVycm9yUGF0aCA9ICRjdXJyZW50RXJyb3JQYXRoO1xuICAgIH1cbiAgICBpZiAoJHNvbWVQcm9wZXJ0aWVzKSB7XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gICc7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJykgeyAnO1xuICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgIH1cbiAgfVxuICB2YXIgJHVzZURlZmF1bHRzID0gaXQub3B0cy51c2VEZWZhdWx0cyAmJiAhaXQuY29tcG9zaXRlUnVsZTtcbiAgaWYgKCRzY2hlbWFLZXlzLmxlbmd0aCkge1xuICAgIHZhciBhcnIzID0gJHNjaGVtYUtleXM7XG4gICAgaWYgKGFycjMpIHtcbiAgICAgIHZhciAkcHJvcGVydHlLZXksIGkzID0gLTEsXG4gICAgICAgIGwzID0gYXJyMy5sZW5ndGggLSAxO1xuICAgICAgd2hpbGUgKGkzIDwgbDMpIHtcbiAgICAgICAgJHByb3BlcnR5S2V5ID0gYXJyM1tpMyArPSAxXTtcbiAgICAgICAgdmFyICRzY2ggPSAkc2NoZW1hWyRwcm9wZXJ0eUtleV07XG4gICAgICAgIGlmICgoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHNjaCA9PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cygkc2NoKS5sZW5ndGggPiAwKSB8fCAkc2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHNjaCwgaXQuUlVMRVMuYWxsKSkpIHtcbiAgICAgICAgICB2YXIgJHByb3AgPSBpdC51dGlsLmdldFByb3BlcnR5KCRwcm9wZXJ0eUtleSksXG4gICAgICAgICAgICAkcGFzc0RhdGEgPSAkZGF0YSArICRwcm9wLFxuICAgICAgICAgICAgJGhhc0RlZmF1bHQgPSAkdXNlRGVmYXVsdHMgJiYgJHNjaC5kZWZhdWx0ICE9PSB1bmRlZmluZWQ7XG4gICAgICAgICAgJGl0LnNjaGVtYSA9ICRzY2g7XG4gICAgICAgICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aCArICRwcm9wO1xuICAgICAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGggKyAnLycgKyBpdC51dGlsLmVzY2FwZUZyYWdtZW50KCRwcm9wZXJ0eUtleSk7XG4gICAgICAgICAgJGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aChpdC5lcnJvclBhdGgsICRwcm9wZXJ0eUtleSwgaXQub3B0cy5qc29uUG9pbnRlcnMpO1xuICAgICAgICAgICRpdC5kYXRhUGF0aEFyclskZGF0YU54dF0gPSBpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRwcm9wZXJ0eUtleSk7XG4gICAgICAgICAgdmFyICRjb2RlID0gaXQudmFsaWRhdGUoJGl0KTtcbiAgICAgICAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgICAgICAgaWYgKGl0LnV0aWwudmFyT2NjdXJlbmNlcygkY29kZSwgJG5leHREYXRhKSA8IDIpIHtcbiAgICAgICAgICAgICRjb2RlID0gaXQudXRpbC52YXJSZXBsYWNlKCRjb2RlLCAkbmV4dERhdGEsICRwYXNzRGF0YSk7XG4gICAgICAgICAgICB2YXIgJHVzZURhdGEgPSAkcGFzc0RhdGE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciAkdXNlRGF0YSA9ICRuZXh0RGF0YTtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCRoYXNEZWZhdWx0KSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAnICsgKCRjb2RlKSArICcgJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCRyZXF1aXJlZEhhc2ggJiYgJHJlcXVpcmVkSGFzaFskcHJvcGVydHlLZXldKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIGlmICggJyArICgkdXNlRGF0YSkgKyAnID09PSB1bmRlZmluZWQgJztcbiAgICAgICAgICAgICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgISBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSkpICsgJ1xcJykgJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBvdXQgKz0gJykgeyAnICsgKCRuZXh0VmFsaWQpICsgJyA9IGZhbHNlOyAnO1xuICAgICAgICAgICAgICB2YXIgJGN1cnJlbnRFcnJvclBhdGggPSBpdC5lcnJvclBhdGgsXG4gICAgICAgICAgICAgICAgJGN1cnJFcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGgsXG4gICAgICAgICAgICAgICAgJG1pc3NpbmdQcm9wZXJ0eSA9IGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSk7XG4gICAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICBpdC5lcnJvclBhdGggPSBpdC51dGlsLmdldFBhdGgoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eUtleSwgaXQub3B0cy5qc29uUG9pbnRlcnMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvcmVxdWlyZWQnO1xuICAgICAgICAgICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAgICAgICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgICAgICAgICAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ3JlcXVpcmVkJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBtaXNzaW5nUHJvcGVydHk6IFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFwnIH0gJztcbiAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnJztcbiAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICdpcyBhIHJlcXVpcmVkIHByb3BlcnR5JztcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSAnc2hvdWxkIGhhdmUgcmVxdWlyZWQgcHJvcGVydHkgXFxcXFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFxcXFxcJyc7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJ1xcJyAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICAgICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgICAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICRlcnJTY2hlbWFQYXRoID0gJGN1cnJFcnJTY2hlbWFQYXRoO1xuICAgICAgICAgICAgICBpdC5lcnJvclBhdGggPSAkY3VycmVudEVycm9yUGF0aDtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgfSBlbHNlIHsgJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgaWYgKCAnICsgKCR1c2VEYXRhKSArICcgPT09IHVuZGVmaW5lZCAnO1xuICAgICAgICAgICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgISBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSkpICsgJ1xcJykgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcpIHsgJyArICgkbmV4dFZhbGlkKSArICcgPSB0cnVlOyB9IGVsc2UgeyAnO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCR1c2VEYXRhKSArICcgIT09IHVuZGVmaW5lZCAnO1xuICAgICAgICAgICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgJiYgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSkpICsgJ1xcJykgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgKSB7ICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnICcgKyAoJGNvZGUpICsgJyB9ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICgkcFByb3BlcnR5S2V5cy5sZW5ndGgpIHtcbiAgICB2YXIgYXJyNCA9ICRwUHJvcGVydHlLZXlzO1xuICAgIGlmIChhcnI0KSB7XG4gICAgICB2YXIgJHBQcm9wZXJ0eSwgaTQgPSAtMSxcbiAgICAgICAgbDQgPSBhcnI0Lmxlbmd0aCAtIDE7XG4gICAgICB3aGlsZSAoaTQgPCBsNCkge1xuICAgICAgICAkcFByb3BlcnR5ID0gYXJyNFtpNCArPSAxXTtcbiAgICAgICAgdmFyICRzY2ggPSAkcFByb3BlcnRpZXNbJHBQcm9wZXJ0eV07XG4gICAgICAgIGlmICgoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHNjaCA9PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cygkc2NoKS5sZW5ndGggPiAwKSB8fCAkc2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHNjaCwgaXQuUlVMRVMuYWxsKSkpIHtcbiAgICAgICAgICAkaXQuc2NoZW1hID0gJHNjaDtcbiAgICAgICAgICAkaXQuc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyAnLnBhdHRlcm5Qcm9wZXJ0aWVzJyArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJHBQcm9wZXJ0eSk7XG4gICAgICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy9wYXR0ZXJuUHJvcGVydGllcy8nICsgaXQudXRpbC5lc2NhcGVGcmFnbWVudCgkcFByb3BlcnR5KTtcbiAgICAgICAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIG91dCArPSAnICcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICcgPSAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnIHx8IE9iamVjdC5rZXlzKCcgKyAoJGRhdGEpICsgJyk7IGZvciAodmFyICcgKyAoJGlkeCkgKyAnPTA7ICcgKyAoJGlkeCkgKyAnPCcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICcubGVuZ3RoOyAnICsgKCRpZHgpICsgJysrKSB7IHZhciAnICsgKCRrZXkpICsgJyA9ICcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICdbJyArICgkaWR4KSArICddOyAnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBmb3IgKHZhciAnICsgKCRrZXkpICsgJyBpbiAnICsgKCRkYXRhKSArICcpIHsgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoaXQudXNlUGF0dGVybigkcFByb3BlcnR5KSkgKyAnLnRlc3QoJyArICgka2V5KSArICcpKSB7ICc7XG4gICAgICAgICAgJGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAka2V5LCBpdC5vcHRzLmpzb25Qb2ludGVycyk7XG4gICAgICAgICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgJ1snICsgJGtleSArICddJztcbiAgICAgICAgICAkaXQuZGF0YVBhdGhBcnJbJGRhdGFOeHRdID0gJGtleTtcbiAgICAgICAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpO1xuICAgICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgICAgICBpZiAoaXQudXRpbC52YXJPY2N1cmVuY2VzKCRjb2RlLCAkbmV4dERhdGEpIDwgMikge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51dGlsLnZhclJlcGxhY2UoJGNvZGUsICRuZXh0RGF0YSwgJHBhc3NEYXRhKSkgKyAnICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJyArICgkY29kZSkgKyAnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSBicmVhazsgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBlbHNlICcgKyAoJG5leHRWYWxpZCkgKyAnID0gdHJ1ZTsgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAgJztcbiAgICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgJyArICgkY2xvc2luZ0JyYWNlcykgKyAnIGlmICgnICsgKCRlcnJzKSArICcgPT0gZXJyb3JzKSB7JztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9wcm9wZXJ0eU5hbWVzKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkZXJycyA9ICdlcnJzX18nICsgJGx2bDtcbiAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gIHZhciAkY2xvc2luZ0JyYWNlcyA9ICcnO1xuICAkaXQubGV2ZWwrKztcbiAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICBvdXQgKz0gJ3ZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7JztcbiAgaWYgKChpdC5vcHRzLnN0cmljdEtleXdvcmRzID8gKHR5cGVvZiAkc2NoZW1hID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRzY2hlbWEpLmxlbmd0aCA+IDApIHx8ICRzY2hlbWEgPT09IGZhbHNlIDogaXQudXRpbC5zY2hlbWFIYXNSdWxlcygkc2NoZW1hLCBpdC5SVUxFUy5hbGwpKSkge1xuICAgICRpdC5zY2hlbWEgPSAkc2NoZW1hO1xuICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGg7XG4gICAgJGl0LmVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aDtcbiAgICB2YXIgJGtleSA9ICdrZXknICsgJGx2bCxcbiAgICAgICRpZHggPSAnaWR4JyArICRsdmwsXG4gICAgICAkaSA9ICdpJyArICRsdmwsXG4gICAgICAkaW52YWxpZE5hbWUgPSAnXFwnICsgJyArICRrZXkgKyAnICsgXFwnJyxcbiAgICAgICRkYXRhTnh0ID0gJGl0LmRhdGFMZXZlbCA9IGl0LmRhdGFMZXZlbCArIDEsXG4gICAgICAkbmV4dERhdGEgPSAnZGF0YScgKyAkZGF0YU54dCxcbiAgICAgICRkYXRhUHJvcGVydGllcyA9ICdkYXRhUHJvcGVydGllcycgKyAkbHZsLFxuICAgICAgJG93blByb3BlcnRpZXMgPSBpdC5vcHRzLm93blByb3BlcnRpZXMsXG4gICAgICAkY3VycmVudEJhc2VJZCA9IGl0LmJhc2VJZDtcbiAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgIG91dCArPSAnIHZhciAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnID0gdW5kZWZpbmVkOyAnO1xuICAgIH1cbiAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgIG91dCArPSAnICcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICcgPSAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnIHx8IE9iamVjdC5rZXlzKCcgKyAoJGRhdGEpICsgJyk7IGZvciAodmFyICcgKyAoJGlkeCkgKyAnPTA7ICcgKyAoJGlkeCkgKyAnPCcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICcubGVuZ3RoOyAnICsgKCRpZHgpICsgJysrKSB7IHZhciAnICsgKCRrZXkpICsgJyA9ICcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICdbJyArICgkaWR4KSArICddOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyBmb3IgKHZhciAnICsgKCRrZXkpICsgJyBpbiAnICsgKCRkYXRhKSArICcpIHsgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgdmFyIHN0YXJ0RXJycycgKyAoJGx2bCkgKyAnID0gZXJyb3JzOyAnO1xuICAgIHZhciAkcGFzc0RhdGEgPSAka2V5O1xuICAgIHZhciAkd2FzQ29tcG9zaXRlID0gaXQuY29tcG9zaXRlUnVsZTtcbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICAgIHZhciAkY29kZSA9IGl0LnZhbGlkYXRlKCRpdCk7XG4gICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgIGlmIChpdC51dGlsLnZhck9jY3VyZW5jZXMoJGNvZGUsICRuZXh0RGF0YSkgPCAyKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKGl0LnV0aWwudmFyUmVwbGFjZSgkY29kZSwgJG5leHREYXRhLCAkcGFzc0RhdGEpKSArICcgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJG5leHREYXRhKSArICcgPSAnICsgKCRwYXNzRGF0YSkgKyAnOyAnICsgKCRjb2RlKSArICcgJztcbiAgICB9XG4gICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gJHdhc0NvbXBvc2l0ZTtcbiAgICBvdXQgKz0gJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSB7IGZvciAodmFyICcgKyAoJGkpICsgJz1zdGFydEVycnMnICsgKCRsdmwpICsgJzsgJyArICgkaSkgKyAnPGVycm9yczsgJyArICgkaSkgKyAnKyspIHsgdkVycm9yc1snICsgKCRpKSArICddLnByb3BlcnR5TmFtZSA9ICcgKyAoJGtleSkgKyAnOyB9ICAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdwcm9wZXJ0eU5hbWVzJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBwcm9wZXJ0eU5hbWU6IFxcJycgKyAoJGludmFsaWROYW1lKSArICdcXCcgfSAnO1xuICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwncHJvcGVydHkgbmFtZSBcXFxcXFwnJyArICgkaW52YWxpZE5hbWUpICsgJ1xcXFxcXCcgaXMgaW52YWxpZFxcJyAnO1xuICAgICAgfVxuICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB7fSAnO1xuICAgIH1cbiAgICBvdXQgKz0gJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKHZFcnJvcnMpOyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gdkVycm9yczsgcmV0dXJuIGZhbHNlOyAnO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgb3V0ICs9ICcgYnJlYWs7ICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gfSc7XG4gIH1cbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyAnICsgKCRjbG9zaW5nQnJhY2VzKSArICcgaWYgKCcgKyAoJGVycnMpICsgJyA9PSBlcnJvcnMpIHsnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX3JlZihpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGFzeW5jLCAkcmVmQ29kZTtcbiAgaWYgKCRzY2hlbWEgPT0gJyMnIHx8ICRzY2hlbWEgPT0gJyMvJykge1xuICAgIGlmIChpdC5pc1Jvb3QpIHtcbiAgICAgICRhc3luYyA9IGl0LmFzeW5jO1xuICAgICAgJHJlZkNvZGUgPSAndmFsaWRhdGUnO1xuICAgIH0gZWxzZSB7XG4gICAgICAkYXN5bmMgPSBpdC5yb290LnNjaGVtYS4kYXN5bmMgPT09IHRydWU7XG4gICAgICAkcmVmQ29kZSA9ICdyb290LnJlZlZhbFswXSc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciAkcmVmVmFsID0gaXQucmVzb2x2ZVJlZihpdC5iYXNlSWQsICRzY2hlbWEsIGl0LmlzUm9vdCk7XG4gICAgaWYgKCRyZWZWYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdmFyICRtZXNzYWdlID0gaXQuTWlzc2luZ1JlZkVycm9yLm1lc3NhZ2UoaXQuYmFzZUlkLCAkc2NoZW1hKTtcbiAgICAgIGlmIChpdC5vcHRzLm1pc3NpbmdSZWZzID09ICdmYWlsJykge1xuICAgICAgICBpdC5sb2dnZXIuZXJyb3IoJG1lc3NhZ2UpO1xuICAgICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgICAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJyRyZWYnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IHJlZjogXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3Rlcygkc2NoZW1hKSkgKyAnXFwnIH0gJztcbiAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnY2FuXFxcXFxcJ3QgcmVzb2x2ZSByZWZlcmVuY2UgJyArIChpdC51dGlsLmVzY2FwZVF1b3Rlcygkc2NoZW1hKSkgKyAnXFwnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJHNjaGVtYSkpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIG91dCArPSAnIGlmIChmYWxzZSkgeyAnO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGl0Lm9wdHMubWlzc2luZ1JlZnMgPT0gJ2lnbm9yZScpIHtcbiAgICAgICAgaXQubG9nZ2VyLndhcm4oJG1lc3NhZ2UpO1xuICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBpdC5NaXNzaW5nUmVmRXJyb3IoaXQuYmFzZUlkLCAkc2NoZW1hLCAkbWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICgkcmVmVmFsLmlubGluZSkge1xuICAgICAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gICAgICAkaXQubGV2ZWwrKztcbiAgICAgIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgICAgICRpdC5zY2hlbWEgPSAkcmVmVmFsLnNjaGVtYTtcbiAgICAgICRpdC5zY2hlbWFQYXRoID0gJyc7XG4gICAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRzY2hlbWE7XG4gICAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpLnJlcGxhY2UoL3ZhbGlkYXRlXFwuc2NoZW1hL2csICRyZWZWYWwuY29kZSk7XG4gICAgICBvdXQgKz0gJyAnICsgKCRjb2RlKSArICcgJztcbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJykgeyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAkYXN5bmMgPSAkcmVmVmFsLiRhc3luYyA9PT0gdHJ1ZSB8fCAoaXQuYXN5bmMgJiYgJHJlZlZhbC4kYXN5bmMgIT09IGZhbHNlKTtcbiAgICAgICRyZWZDb2RlID0gJHJlZlZhbC5jb2RlO1xuICAgIH1cbiAgfVxuICBpZiAoJHJlZkNvZGUpIHtcbiAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgb3V0ID0gJyc7XG4gICAgaWYgKGl0Lm9wdHMucGFzc0NvbnRleHQpIHtcbiAgICAgIG91dCArPSAnICcgKyAoJHJlZkNvZGUpICsgJy5jYWxsKHRoaXMsICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnICcgKyAoJHJlZkNvZGUpICsgJyggJztcbiAgICB9XG4gICAgb3V0ICs9ICcgJyArICgkZGF0YSkgKyAnLCAoZGF0YVBhdGggfHwgXFwnXFwnKSc7XG4gICAgaWYgKGl0LmVycm9yUGF0aCAhPSAnXCJcIicpIHtcbiAgICAgIG91dCArPSAnICsgJyArIChpdC5lcnJvclBhdGgpO1xuICAgIH1cbiAgICB2YXIgJHBhcmVudERhdGEgPSAkZGF0YUx2bCA/ICdkYXRhJyArICgoJGRhdGFMdmwgLSAxKSB8fCAnJykgOiAncGFyZW50RGF0YScsXG4gICAgICAkcGFyZW50RGF0YVByb3BlcnR5ID0gJGRhdGFMdmwgPyBpdC5kYXRhUGF0aEFyclskZGF0YUx2bF0gOiAncGFyZW50RGF0YVByb3BlcnR5JztcbiAgICBvdXQgKz0gJyAsICcgKyAoJHBhcmVudERhdGEpICsgJyAsICcgKyAoJHBhcmVudERhdGFQcm9wZXJ0eSkgKyAnLCByb290RGF0YSkgICc7XG4gICAgdmFyIF9fY2FsbFZhbGlkYXRlID0gb3V0O1xuICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgaWYgKCRhc3luYykge1xuICAgICAgaWYgKCFpdC5hc3luYykgdGhyb3cgbmV3IEVycm9yKCdhc3luYyBzY2hlbWEgcmVmZXJlbmNlZCBieSBzeW5jIHNjaGVtYScpO1xuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJHZhbGlkKSArICc7ICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB0cnkgeyBhd2FpdCAnICsgKF9fY2FsbFZhbGlkYXRlKSArICc7ICc7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZTsgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gY2F0Y2ggKGUpIHsgaWYgKCEoZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHRocm93IGU7IGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gZS5lcnJvcnM7IGVsc2UgdkVycm9ycyA9IHZFcnJvcnMuY29uY2F0KGUuZXJyb3JzKTsgZXJyb3JzID0gdkVycm9ycy5sZW5ndGg7ICc7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7ICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICBvdXQgKz0gJyBpZiAoJyArICgkdmFsaWQpICsgJykgeyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyBpZiAoIScgKyAoX19jYWxsVmFsaWRhdGUpICsgJykgeyBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9ICcgKyAoJHJlZkNvZGUpICsgJy5lcnJvcnM7IGVsc2UgdkVycm9ycyA9IHZFcnJvcnMuY29uY2F0KCcgKyAoJHJlZkNvZGUpICsgJy5lcnJvcnMpOyBlcnJvcnMgPSB2RXJyb3JzLmxlbmd0aDsgfSAnO1xuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX3JlcXVpcmVkKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkdmFsaWQgPSAndmFsaWQnICsgJGx2bDtcbiAgdmFyICRpc0RhdGEgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWEgJiYgJHNjaGVtYS4kZGF0YSxcbiAgICAkc2NoZW1hVmFsdWU7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLmdldERhdGEoJHNjaGVtYS4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgfSBlbHNlIHtcbiAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hO1xuICB9XG4gIHZhciAkdlNjaGVtYSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgaWYgKCEkaXNEYXRhKSB7XG4gICAgaWYgKCRzY2hlbWEubGVuZ3RoIDwgaXQub3B0cy5sb29wUmVxdWlyZWQgJiYgaXQuc2NoZW1hLnByb3BlcnRpZXMgJiYgT2JqZWN0LmtleXMoaXQuc2NoZW1hLnByb3BlcnRpZXMpLmxlbmd0aCkge1xuICAgICAgdmFyICRyZXF1aXJlZCA9IFtdO1xuICAgICAgdmFyIGFycjEgPSAkc2NoZW1hO1xuICAgICAgaWYgKGFycjEpIHtcbiAgICAgICAgdmFyICRwcm9wZXJ0eSwgaTEgPSAtMSxcbiAgICAgICAgICBsMSA9IGFycjEubGVuZ3RoIC0gMTtcbiAgICAgICAgd2hpbGUgKGkxIDwgbDEpIHtcbiAgICAgICAgICAkcHJvcGVydHkgPSBhcnIxW2kxICs9IDFdO1xuICAgICAgICAgIHZhciAkcHJvcGVydHlTY2ggPSBpdC5zY2hlbWEucHJvcGVydGllc1skcHJvcGVydHldO1xuICAgICAgICAgIGlmICghKCRwcm9wZXJ0eVNjaCAmJiAoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHByb3BlcnR5U2NoID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRwcm9wZXJ0eVNjaCkubGVuZ3RoID4gMCkgfHwgJHByb3BlcnR5U2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHByb3BlcnR5U2NoLCBpdC5SVUxFUy5hbGwpKSkpIHtcbiAgICAgICAgICAgICRyZXF1aXJlZFskcmVxdWlyZWQubGVuZ3RoXSA9ICRwcm9wZXJ0eTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyICRyZXF1aXJlZCA9ICRzY2hlbWE7XG4gICAgfVxuICB9XG4gIGlmICgkaXNEYXRhIHx8ICRyZXF1aXJlZC5sZW5ndGgpIHtcbiAgICB2YXIgJGN1cnJlbnRFcnJvclBhdGggPSBpdC5lcnJvclBhdGgsXG4gICAgICAkbG9vcFJlcXVpcmVkID0gJGlzRGF0YSB8fCAkcmVxdWlyZWQubGVuZ3RoID49IGl0Lm9wdHMubG9vcFJlcXVpcmVkLFxuICAgICAgJG93blByb3BlcnRpZXMgPSBpdC5vcHRzLm93blByb3BlcnRpZXM7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIHZhciBtaXNzaW5nJyArICgkbHZsKSArICc7ICc7XG4gICAgICBpZiAoJGxvb3BSZXF1aXJlZCkge1xuICAgICAgICBpZiAoISRpc0RhdGEpIHtcbiAgICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkdlNjaGVtYSkgKyAnID0gdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnOyAnO1xuICAgICAgICB9XG4gICAgICAgIHZhciAkaSA9ICdpJyArICRsdmwsXG4gICAgICAgICAgJHByb3BlcnR5UGF0aCA9ICdzY2hlbWEnICsgJGx2bCArICdbJyArICRpICsgJ10nLFxuICAgICAgICAgICRtaXNzaW5nUHJvcGVydHkgPSAnXFwnICsgJyArICRwcm9wZXJ0eVBhdGggKyAnICsgXFwnJztcbiAgICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICAgIGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eVBhdGgsIGl0Lm9wdHMuanNvblBvaW50ZXJzKTtcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkdmFsaWQpICsgJyA9IHRydWU7ICc7XG4gICAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKHNjaGVtYScgKyAoJGx2bCkgKyAnID09PSB1bmRlZmluZWQpICcgKyAoJHZhbGlkKSArICcgPSB0cnVlOyBlbHNlIGlmICghQXJyYXkuaXNBcnJheShzY2hlbWEnICsgKCRsdmwpICsgJykpICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgZWxzZSB7JztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyBmb3IgKHZhciAnICsgKCRpKSArICcgPSAwOyAnICsgKCRpKSArICcgPCAnICsgKCR2U2NoZW1hKSArICcubGVuZ3RoOyAnICsgKCRpKSArICcrKykgeyAnICsgKCR2YWxpZCkgKyAnID0gJyArICgkZGF0YSkgKyAnWycgKyAoJHZTY2hlbWEpICsgJ1snICsgKCRpKSArICddXSAhPT0gdW5kZWZpbmVkICc7XG4gICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgIG91dCArPSAnICYmICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgJyArICgkdlNjaGVtYSkgKyAnWycgKyAoJGkpICsgJ10pICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICc7IGlmICghJyArICgkdmFsaWQpICsgJykgYnJlYWs7IH0gJztcbiAgICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgICBvdXQgKz0gJyAgfSAgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyAgaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICAgJztcbiAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdyZXF1aXJlZCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJyB9ICc7XG4gICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJyc7XG4gICAgICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIG91dCArPSAnaXMgYSByZXF1aXJlZCBwcm9wZXJ0eSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBoYXZlIHJlcXVpcmVkIHByb3BlcnR5IFxcXFxcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcXFxcXCcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyB9IGVsc2UgeyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKCAnO1xuICAgICAgICB2YXIgYXJyMiA9ICRyZXF1aXJlZDtcbiAgICAgICAgaWYgKGFycjIpIHtcbiAgICAgICAgICB2YXIgJHByb3BlcnR5S2V5LCAkaSA9IC0xLFxuICAgICAgICAgICAgbDIgPSBhcnIyLmxlbmd0aCAtIDE7XG4gICAgICAgICAgd2hpbGUgKCRpIDwgbDIpIHtcbiAgICAgICAgICAgICRwcm9wZXJ0eUtleSA9IGFycjJbJGkgKz0gMV07XG4gICAgICAgICAgICBpZiAoJGkpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciAkcHJvcCA9IGl0LnV0aWwuZ2V0UHJvcGVydHkoJHByb3BlcnR5S2V5KSxcbiAgICAgICAgICAgICAgJHVzZURhdGEgPSAkZGF0YSArICRwcm9wO1xuICAgICAgICAgICAgb3V0ICs9ICcgKCAoICcgKyAoJHVzZURhdGEpICsgJyA9PT0gdW5kZWZpbmVkICc7XG4gICAgICAgICAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgISBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSkpICsgJ1xcJykgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnKSAmJiAobWlzc2luZycgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKGl0Lm9wdHMuanNvblBvaW50ZXJzID8gJHByb3BlcnR5S2V5IDogJHByb3ApKSArICcpICkgJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcpIHsgICc7XG4gICAgICAgIHZhciAkcHJvcGVydHlQYXRoID0gJ21pc3NpbmcnICsgJGx2bCxcbiAgICAgICAgICAkbWlzc2luZ1Byb3BlcnR5ID0gJ1xcJyArICcgKyAkcHJvcGVydHlQYXRoICsgJyArIFxcJyc7XG4gICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICBpdC5lcnJvclBhdGggPSBpdC5vcHRzLmpzb25Qb2ludGVycyA/IGl0LnV0aWwuZ2V0UGF0aEV4cHIoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eVBhdGgsIHRydWUpIDogJGN1cnJlbnRFcnJvclBhdGggKyAnICsgJyArICRwcm9wZXJ0eVBhdGg7XG4gICAgICAgIH1cbiAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdyZXF1aXJlZCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJyB9ICc7XG4gICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJyc7XG4gICAgICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIG91dCArPSAnaXMgYSByZXF1aXJlZCBwcm9wZXJ0eSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBoYXZlIHJlcXVpcmVkIHByb3BlcnR5IFxcXFxcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcXFxcXCcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyB9IGVsc2UgeyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoJGxvb3BSZXF1aXJlZCkge1xuICAgICAgICBpZiAoISRpc0RhdGEpIHtcbiAgICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkdlNjaGVtYSkgKyAnID0gdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnOyAnO1xuICAgICAgICB9XG4gICAgICAgIHZhciAkaSA9ICdpJyArICRsdmwsXG4gICAgICAgICAgJHByb3BlcnR5UGF0aCA9ICdzY2hlbWEnICsgJGx2bCArICdbJyArICRpICsgJ10nLFxuICAgICAgICAgICRtaXNzaW5nUHJvcGVydHkgPSAnXFwnICsgJyArICRwcm9wZXJ0eVBhdGggKyAnICsgXFwnJztcbiAgICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICAgIGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eVBhdGgsIGl0Lm9wdHMuanNvblBvaW50ZXJzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCR2U2NoZW1hKSArICcgJiYgIUFycmF5LmlzQXJyYXkoJyArICgkdlNjaGVtYSkgKyAnKSkgeyAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdyZXF1aXJlZCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJyB9ICc7XG4gICAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCcnO1xuICAgICAgICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICdpcyBhIHJlcXVpcmVkIHByb3BlcnR5JztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBoYXZlIHJlcXVpcmVkIHByb3BlcnR5IFxcXFxcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcXFxcXCcnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG91dCArPSAnXFwnICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7IH0gZWxzZSBpZiAoJyArICgkdlNjaGVtYSkgKyAnICE9PSB1bmRlZmluZWQpIHsgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyBmb3IgKHZhciAnICsgKCRpKSArICcgPSAwOyAnICsgKCRpKSArICcgPCAnICsgKCR2U2NoZW1hKSArICcubGVuZ3RoOyAnICsgKCRpKSArICcrKykgeyBpZiAoJyArICgkZGF0YSkgKyAnWycgKyAoJHZTY2hlbWEpICsgJ1snICsgKCRpKSArICddXSA9PT0gdW5kZWZpbmVkICc7XG4gICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgIG91dCArPSAnIHx8ICEgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgJyArICgkdlNjaGVtYSkgKyAnWycgKyAoJGkpICsgJ10pICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcpIHsgIHZhciBlcnIgPSAgICc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdyZXF1aXJlZCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJyB9ICc7XG4gICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJyc7XG4gICAgICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIG91dCArPSAnaXMgYSByZXF1aXJlZCBwcm9wZXJ0eSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBoYXZlIHJlcXVpcmVkIHByb3BlcnR5IFxcXFxcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcXFxcXCcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgfSB9ICc7XG4gICAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgICAgb3V0ICs9ICcgIH0gICc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcnIzID0gJHJlcXVpcmVkO1xuICAgICAgICBpZiAoYXJyMykge1xuICAgICAgICAgIHZhciAkcHJvcGVydHlLZXksIGkzID0gLTEsXG4gICAgICAgICAgICBsMyA9IGFycjMubGVuZ3RoIC0gMTtcbiAgICAgICAgICB3aGlsZSAoaTMgPCBsMykge1xuICAgICAgICAgICAgJHByb3BlcnR5S2V5ID0gYXJyM1tpMyArPSAxXTtcbiAgICAgICAgICAgIHZhciAkcHJvcCA9IGl0LnV0aWwuZ2V0UHJvcGVydHkoJHByb3BlcnR5S2V5KSxcbiAgICAgICAgICAgICAgJG1pc3NpbmdQcm9wZXJ0eSA9IGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSksXG4gICAgICAgICAgICAgICR1c2VEYXRhID0gJGRhdGEgKyAkcHJvcDtcbiAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgaXQuZXJyb3JQYXRoID0gaXQudXRpbC5nZXRQYXRoKCRjdXJyZW50RXJyb3JQYXRoLCAkcHJvcGVydHlLZXksIGl0Lm9wdHMuanNvblBvaW50ZXJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnIGlmICggJyArICgkdXNlRGF0YSkgKyAnID09PSB1bmRlZmluZWQgJztcbiAgICAgICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB8fCAhIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCgnICsgKCRkYXRhKSArICcsIFxcJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5S2V5KSkgKyAnXFwnKSAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICcpIHsgIHZhciBlcnIgPSAgICc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ3JlcXVpcmVkJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBtaXNzaW5nUHJvcGVydHk6IFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFwnIH0gJztcbiAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCcnO1xuICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnaXMgYSByZXF1aXJlZCBwcm9wZXJ0eSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnc2hvdWxkIGhhdmUgcmVxdWlyZWQgcHJvcGVydHkgXFxcXFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFxcXFxcJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dCArPSAnXFwnICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7IH0gJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaXQuZXJyb3JQYXRoID0gJGN1cnJlbnRFcnJvclBhdGg7XG4gIH0gZWxzZSBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGlmICh0cnVlKSB7JztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV91bmlxdWVJdGVtcyhpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmw7XG4gIHZhciAkaXNEYXRhID0gaXQub3B0cy4kZGF0YSAmJiAkc2NoZW1hICYmICRzY2hlbWEuJGRhdGEsXG4gICAgJHNjaGVtYVZhbHVlO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciBzY2hlbWEnICsgKCRsdmwpICsgJyA9ICcgKyAoaXQudXRpbC5nZXREYXRhKCRzY2hlbWEuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFycikpICsgJzsgJztcbiAgICAkc2NoZW1hVmFsdWUgPSAnc2NoZW1hJyArICRsdmw7XG4gIH0gZWxzZSB7XG4gICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYTtcbiAgfVxuICBpZiAoKCRzY2hlbWEgfHwgJGlzRGF0YSkgJiYgaXQub3B0cy51bmlxdWVJdGVtcyAhPT0gZmFsc2UpIHtcbiAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJHZhbGlkKSArICc7IGlmICgnICsgKCRzY2hlbWFWYWx1ZSkgKyAnID09PSBmYWxzZSB8fCAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnID09PSB1bmRlZmluZWQpICcgKyAoJHZhbGlkKSArICcgPSB0cnVlOyBlbHNlIGlmICh0eXBlb2YgJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPSBcXCdib29sZWFuXFwnKSAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7IGVsc2UgeyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB2YXIgaSA9ICcgKyAoJGRhdGEpICsgJy5sZW5ndGggLCAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZSAsIGo7IGlmIChpID4gMSkgeyAnO1xuICAgIHZhciAkaXRlbVR5cGUgPSBpdC5zY2hlbWEuaXRlbXMgJiYgaXQuc2NoZW1hLml0ZW1zLnR5cGUsXG4gICAgICAkdHlwZUlzQXJyYXkgPSBBcnJheS5pc0FycmF5KCRpdGVtVHlwZSk7XG4gICAgaWYgKCEkaXRlbVR5cGUgfHwgJGl0ZW1UeXBlID09ICdvYmplY3QnIHx8ICRpdGVtVHlwZSA9PSAnYXJyYXknIHx8ICgkdHlwZUlzQXJyYXkgJiYgKCRpdGVtVHlwZS5pbmRleE9mKCdvYmplY3QnKSA+PSAwIHx8ICRpdGVtVHlwZS5pbmRleE9mKCdhcnJheScpID49IDApKSkge1xuICAgICAgb3V0ICs9ICcgb3V0ZXI6IGZvciAoO2ktLTspIHsgZm9yIChqID0gaTsgai0tOykgeyBpZiAoZXF1YWwoJyArICgkZGF0YSkgKyAnW2ldLCAnICsgKCRkYXRhKSArICdbal0pKSB7ICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgYnJlYWsgb3V0ZXI7IH0gfSB9ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhciBpdGVtSW5kaWNlcyA9IHt9LCBpdGVtOyBmb3IgKDtpLS07KSB7IHZhciBpdGVtID0gJyArICgkZGF0YSkgKyAnW2ldOyAnO1xuICAgICAgdmFyICRtZXRob2QgPSAnY2hlY2tEYXRhVHlwZScgKyAoJHR5cGVJc0FycmF5ID8gJ3MnIDogJycpO1xuICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoaXQudXRpbFskbWV0aG9kXSgkaXRlbVR5cGUsICdpdGVtJywgaXQub3B0cy5zdHJpY3ROdW1iZXJzLCB0cnVlKSkgKyAnKSBjb250aW51ZTsgJztcbiAgICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKHR5cGVvZiBpdGVtID09IFxcJ3N0cmluZ1xcJykgaXRlbSA9IFxcJ1wiXFwnICsgaXRlbTsgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIGlmICh0eXBlb2YgaXRlbUluZGljZXNbaXRlbV0gPT0gXFwnbnVtYmVyXFwnKSB7ICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgaiA9IGl0ZW1JbmRpY2VzW2l0ZW1dOyBicmVhazsgfSBpdGVtSW5kaWNlc1tpdGVtXSA9IGk7IH0gJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICBvdXQgKz0gJyAgfSAgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICAgJztcbiAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgndW5pcXVlSXRlbXMnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGk6IGksIGo6IGogfSAnO1xuICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIE5PVCBoYXZlIGR1cGxpY2F0ZSBpdGVtcyAoaXRlbXMgIyMgXFwnICsgaiArIFxcJyBhbmQgXFwnICsgaSArIFxcJyBhcmUgaWRlbnRpY2FsKVxcJyAnO1xuICAgICAgfVxuICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogICc7XG4gICAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgICAgb3V0ICs9ICd2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgICAgICAgICAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcge30gJztcbiAgICB9XG4gICAgdmFyIF9fZXJyID0gb3V0O1xuICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgb3V0ICs9ICcgaWYgKHRydWUpIHsgJztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfdmFsaWRhdGUoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcnO1xuICB2YXIgJGFzeW5jID0gaXQuc2NoZW1hLiRhc3luYyA9PT0gdHJ1ZSxcbiAgICAkcmVmS2V5d29yZHMgPSBpdC51dGlsLnNjaGVtYUhhc1J1bGVzRXhjZXB0KGl0LnNjaGVtYSwgaXQuUlVMRVMuYWxsLCAnJHJlZicpLFxuICAgICRpZCA9IGl0LnNlbGYuX2dldElkKGl0LnNjaGVtYSk7XG4gIGlmIChpdC5vcHRzLnN0cmljdEtleXdvcmRzKSB7XG4gICAgdmFyICR1bmtub3duS3dkID0gaXQudXRpbC5zY2hlbWFVbmtub3duUnVsZXMoaXQuc2NoZW1hLCBpdC5SVUxFUy5rZXl3b3Jkcyk7XG4gICAgaWYgKCR1bmtub3duS3dkKSB7XG4gICAgICB2YXIgJGtleXdvcmRzTXNnID0gJ3Vua25vd24ga2V5d29yZDogJyArICR1bmtub3duS3dkO1xuICAgICAgaWYgKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPT09ICdsb2cnKSBpdC5sb2dnZXIud2Fybigka2V5d29yZHNNc2cpO1xuICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJGtleXdvcmRzTXNnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGl0LmlzVG9wKSB7XG4gICAgb3V0ICs9ICcgdmFyIHZhbGlkYXRlID0gJztcbiAgICBpZiAoJGFzeW5jKSB7XG4gICAgICBpdC5hc3luYyA9IHRydWU7XG4gICAgICBvdXQgKz0gJ2FzeW5jICc7XG4gICAgfVxuICAgIG91dCArPSAnZnVuY3Rpb24oZGF0YSwgZGF0YVBhdGgsIHBhcmVudERhdGEsIHBhcmVudERhdGFQcm9wZXJ0eSwgcm9vdERhdGEpIHsgXFwndXNlIHN0cmljdFxcJzsgJztcbiAgICBpZiAoJGlkICYmIChpdC5vcHRzLnNvdXJjZUNvZGUgfHwgaXQub3B0cy5wcm9jZXNzQ29kZSkpIHtcbiAgICAgIG91dCArPSAnICcgKyAoJy9cXCojIHNvdXJjZVVSTD0nICsgJGlkICsgJyAqLycpICsgJyAnO1xuICAgIH1cbiAgfVxuICBpZiAodHlwZW9mIGl0LnNjaGVtYSA9PSAnYm9vbGVhbicgfHwgISgkcmVmS2V5d29yZHMgfHwgaXQuc2NoZW1hLiRyZWYpKSB7XG4gICAgdmFyICRrZXl3b3JkID0gJ2ZhbHNlIHNjaGVtYSc7XG4gICAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gICAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICAgIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gICAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gICAgdmFyICRlcnJvcktleXdvcmQ7XG4gICAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmw7XG4gICAgaWYgKGl0LnNjaGVtYSA9PT0gZmFsc2UpIHtcbiAgICAgIGlmIChpdC5pc1RvcCkge1xuICAgICAgICAkYnJlYWtPbkVycm9yID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhciAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7ICc7XG4gICAgICB9XG4gICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ2ZhbHNlIHNjaGVtYScpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHt9ICc7XG4gICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnYm9vbGVhbiBzY2hlbWEgaXMgZmFsc2VcXCcgJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IGZhbHNlICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICB9XG4gICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGl0LmlzVG9wKSB7XG4gICAgICAgIGlmICgkYXN5bmMpIHtcbiAgICAgICAgICBvdXQgKz0gJyByZXR1cm4gZGF0YTsgJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBudWxsOyByZXR1cm4gdHJ1ZTsgJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJHZhbGlkKSArICcgPSB0cnVlOyAnO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXQuaXNUb3ApIHtcbiAgICAgIG91dCArPSAnIH07IHJldHVybiB2YWxpZGF0ZTsgJztcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuICBpZiAoaXQuaXNUb3ApIHtcbiAgICB2YXIgJHRvcCA9IGl0LmlzVG9wLFxuICAgICAgJGx2bCA9IGl0LmxldmVsID0gMCxcbiAgICAgICRkYXRhTHZsID0gaXQuZGF0YUxldmVsID0gMCxcbiAgICAgICRkYXRhID0gJ2RhdGEnO1xuICAgIGl0LnJvb3RJZCA9IGl0LnJlc29sdmUuZnVsbFBhdGgoaXQuc2VsZi5fZ2V0SWQoaXQucm9vdC5zY2hlbWEpKTtcbiAgICBpdC5iYXNlSWQgPSBpdC5iYXNlSWQgfHwgaXQucm9vdElkO1xuICAgIGRlbGV0ZSBpdC5pc1RvcDtcbiAgICBpdC5kYXRhUGF0aEFyciA9IFtcIlwiXTtcbiAgICBpZiAoaXQuc2NoZW1hLmRlZmF1bHQgIT09IHVuZGVmaW5lZCAmJiBpdC5vcHRzLnVzZURlZmF1bHRzICYmIGl0Lm9wdHMuc3RyaWN0RGVmYXVsdHMpIHtcbiAgICAgIHZhciAkZGVmYXVsdE1zZyA9ICdkZWZhdWx0IGlzIGlnbm9yZWQgaW4gdGhlIHNjaGVtYSByb290JztcbiAgICAgIGlmIChpdC5vcHRzLnN0cmljdERlZmF1bHRzID09PSAnbG9nJykgaXQubG9nZ2VyLndhcm4oJGRlZmF1bHRNc2cpO1xuICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJGRlZmF1bHRNc2cpO1xuICAgIH1cbiAgICBvdXQgKz0gJyB2YXIgdkVycm9ycyA9IG51bGw7ICc7XG4gICAgb3V0ICs9ICcgdmFyIGVycm9ycyA9IDA7ICAgICAnO1xuICAgIG91dCArPSAnIGlmIChyb290RGF0YSA9PT0gdW5kZWZpbmVkKSByb290RGF0YSA9IGRhdGE7ICc7XG4gIH0gZWxzZSB7XG4gICAgdmFyICRsdmwgPSBpdC5sZXZlbCxcbiAgICAgICRkYXRhTHZsID0gaXQuZGF0YUxldmVsLFxuICAgICAgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICAgIGlmICgkaWQpIGl0LmJhc2VJZCA9IGl0LnJlc29sdmUudXJsKGl0LmJhc2VJZCwgJGlkKTtcbiAgICBpZiAoJGFzeW5jICYmICFpdC5hc3luYykgdGhyb3cgbmV3IEVycm9yKCdhc3luYyBzY2hlbWEgaW4gc3luYyBzY2hlbWEnKTtcbiAgICBvdXQgKz0gJyB2YXIgZXJyc18nICsgKCRsdmwpICsgJyA9IGVycm9yczsnO1xuICB9XG4gIHZhciAkdmFsaWQgPSAndmFsaWQnICsgJGx2bCxcbiAgICAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzLFxuICAgICRjbG9zaW5nQnJhY2VzMSA9ICcnLFxuICAgICRjbG9zaW5nQnJhY2VzMiA9ICcnO1xuICB2YXIgJGVycm9yS2V5d29yZDtcbiAgdmFyICR0eXBlU2NoZW1hID0gaXQuc2NoZW1hLnR5cGUsXG4gICAgJHR5cGVJc0FycmF5ID0gQXJyYXkuaXNBcnJheSgkdHlwZVNjaGVtYSk7XG4gIGlmICgkdHlwZVNjaGVtYSAmJiBpdC5vcHRzLm51bGxhYmxlICYmIGl0LnNjaGVtYS5udWxsYWJsZSA9PT0gdHJ1ZSkge1xuICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgIGlmICgkdHlwZVNjaGVtYS5pbmRleE9mKCdudWxsJykgPT0gLTEpICR0eXBlU2NoZW1hID0gJHR5cGVTY2hlbWEuY29uY2F0KCdudWxsJyk7XG4gICAgfSBlbHNlIGlmICgkdHlwZVNjaGVtYSAhPSAnbnVsbCcpIHtcbiAgICAgICR0eXBlU2NoZW1hID0gWyR0eXBlU2NoZW1hLCAnbnVsbCddO1xuICAgICAgJHR5cGVJc0FycmF5ID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgaWYgKCR0eXBlSXNBcnJheSAmJiAkdHlwZVNjaGVtYS5sZW5ndGggPT0gMSkge1xuICAgICR0eXBlU2NoZW1hID0gJHR5cGVTY2hlbWFbMF07XG4gICAgJHR5cGVJc0FycmF5ID0gZmFsc2U7XG4gIH1cbiAgaWYgKGl0LnNjaGVtYS4kcmVmICYmICRyZWZLZXl3b3Jkcykge1xuICAgIGlmIChpdC5vcHRzLmV4dGVuZFJlZnMgPT0gJ2ZhaWwnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJyRyZWY6IHZhbGlkYXRpb24ga2V5d29yZHMgdXNlZCBpbiBzY2hlbWEgYXQgcGF0aCBcIicgKyBpdC5lcnJTY2hlbWFQYXRoICsgJ1wiIChzZWUgb3B0aW9uIGV4dGVuZFJlZnMpJyk7XG4gICAgfSBlbHNlIGlmIChpdC5vcHRzLmV4dGVuZFJlZnMgIT09IHRydWUpIHtcbiAgICAgICRyZWZLZXl3b3JkcyA9IGZhbHNlO1xuICAgICAgaXQubG9nZ2VyLndhcm4oJyRyZWY6IGtleXdvcmRzIGlnbm9yZWQgaW4gc2NoZW1hIGF0IHBhdGggXCInICsgaXQuZXJyU2NoZW1hUGF0aCArICdcIicpO1xuICAgIH1cbiAgfVxuICBpZiAoaXQuc2NoZW1hLiRjb21tZW50ICYmIGl0Lm9wdHMuJGNvbW1lbnQpIHtcbiAgICBvdXQgKz0gJyAnICsgKGl0LlJVTEVTLmFsbC4kY29tbWVudC5jb2RlKGl0LCAnJGNvbW1lbnQnKSk7XG4gIH1cbiAgaWYgKCR0eXBlU2NoZW1hKSB7XG4gICAgaWYgKGl0Lm9wdHMuY29lcmNlVHlwZXMpIHtcbiAgICAgIHZhciAkY29lcmNlVG9UeXBlcyA9IGl0LnV0aWwuY29lcmNlVG9UeXBlcyhpdC5vcHRzLmNvZXJjZVR5cGVzLCAkdHlwZVNjaGVtYSk7XG4gICAgfVxuICAgIHZhciAkcnVsZXNHcm91cCA9IGl0LlJVTEVTLnR5cGVzWyR0eXBlU2NoZW1hXTtcbiAgICBpZiAoJGNvZXJjZVRvVHlwZXMgfHwgJHR5cGVJc0FycmF5IHx8ICRydWxlc0dyb3VwID09PSB0cnVlIHx8ICgkcnVsZXNHcm91cCAmJiAhJHNob3VsZFVzZUdyb3VwKCRydWxlc0dyb3VwKSkpIHtcbiAgICAgIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyAnLnR5cGUnLFxuICAgICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnL3R5cGUnO1xuICAgICAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArICcudHlwZScsXG4gICAgICAgICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvdHlwZScsXG4gICAgICAgICRtZXRob2QgPSAkdHlwZUlzQXJyYXkgPyAnY2hlY2tEYXRhVHlwZXMnIDogJ2NoZWNrRGF0YVR5cGUnO1xuICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoaXQudXRpbFskbWV0aG9kXSgkdHlwZVNjaGVtYSwgJGRhdGEsIGl0Lm9wdHMuc3RyaWN0TnVtYmVycywgdHJ1ZSkpICsgJykgeyAnO1xuICAgICAgaWYgKCRjb2VyY2VUb1R5cGVzKSB7XG4gICAgICAgIHZhciAkZGF0YVR5cGUgPSAnZGF0YVR5cGUnICsgJGx2bCxcbiAgICAgICAgICAkY29lcmNlZCA9ICdjb2VyY2VkJyArICRsdmw7XG4gICAgICAgIG91dCArPSAnIHZhciAnICsgKCRkYXRhVHlwZSkgKyAnID0gdHlwZW9mICcgKyAoJGRhdGEpICsgJzsgdmFyICcgKyAoJGNvZXJjZWQpICsgJyA9IHVuZGVmaW5lZDsgJztcbiAgICAgICAgaWYgKGl0Lm9wdHMuY29lcmNlVHlwZXMgPT0gJ2FycmF5Jykge1xuICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCRkYXRhVHlwZSkgKyAnID09IFxcJ29iamVjdFxcJyAmJiBBcnJheS5pc0FycmF5KCcgKyAoJGRhdGEpICsgJykgJiYgJyArICgkZGF0YSkgKyAnLmxlbmd0aCA9PSAxKSB7ICcgKyAoJGRhdGEpICsgJyA9ICcgKyAoJGRhdGEpICsgJ1swXTsgJyArICgkZGF0YVR5cGUpICsgJyA9IHR5cGVvZiAnICsgKCRkYXRhKSArICc7IGlmICgnICsgKGl0LnV0aWwuY2hlY2tEYXRhVHlwZShpdC5zY2hlbWEudHlwZSwgJGRhdGEsIGl0Lm9wdHMuc3RyaWN0TnVtYmVycykpICsgJykgJyArICgkY29lcmNlZCkgKyAnID0gJyArICgkZGF0YSkgKyAnOyB9ICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJGNvZXJjZWQpICsgJyAhPT0gdW5kZWZpbmVkKSA7ICc7XG4gICAgICAgIHZhciBhcnIxID0gJGNvZXJjZVRvVHlwZXM7XG4gICAgICAgIGlmIChhcnIxKSB7XG4gICAgICAgICAgdmFyICR0eXBlLCAkaSA9IC0xLFxuICAgICAgICAgICAgbDEgPSBhcnIxLmxlbmd0aCAtIDE7XG4gICAgICAgICAgd2hpbGUgKCRpIDwgbDEpIHtcbiAgICAgICAgICAgICR0eXBlID0gYXJyMVskaSArPSAxXTtcbiAgICAgICAgICAgIGlmICgkdHlwZSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyBlbHNlIGlmICgnICsgKCRkYXRhVHlwZSkgKyAnID09IFxcJ251bWJlclxcJyB8fCAnICsgKCRkYXRhVHlwZSkgKyAnID09IFxcJ2Jvb2xlYW5cXCcpICcgKyAoJGNvZXJjZWQpICsgJyA9IFxcJ1xcJyArICcgKyAoJGRhdGEpICsgJzsgZWxzZSBpZiAoJyArICgkZGF0YSkgKyAnID09PSBudWxsKSAnICsgKCRjb2VyY2VkKSArICcgPSBcXCdcXCc7ICc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCR0eXBlID09ICdudW1iZXInIHx8ICR0eXBlID09ICdpbnRlZ2VyJykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyBlbHNlIGlmICgnICsgKCRkYXRhVHlwZSkgKyAnID09IFxcJ2Jvb2xlYW5cXCcgfHwgJyArICgkZGF0YSkgKyAnID09PSBudWxsIHx8ICgnICsgKCRkYXRhVHlwZSkgKyAnID09IFxcJ3N0cmluZ1xcJyAmJiAnICsgKCRkYXRhKSArICcgJiYgJyArICgkZGF0YSkgKyAnID09ICsnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICAgICAgaWYgKCR0eXBlID09ICdpbnRlZ2VyJykge1xuICAgICAgICAgICAgICAgIG91dCArPSAnICYmICEoJyArICgkZGF0YSkgKyAnICUgMSknO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG91dCArPSAnKSkgJyArICgkY29lcmNlZCkgKyAnID0gKycgKyAoJGRhdGEpICsgJzsgJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJHR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIGVsc2UgaWYgKCcgKyAoJGRhdGEpICsgJyA9PT0gXFwnZmFsc2VcXCcgfHwgJyArICgkZGF0YSkgKyAnID09PSAwIHx8ICcgKyAoJGRhdGEpICsgJyA9PT0gbnVsbCkgJyArICgkY29lcmNlZCkgKyAnID0gZmFsc2U7IGVsc2UgaWYgKCcgKyAoJGRhdGEpICsgJyA9PT0gXFwndHJ1ZVxcJyB8fCAnICsgKCRkYXRhKSArICcgPT09IDEpICcgKyAoJGNvZXJjZWQpICsgJyA9IHRydWU7ICc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCR0eXBlID09ICdudWxsJykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyBlbHNlIGlmICgnICsgKCRkYXRhKSArICcgPT09IFxcJ1xcJyB8fCAnICsgKCRkYXRhKSArICcgPT09IDAgfHwgJyArICgkZGF0YSkgKyAnID09PSBmYWxzZSkgJyArICgkY29lcmNlZCkgKyAnID0gbnVsbDsgJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXQub3B0cy5jb2VyY2VUeXBlcyA9PSAnYXJyYXknICYmICR0eXBlID09ICdhcnJheScpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgZWxzZSBpZiAoJyArICgkZGF0YVR5cGUpICsgJyA9PSBcXCdzdHJpbmdcXCcgfHwgJyArICgkZGF0YVR5cGUpICsgJyA9PSBcXCdudW1iZXJcXCcgfHwgJyArICgkZGF0YVR5cGUpICsgJyA9PSBcXCdib29sZWFuXFwnIHx8ICcgKyAoJGRhdGEpICsgJyA9PSBudWxsKSAnICsgKCRjb2VyY2VkKSArICcgPSBbJyArICgkZGF0YSkgKyAnXTsgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgZWxzZSB7ICAgJztcbiAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ3R5cGUnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IHR5cGU6IFxcJyc7XG4gICAgICAgICAgaWYgKCR0eXBlSXNBcnJheSkge1xuICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hLmpvaW4oXCIsXCIpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICdcXCcgfSAnO1xuICAgICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgYmUgJztcbiAgICAgICAgICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hLmpvaW4oXCIsXCIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJ1xcJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIH0gaWYgKCcgKyAoJGNvZXJjZWQpICsgJyAhPT0gdW5kZWZpbmVkKSB7ICAnO1xuICAgICAgICB2YXIgJHBhcmVudERhdGEgPSAkZGF0YUx2bCA/ICdkYXRhJyArICgoJGRhdGFMdmwgLSAxKSB8fCAnJykgOiAncGFyZW50RGF0YScsXG4gICAgICAgICAgJHBhcmVudERhdGFQcm9wZXJ0eSA9ICRkYXRhTHZsID8gaXQuZGF0YVBhdGhBcnJbJGRhdGFMdmxdIDogJ3BhcmVudERhdGFQcm9wZXJ0eSc7XG4gICAgICAgIG91dCArPSAnICcgKyAoJGRhdGEpICsgJyA9ICcgKyAoJGNvZXJjZWQpICsgJzsgJztcbiAgICAgICAgaWYgKCEkZGF0YUx2bCkge1xuICAgICAgICAgIG91dCArPSAnaWYgKCcgKyAoJHBhcmVudERhdGEpICsgJyAhPT0gdW5kZWZpbmVkKSc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgJyArICgkcGFyZW50RGF0YSkgKyAnWycgKyAoJHBhcmVudERhdGFQcm9wZXJ0eSkgKyAnXSA9ICcgKyAoJGNvZXJjZWQpICsgJzsgfSAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ3R5cGUnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IHR5cGU6IFxcJyc7XG4gICAgICAgICAgaWYgKCR0eXBlSXNBcnJheSkge1xuICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hLmpvaW4oXCIsXCIpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICdcXCcgfSAnO1xuICAgICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgYmUgJztcbiAgICAgICAgICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hLmpvaW4oXCIsXCIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJ1xcJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfVxuICB9XG4gIGlmIChpdC5zY2hlbWEuJHJlZiAmJiAhJHJlZktleXdvcmRzKSB7XG4gICAgb3V0ICs9ICcgJyArIChpdC5SVUxFUy5hbGwuJHJlZi5jb2RlKGl0LCAnJHJlZicpKSArICcgJztcbiAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgb3V0ICs9ICcgfSBpZiAoZXJyb3JzID09PSAnO1xuICAgICAgaWYgKCR0b3ApIHtcbiAgICAgICAgb3V0ICs9ICcwJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnZXJyc18nICsgKCRsdmwpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcpIHsgJztcbiAgICAgICRjbG9zaW5nQnJhY2VzMiArPSAnfSc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBhcnIyID0gaXQuUlVMRVM7XG4gICAgaWYgKGFycjIpIHtcbiAgICAgIHZhciAkcnVsZXNHcm91cCwgaTIgPSAtMSxcbiAgICAgICAgbDIgPSBhcnIyLmxlbmd0aCAtIDE7XG4gICAgICB3aGlsZSAoaTIgPCBsMikge1xuICAgICAgICAkcnVsZXNHcm91cCA9IGFycjJbaTIgKz0gMV07XG4gICAgICAgIGlmICgkc2hvdWxkVXNlR3JvdXAoJHJ1bGVzR3JvdXApKSB7XG4gICAgICAgICAgaWYgKCRydWxlc0dyb3VwLnR5cGUpIHtcbiAgICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKGl0LnV0aWwuY2hlY2tEYXRhVHlwZSgkcnVsZXNHcm91cC50eXBlLCAkZGF0YSwgaXQub3B0cy5zdHJpY3ROdW1iZXJzKSkgKyAnKSB7ICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpdC5vcHRzLnVzZURlZmF1bHRzKSB7XG4gICAgICAgICAgICBpZiAoJHJ1bGVzR3JvdXAudHlwZSA9PSAnb2JqZWN0JyAmJiBpdC5zY2hlbWEucHJvcGVydGllcykge1xuICAgICAgICAgICAgICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYS5wcm9wZXJ0aWVzLFxuICAgICAgICAgICAgICAgICRzY2hlbWFLZXlzID0gT2JqZWN0LmtleXMoJHNjaGVtYSk7XG4gICAgICAgICAgICAgIHZhciBhcnIzID0gJHNjaGVtYUtleXM7XG4gICAgICAgICAgICAgIGlmIChhcnIzKSB7XG4gICAgICAgICAgICAgICAgdmFyICRwcm9wZXJ0eUtleSwgaTMgPSAtMSxcbiAgICAgICAgICAgICAgICAgIGwzID0gYXJyMy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgIHdoaWxlIChpMyA8IGwzKSB7XG4gICAgICAgICAgICAgICAgICAkcHJvcGVydHlLZXkgPSBhcnIzW2kzICs9IDFdO1xuICAgICAgICAgICAgICAgICAgdmFyICRzY2ggPSAkc2NoZW1hWyRwcm9wZXJ0eUtleV07XG4gICAgICAgICAgICAgICAgICBpZiAoJHNjaC5kZWZhdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgkcHJvcGVydHlLZXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXQuY29tcG9zaXRlUnVsZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLnN0cmljdERlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgJGRlZmF1bHRNc2cgPSAnZGVmYXVsdCBpcyBpZ25vcmVkIGZvcjogJyArICRwYXNzRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLnN0cmljdERlZmF1bHRzID09PSAnbG9nJykgaXQubG9nZ2VyLndhcm4oJGRlZmF1bHRNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJGRlZmF1bHRNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJyBpZiAoJyArICgkcGFzc0RhdGEpICsgJyA9PT0gdW5kZWZpbmVkICc7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudXNlRGVmYXVsdHMgPT0gJ2VtcHR5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgJyArICgkcGFzc0RhdGEpICsgJyA9PT0gbnVsbCB8fCAnICsgKCRwYXNzRGF0YSkgKyAnID09PSBcXCdcXCcgJztcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgKSAnICsgKCRwYXNzRGF0YSkgKyAnID0gJztcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy51c2VEZWZhdWx0cyA9PSAnc2hhcmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51c2VEZWZhdWx0KCRzY2guZGVmYXVsdCkpICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJyAnICsgKEpTT04uc3RyaW5naWZ5KCRzY2guZGVmYXVsdCkpICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJzsgJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICgkcnVsZXNHcm91cC50eXBlID09ICdhcnJheScgJiYgQXJyYXkuaXNBcnJheShpdC5zY2hlbWEuaXRlbXMpKSB7XG4gICAgICAgICAgICAgIHZhciBhcnI0ID0gaXQuc2NoZW1hLml0ZW1zO1xuICAgICAgICAgICAgICBpZiAoYXJyNCkge1xuICAgICAgICAgICAgICAgIHZhciAkc2NoLCAkaSA9IC0xLFxuICAgICAgICAgICAgICAgICAgbDQgPSBhcnI0Lmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgd2hpbGUgKCRpIDwgbDQpIHtcbiAgICAgICAgICAgICAgICAgICRzY2ggPSBhcnI0WyRpICs9IDFdO1xuICAgICAgICAgICAgICAgICAgaWYgKCRzY2guZGVmYXVsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkcGFzc0RhdGEgPSAkZGF0YSArICdbJyArICRpICsgJ10nO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXQuY29tcG9zaXRlUnVsZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLnN0cmljdERlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgJGRlZmF1bHRNc2cgPSAnZGVmYXVsdCBpcyBpZ25vcmVkIGZvcjogJyArICRwYXNzRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLnN0cmljdERlZmF1bHRzID09PSAnbG9nJykgaXQubG9nZ2VyLndhcm4oJGRlZmF1bHRNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJGRlZmF1bHRNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJyBpZiAoJyArICgkcGFzc0RhdGEpICsgJyA9PT0gdW5kZWZpbmVkICc7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudXNlRGVmYXVsdHMgPT0gJ2VtcHR5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgJyArICgkcGFzc0RhdGEpICsgJyA9PT0gbnVsbCB8fCAnICsgKCRwYXNzRGF0YSkgKyAnID09PSBcXCdcXCcgJztcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgKSAnICsgKCRwYXNzRGF0YSkgKyAnID0gJztcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy51c2VEZWZhdWx0cyA9PSAnc2hhcmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51c2VEZWZhdWx0KCRzY2guZGVmYXVsdCkpICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJyAnICsgKEpTT04uc3RyaW5naWZ5KCRzY2guZGVmYXVsdCkpICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJzsgJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgYXJyNSA9ICRydWxlc0dyb3VwLnJ1bGVzO1xuICAgICAgICAgIGlmIChhcnI1KSB7XG4gICAgICAgICAgICB2YXIgJHJ1bGUsIGk1ID0gLTEsXG4gICAgICAgICAgICAgIGw1ID0gYXJyNS5sZW5ndGggLSAxO1xuICAgICAgICAgICAgd2hpbGUgKGk1IDwgbDUpIHtcbiAgICAgICAgICAgICAgJHJ1bGUgPSBhcnI1W2k1ICs9IDFdO1xuICAgICAgICAgICAgICBpZiAoJHNob3VsZFVzZVJ1bGUoJHJ1bGUpKSB7XG4gICAgICAgICAgICAgICAgdmFyICRjb2RlID0gJHJ1bGUuY29kZShpdCwgJHJ1bGUua2V5d29yZCwgJHJ1bGVzR3JvdXAudHlwZSk7XG4gICAgICAgICAgICAgICAgaWYgKCRjb2RlKSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJyAnICsgKCRjb2RlKSArICcgJztcbiAgICAgICAgICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICRjbG9zaW5nQnJhY2VzMSArPSAnfSc7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAnICsgKCRjbG9zaW5nQnJhY2VzMSkgKyAnICc7XG4gICAgICAgICAgICAkY2xvc2luZ0JyYWNlczEgPSAnJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCRydWxlc0dyb3VwLnR5cGUpIHtcbiAgICAgICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgICAgICAgIGlmICgkdHlwZVNjaGVtYSAmJiAkdHlwZVNjaGVtYSA9PT0gJHJ1bGVzR3JvdXAudHlwZSAmJiAhJGNvZXJjZVRvVHlwZXMpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gICAgICAgICAgICAgIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyAnLnR5cGUnLFxuICAgICAgICAgICAgICAgICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvdHlwZSc7XG4gICAgICAgICAgICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAgICAgICAgICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgICAgICAgICAgIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgICAgICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgkZXJyb3JLZXl3b3JkIHx8ICd0eXBlJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyB0eXBlOiBcXCcnO1xuICAgICAgICAgICAgICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYS5qb2luKFwiLFwiKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dCArPSAnXFwnIH0gJztcbiAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGJlICc7XG4gICAgICAgICAgICAgICAgICBpZiAoJHR5cGVJc0FycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYS5qb2luKFwiLFwiKSk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJycgKyAoJHR5cGVTY2hlbWEpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBpZiAoZXJyb3JzID09PSAnO1xuICAgICAgICAgICAgaWYgKCR0b3ApIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcwJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG91dCArPSAnZXJyc18nICsgKCRsdmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICcpIHsgJztcbiAgICAgICAgICAgICRjbG9zaW5nQnJhY2VzMiArPSAnfSc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgJyArICgkY2xvc2luZ0JyYWNlczIpICsgJyAnO1xuICB9XG4gIGlmICgkdG9wKSB7XG4gICAgaWYgKCRhc3luYykge1xuICAgICAgb3V0ICs9ICcgaWYgKGVycm9ycyA9PT0gMCkgcmV0dXJuIGRhdGE7ICAgICAgICAgICAnO1xuICAgICAgb3V0ICs9ICcgZWxzZSB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKHZFcnJvcnMpOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSB2RXJyb3JzOyAnO1xuICAgICAgb3V0ICs9ICcgcmV0dXJuIGVycm9ycyA9PT0gMDsgICAgICAgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfTsgcmV0dXJuIHZhbGlkYXRlOyc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyICcgKyAoJHZhbGlkKSArICcgPSBlcnJvcnMgPT09IGVycnNfJyArICgkbHZsKSArICc7JztcbiAgfVxuXG4gIGZ1bmN0aW9uICRzaG91bGRVc2VHcm91cCgkcnVsZXNHcm91cCkge1xuICAgIHZhciBydWxlcyA9ICRydWxlc0dyb3VwLnJ1bGVzO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcnVsZXMubGVuZ3RoOyBpKyspXG4gICAgICBpZiAoJHNob3VsZFVzZVJ1bGUocnVsZXNbaV0pKSByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uICRzaG91bGRVc2VSdWxlKCRydWxlKSB7XG4gICAgcmV0dXJuIGl0LnNjaGVtYVskcnVsZS5rZXl3b3JkXSAhPT0gdW5kZWZpbmVkIHx8ICgkcnVsZS5pbXBsZW1lbnRzICYmICRydWxlSW1wbGVtZW50c1NvbWVLZXl3b3JkKCRydWxlKSk7XG4gIH1cblxuICBmdW5jdGlvbiAkcnVsZUltcGxlbWVudHNTb21lS2V5d29yZCgkcnVsZSkge1xuICAgIHZhciBpbXBsID0gJHJ1bGUuaW1wbGVtZW50cztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGltcGwubGVuZ3RoOyBpKyspXG4gICAgICBpZiAoaXQuc2NoZW1hW2ltcGxbaV1dICE9PSB1bmRlZmluZWQpIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBJREVOVElGSUVSID0gL15bYS16XyRdW2EtejAtOV8kLV0qJC9pO1xudmFyIGN1c3RvbVJ1bGVDb2RlID0gcmVxdWlyZSgnLi9kb3Rqcy9jdXN0b20nKTtcbnZhciBkZWZpbml0aW9uU2NoZW1hID0gcmVxdWlyZSgnLi9kZWZpbml0aW9uX3NjaGVtYScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYWRkOiBhZGRLZXl3b3JkLFxuICBnZXQ6IGdldEtleXdvcmQsXG4gIHJlbW92ZTogcmVtb3ZlS2V5d29yZCxcbiAgdmFsaWRhdGU6IHZhbGlkYXRlS2V5d29yZFxufTtcblxuXG4vKipcbiAqIERlZmluZSBjdXN0b20ga2V5d29yZFxuICogQHRoaXMgIEFqdlxuICogQHBhcmFtIHtTdHJpbmd9IGtleXdvcmQgY3VzdG9tIGtleXdvcmQsIHNob3VsZCBiZSB1bmlxdWUgKGluY2x1ZGluZyBkaWZmZXJlbnQgZnJvbSBhbGwgc3RhbmRhcmQsIGN1c3RvbSBhbmQgbWFjcm8ga2V5d29yZHMpLlxuICogQHBhcmFtIHtPYmplY3R9IGRlZmluaXRpb24ga2V5d29yZCBkZWZpbml0aW9uIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgYHR5cGVgICh0eXBlKHMpIHdoaWNoIHRoZSBrZXl3b3JkIGFwcGxpZXMgdG8pLCBgdmFsaWRhdGVgIG9yIGBjb21waWxlYC5cbiAqIEByZXR1cm4ge0Fqdn0gdGhpcyBmb3IgbWV0aG9kIGNoYWluaW5nXG4gKi9cbmZ1bmN0aW9uIGFkZEtleXdvcmQoa2V5d29yZCwgZGVmaW5pdGlvbikge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gIC8qIGVzbGludCBuby1zaGFkb3c6IDAgKi9cbiAgdmFyIFJVTEVTID0gdGhpcy5SVUxFUztcbiAgaWYgKFJVTEVTLmtleXdvcmRzW2tleXdvcmRdKVxuICAgIHRocm93IG5ldyBFcnJvcignS2V5d29yZCAnICsga2V5d29yZCArICcgaXMgYWxyZWFkeSBkZWZpbmVkJyk7XG5cbiAgaWYgKCFJREVOVElGSUVSLnRlc3Qoa2V5d29yZCkpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdLZXl3b3JkICcgKyBrZXl3b3JkICsgJyBpcyBub3QgYSB2YWxpZCBpZGVudGlmaWVyJyk7XG5cbiAgaWYgKGRlZmluaXRpb24pIHtcbiAgICB0aGlzLnZhbGlkYXRlS2V5d29yZChkZWZpbml0aW9uLCB0cnVlKTtcblxuICAgIHZhciBkYXRhVHlwZSA9IGRlZmluaXRpb24udHlwZTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhVHlwZSkpIHtcbiAgICAgIGZvciAodmFyIGk9MDsgaTxkYXRhVHlwZS5sZW5ndGg7IGkrKylcbiAgICAgICAgX2FkZFJ1bGUoa2V5d29yZCwgZGF0YVR5cGVbaV0sIGRlZmluaXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICBfYWRkUnVsZShrZXl3b3JkLCBkYXRhVHlwZSwgZGVmaW5pdGlvbik7XG4gICAgfVxuXG4gICAgdmFyIG1ldGFTY2hlbWEgPSBkZWZpbml0aW9uLm1ldGFTY2hlbWE7XG4gICAgaWYgKG1ldGFTY2hlbWEpIHtcbiAgICAgIGlmIChkZWZpbml0aW9uLiRkYXRhICYmIHRoaXMuX29wdHMuJGRhdGEpIHtcbiAgICAgICAgbWV0YVNjaGVtYSA9IHtcbiAgICAgICAgICBhbnlPZjogW1xuICAgICAgICAgICAgbWV0YVNjaGVtYSxcbiAgICAgICAgICAgIHsgJyRyZWYnOiAnaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2Fqdi12YWxpZGF0b3IvYWp2L21hc3Rlci9saWIvcmVmcy9kYXRhLmpzb24jJyB9XG4gICAgICAgICAgXVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgZGVmaW5pdGlvbi52YWxpZGF0ZVNjaGVtYSA9IHRoaXMuY29tcGlsZShtZXRhU2NoZW1hLCB0cnVlKTtcbiAgICB9XG4gIH1cblxuICBSVUxFUy5rZXl3b3Jkc1trZXl3b3JkXSA9IFJVTEVTLmFsbFtrZXl3b3JkXSA9IHRydWU7XG5cblxuICBmdW5jdGlvbiBfYWRkUnVsZShrZXl3b3JkLCBkYXRhVHlwZSwgZGVmaW5pdGlvbikge1xuICAgIHZhciBydWxlR3JvdXA7XG4gICAgZm9yICh2YXIgaT0wOyBpPFJVTEVTLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgcmcgPSBSVUxFU1tpXTtcbiAgICAgIGlmIChyZy50eXBlID09IGRhdGFUeXBlKSB7XG4gICAgICAgIHJ1bGVHcm91cCA9IHJnO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXJ1bGVHcm91cCkge1xuICAgICAgcnVsZUdyb3VwID0geyB0eXBlOiBkYXRhVHlwZSwgcnVsZXM6IFtdIH07XG4gICAgICBSVUxFUy5wdXNoKHJ1bGVHcm91cCk7XG4gICAgfVxuXG4gICAgdmFyIHJ1bGUgPSB7XG4gICAgICBrZXl3b3JkOiBrZXl3b3JkLFxuICAgICAgZGVmaW5pdGlvbjogZGVmaW5pdGlvbixcbiAgICAgIGN1c3RvbTogdHJ1ZSxcbiAgICAgIGNvZGU6IGN1c3RvbVJ1bGVDb2RlLFxuICAgICAgaW1wbGVtZW50czogZGVmaW5pdGlvbi5pbXBsZW1lbnRzXG4gICAgfTtcbiAgICBydWxlR3JvdXAucnVsZXMucHVzaChydWxlKTtcbiAgICBSVUxFUy5jdXN0b21ba2V5d29yZF0gPSBydWxlO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59XG5cblxuLyoqXG4gKiBHZXQga2V5d29yZFxuICogQHRoaXMgIEFqdlxuICogQHBhcmFtIHtTdHJpbmd9IGtleXdvcmQgcHJlLWRlZmluZWQgb3IgY3VzdG9tIGtleXdvcmQuXG4gKiBAcmV0dXJuIHtPYmplY3R8Qm9vbGVhbn0gY3VzdG9tIGtleXdvcmQgZGVmaW5pdGlvbiwgYHRydWVgIGlmIGl0IGlzIGEgcHJlZGVmaW5lZCBrZXl3b3JkLCBgZmFsc2VgIG90aGVyd2lzZS5cbiAqL1xuZnVuY3Rpb24gZ2V0S2V5d29yZChrZXl3b3JkKSB7XG4gIC8qIGpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgdmFyIHJ1bGUgPSB0aGlzLlJVTEVTLmN1c3RvbVtrZXl3b3JkXTtcbiAgcmV0dXJuIHJ1bGUgPyBydWxlLmRlZmluaXRpb24gOiB0aGlzLlJVTEVTLmtleXdvcmRzW2tleXdvcmRdIHx8IGZhbHNlO1xufVxuXG5cbi8qKlxuICogUmVtb3ZlIGtleXdvcmRcbiAqIEB0aGlzICBBanZcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXl3b3JkIHByZS1kZWZpbmVkIG9yIGN1c3RvbSBrZXl3b3JkLlxuICogQHJldHVybiB7QWp2fSB0aGlzIGZvciBtZXRob2QgY2hhaW5pbmdcbiAqL1xuZnVuY3Rpb24gcmVtb3ZlS2V5d29yZChrZXl3b3JkKSB7XG4gIC8qIGpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgdmFyIFJVTEVTID0gdGhpcy5SVUxFUztcbiAgZGVsZXRlIFJVTEVTLmtleXdvcmRzW2tleXdvcmRdO1xuICBkZWxldGUgUlVMRVMuYWxsW2tleXdvcmRdO1xuICBkZWxldGUgUlVMRVMuY3VzdG9tW2tleXdvcmRdO1xuICBmb3IgKHZhciBpPTA7IGk8UlVMRVMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcnVsZXMgPSBSVUxFU1tpXS5ydWxlcztcbiAgICBmb3IgKHZhciBqPTA7IGo8cnVsZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgIGlmIChydWxlc1tqXS5rZXl3b3JkID09IGtleXdvcmQpIHtcbiAgICAgICAgcnVsZXMuc3BsaWNlKGosIDEpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59XG5cblxuLyoqXG4gKiBWYWxpZGF0ZSBrZXl3b3JkIGRlZmluaXRpb25cbiAqIEB0aGlzICBBanZcbiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZpbml0aW9uIGtleXdvcmQgZGVmaW5pdGlvbiBvYmplY3QuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHRocm93RXJyb3IgdHJ1ZSB0byB0aHJvdyBleGNlcHRpb24gaWYgZGVmaW5pdGlvbiBpcyBpbnZhbGlkXG4gKiBAcmV0dXJuIHtib29sZWFufSB2YWxpZGF0aW9uIHJlc3VsdFxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZUtleXdvcmQoZGVmaW5pdGlvbiwgdGhyb3dFcnJvcikge1xuICB2YWxpZGF0ZUtleXdvcmQuZXJyb3JzID0gbnVsbDtcbiAgdmFyIHYgPSB0aGlzLl92YWxpZGF0ZUtleXdvcmQgPSB0aGlzLl92YWxpZGF0ZUtleXdvcmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB0aGlzLmNvbXBpbGUoZGVmaW5pdGlvblNjaGVtYSwgdHJ1ZSk7XG5cbiAgaWYgKHYoZGVmaW5pdGlvbikpIHJldHVybiB0cnVlO1xuICB2YWxpZGF0ZUtleXdvcmQuZXJyb3JzID0gdi5lcnJvcnM7XG4gIGlmICh0aHJvd0Vycm9yKVxuICAgIHRocm93IG5ldyBFcnJvcignY3VzdG9tIGtleXdvcmQgZGVmaW5pdGlvbiBpcyBpbnZhbGlkOiAnICArIHRoaXMuZXJyb3JzVGV4dCh2LmVycm9ycykpO1xuICBlbHNlXG4gICAgcmV0dXJuIGZhbHNlO1xufVxuIiwibW9kdWxlLmV4cG9ydHM9e1xuICAgIFwiJHNjaGVtYVwiOiBcImh0dHA6Ly9qc29uLXNjaGVtYS5vcmcvZHJhZnQtMDcvc2NoZW1hI1wiLFxuICAgIFwiJGlkXCI6IFwiaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2Fqdi12YWxpZGF0b3IvYWp2L21hc3Rlci9saWIvcmVmcy9kYXRhLmpzb24jXCIsXG4gICAgXCJkZXNjcmlwdGlvblwiOiBcIk1ldGEtc2NoZW1hIGZvciAkZGF0YSByZWZlcmVuY2UgKEpTT04gU2NoZW1hIGV4dGVuc2lvbiBwcm9wb3NhbClcIixcbiAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICBcInJlcXVpcmVkXCI6IFsgXCIkZGF0YVwiIF0sXG4gICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCIkZGF0YVwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgICAgICAgIFwiYW55T2ZcIjogW1xuICAgICAgICAgICAgICAgIHsgXCJmb3JtYXRcIjogXCJyZWxhdGl2ZS1qc29uLXBvaW50ZXJcIiB9LCBcbiAgICAgICAgICAgICAgICB7IFwiZm9ybWF0XCI6IFwianNvbi1wb2ludGVyXCIgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IGZhbHNlXG59XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gICAgXCIkc2NoZW1hXCI6IFwiaHR0cDovL2pzb24tc2NoZW1hLm9yZy9kcmFmdC0wNy9zY2hlbWEjXCIsXG4gICAgXCIkaWRcIjogXCJodHRwOi8vanNvbi1zY2hlbWEub3JnL2RyYWZ0LTA3L3NjaGVtYSNcIixcbiAgICBcInRpdGxlXCI6IFwiQ29yZSBzY2hlbWEgbWV0YS1zY2hlbWFcIixcbiAgICBcImRlZmluaXRpb25zXCI6IHtcbiAgICAgICAgXCJzY2hlbWFBcnJheVwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgXCJtaW5JdGVtc1wiOiAxLFxuICAgICAgICAgICAgXCJpdGVtc1wiOiB7IFwiJHJlZlwiOiBcIiNcIiB9XG4gICAgICAgIH0sXG4gICAgICAgIFwibm9uTmVnYXRpdmVJbnRlZ2VyXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImludGVnZXJcIixcbiAgICAgICAgICAgIFwibWluaW11bVwiOiAwXG4gICAgICAgIH0sXG4gICAgICAgIFwibm9uTmVnYXRpdmVJbnRlZ2VyRGVmYXVsdDBcIjoge1xuICAgICAgICAgICAgXCJhbGxPZlwiOiBbXG4gICAgICAgICAgICAgICAgeyBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL25vbk5lZ2F0aXZlSW50ZWdlclwiIH0sXG4gICAgICAgICAgICAgICAgeyBcImRlZmF1bHRcIjogMCB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwic2ltcGxlVHlwZXNcIjoge1xuICAgICAgICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgICAgICAgICBcImFycmF5XCIsXG4gICAgICAgICAgICAgICAgXCJib29sZWFuXCIsXG4gICAgICAgICAgICAgICAgXCJpbnRlZ2VyXCIsXG4gICAgICAgICAgICAgICAgXCJudWxsXCIsXG4gICAgICAgICAgICAgICAgXCJudW1iZXJcIixcbiAgICAgICAgICAgICAgICBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgIFwic3RyaW5nXCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJpbmdBcnJheVwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgXCJpdGVtc1wiOiB7IFwidHlwZVwiOiBcInN0cmluZ1wiIH0sXG4gICAgICAgICAgICBcInVuaXF1ZUl0ZW1zXCI6IHRydWUsXG4gICAgICAgICAgICBcImRlZmF1bHRcIjogW11cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXCJ0eXBlXCI6IFtcIm9iamVjdFwiLCBcImJvb2xlYW5cIl0sXG4gICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCIkaWRcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICBcImZvcm1hdFwiOiBcInVyaS1yZWZlcmVuY2VcIlxuICAgICAgICB9LFxuICAgICAgICBcIiRzY2hlbWFcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICBcImZvcm1hdFwiOiBcInVyaVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiJHJlZlwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgICAgICAgIFwiZm9ybWF0XCI6IFwidXJpLXJlZmVyZW5jZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiJGNvbW1lbnRcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZVwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGVmYXVsdFwiOiB0cnVlLFxuICAgICAgICBcInJlYWRPbmx5XCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIixcbiAgICAgICAgICAgIFwiZGVmYXVsdFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBcImV4YW1wbGVzXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICBcIml0ZW1zXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgXCJtdWx0aXBsZU9mXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiLFxuICAgICAgICAgICAgXCJleGNsdXNpdmVNaW5pbXVtXCI6IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCJtYXhpbXVtXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZXhjbHVzaXZlTWF4aW11bVwiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1pbmltdW1cIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJleGNsdXNpdmVNaW5pbXVtXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWF4TGVuZ3RoXCI6IHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9ub25OZWdhdGl2ZUludGVnZXJcIiB9LFxuICAgICAgICBcIm1pbkxlbmd0aFwiOiB7IFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvbm9uTmVnYXRpdmVJbnRlZ2VyRGVmYXVsdDBcIiB9LFxuICAgICAgICBcInBhdHRlcm5cIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICBcImZvcm1hdFwiOiBcInJlZ2V4XCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJhZGRpdGlvbmFsSXRlbXNcIjogeyBcIiRyZWZcIjogXCIjXCIgfSxcbiAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcImFueU9mXCI6IFtcbiAgICAgICAgICAgICAgICB7IFwiJHJlZlwiOiBcIiNcIiB9LFxuICAgICAgICAgICAgICAgIHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9zY2hlbWFBcnJheVwiIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBcImRlZmF1bHRcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBcIm1heEl0ZW1zXCI6IHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9ub25OZWdhdGl2ZUludGVnZXJcIiB9LFxuICAgICAgICBcIm1pbkl0ZW1zXCI6IHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9ub25OZWdhdGl2ZUludGVnZXJEZWZhdWx0MFwiIH0sXG4gICAgICAgIFwidW5pcXVlSXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiLFxuICAgICAgICAgICAgXCJkZWZhdWx0XCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29udGFpbnNcIjogeyBcIiRyZWZcIjogXCIjXCIgfSxcbiAgICAgICAgXCJtYXhQcm9wZXJ0aWVzXCI6IHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9ub25OZWdhdGl2ZUludGVnZXJcIiB9LFxuICAgICAgICBcIm1pblByb3BlcnRpZXNcIjogeyBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL25vbk5lZ2F0aXZlSW50ZWdlckRlZmF1bHQwXCIgfSxcbiAgICAgICAgXCJyZXF1aXJlZFwiOiB7IFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvc3RyaW5nQXJyYXlcIiB9LFxuICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IHsgXCIkcmVmXCI6IFwiI1wiIH0sXG4gICAgICAgIFwiZGVmaW5pdGlvbnNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IHsgXCIkcmVmXCI6IFwiI1wiIH0sXG4gICAgICAgICAgICBcImRlZmF1bHRcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgXCJhZGRpdGlvbmFsUHJvcGVydGllc1wiOiB7IFwiJHJlZlwiOiBcIiNcIiB9LFxuICAgICAgICAgICAgXCJkZWZhdWx0XCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIFwicGF0dGVyblByb3BlcnRpZXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IHsgXCIkcmVmXCI6IFwiI1wiIH0sXG4gICAgICAgICAgICBcInByb3BlcnR5TmFtZXNcIjogeyBcImZvcm1hdFwiOiBcInJlZ2V4XCIgfSxcbiAgICAgICAgICAgIFwiZGVmYXVsdFwiOiB7fVxuICAgICAgICB9LFxuICAgICAgICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgICAgICAgIFwiYWRkaXRpb25hbFByb3BlcnRpZXNcIjoge1xuICAgICAgICAgICAgICAgIFwiYW55T2ZcIjogW1xuICAgICAgICAgICAgICAgICAgICB7IFwiJHJlZlwiOiBcIiNcIiB9LFxuICAgICAgICAgICAgICAgICAgICB7IFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvc3RyaW5nQXJyYXlcIiB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInByb3BlcnR5TmFtZXNcIjogeyBcIiRyZWZcIjogXCIjXCIgfSxcbiAgICAgICAgXCJjb25zdFwiOiB0cnVlLFxuICAgICAgICBcImVudW1cIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgIFwiaXRlbXNcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwibWluSXRlbXNcIjogMSxcbiAgICAgICAgICAgIFwidW5pcXVlSXRlbXNcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBcInR5cGVcIjoge1xuICAgICAgICAgICAgXCJhbnlPZlwiOiBbXG4gICAgICAgICAgICAgICAgeyBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL3NpbXBsZVR5cGVzXCIgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgICAgICAgIFwiaXRlbXNcIjogeyBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL3NpbXBsZVR5cGVzXCIgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJtaW5JdGVtc1wiOiAxLFxuICAgICAgICAgICAgICAgICAgICBcInVuaXF1ZUl0ZW1zXCI6IHRydWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9ybWF0XCI6IHsgXCJ0eXBlXCI6IFwic3RyaW5nXCIgfSxcbiAgICAgICAgXCJjb250ZW50TWVkaWFUeXBlXCI6IHsgXCJ0eXBlXCI6IFwic3RyaW5nXCIgfSxcbiAgICAgICAgXCJjb250ZW50RW5jb2RpbmdcIjogeyBcInR5cGVcIjogXCJzdHJpbmdcIiB9LFxuICAgICAgICBcImlmXCI6IHtcIiRyZWZcIjogXCIjXCJ9LFxuICAgICAgICBcInRoZW5cIjoge1wiJHJlZlwiOiBcIiNcIn0sXG4gICAgICAgIFwiZWxzZVwiOiB7XCIkcmVmXCI6IFwiI1wifSxcbiAgICAgICAgXCJhbGxPZlwiOiB7IFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvc2NoZW1hQXJyYXlcIiB9LFxuICAgICAgICBcImFueU9mXCI6IHsgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9zY2hlbWFBcnJheVwiIH0sXG4gICAgICAgIFwib25lT2ZcIjogeyBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL3NjaGVtYUFycmF5XCIgfSxcbiAgICAgICAgXCJub3RcIjogeyBcIiRyZWZcIjogXCIjXCIgfVxuICAgIH0sXG4gICAgXCJkZWZhdWx0XCI6IHRydWVcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gZG8gbm90IGVkaXQgLmpzIGZpbGVzIGRpcmVjdGx5IC0gZWRpdCBzcmMvaW5kZXguanN0XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGVxdWFsKGEsIGIpIHtcbiAgaWYgKGEgPT09IGIpIHJldHVybiB0cnVlO1xuXG4gIGlmIChhICYmIGIgJiYgdHlwZW9mIGEgPT0gJ29iamVjdCcgJiYgdHlwZW9mIGIgPT0gJ29iamVjdCcpIHtcbiAgICBpZiAoYS5jb25zdHJ1Y3RvciAhPT0gYi5jb25zdHJ1Y3RvcikgcmV0dXJuIGZhbHNlO1xuXG4gICAgdmFyIGxlbmd0aCwgaSwga2V5cztcbiAgICBpZiAoQXJyYXkuaXNBcnJheShhKSkge1xuICAgICAgbGVuZ3RoID0gYS5sZW5ndGg7XG4gICAgICBpZiAobGVuZ3RoICE9IGIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gICAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSAhPT0gMDspXG4gICAgICAgIGlmICghZXF1YWwoYVtpXSwgYltpXSkpIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuXG5cbiAgICBpZiAoYS5jb25zdHJ1Y3RvciA9PT0gUmVnRXhwKSByZXR1cm4gYS5zb3VyY2UgPT09IGIuc291cmNlICYmIGEuZmxhZ3MgPT09IGIuZmxhZ3M7XG4gICAgaWYgKGEudmFsdWVPZiAhPT0gT2JqZWN0LnByb3RvdHlwZS52YWx1ZU9mKSByZXR1cm4gYS52YWx1ZU9mKCkgPT09IGIudmFsdWVPZigpO1xuICAgIGlmIChhLnRvU3RyaW5nICE9PSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nKSByZXR1cm4gYS50b1N0cmluZygpID09PSBiLnRvU3RyaW5nKCk7XG5cbiAgICBrZXlzID0gT2JqZWN0LmtleXMoYSk7XG4gICAgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgaWYgKGxlbmd0aCAhPT0gT2JqZWN0LmtleXMoYikubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSAhPT0gMDspXG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChiLCBrZXlzW2ldKSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gIT09IDA7KSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpXTtcblxuICAgICAgaWYgKCFlcXVhbChhW2tleV0sIGJba2V5XSkpIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIHRydWUgaWYgYm90aCBOYU4sIGZhbHNlIG90aGVyd2lzZVxuICByZXR1cm4gYSE9PWEgJiYgYiE9PWI7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChkYXRhLCBvcHRzKSB7XG4gICAgaWYgKCFvcHRzKSBvcHRzID0ge307XG4gICAgaWYgKHR5cGVvZiBvcHRzID09PSAnZnVuY3Rpb24nKSBvcHRzID0geyBjbXA6IG9wdHMgfTtcbiAgICB2YXIgY3ljbGVzID0gKHR5cGVvZiBvcHRzLmN5Y2xlcyA9PT0gJ2Jvb2xlYW4nKSA/IG9wdHMuY3ljbGVzIDogZmFsc2U7XG5cbiAgICB2YXIgY21wID0gb3B0cy5jbXAgJiYgKGZ1bmN0aW9uIChmKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFvYmogPSB7IGtleTogYSwgdmFsdWU6IG5vZGVbYV0gfTtcbiAgICAgICAgICAgICAgICB2YXIgYm9iaiA9IHsga2V5OiBiLCB2YWx1ZTogbm9kZVtiXSB9O1xuICAgICAgICAgICAgICAgIHJldHVybiBmKGFvYmosIGJvYmopO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICB9KShvcHRzLmNtcCk7XG5cbiAgICB2YXIgc2VlbiA9IFtdO1xuICAgIHJldHVybiAoZnVuY3Rpb24gc3RyaW5naWZ5IChub2RlKSB7XG4gICAgICAgIGlmIChub2RlICYmIG5vZGUudG9KU09OICYmIHR5cGVvZiBub2RlLnRvSlNPTiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgbm9kZSA9IG5vZGUudG9KU09OKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobm9kZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gICAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PSAnbnVtYmVyJykgcmV0dXJuIGlzRmluaXRlKG5vZGUpID8gJycgKyBub2RlIDogJ251bGwnO1xuICAgICAgICBpZiAodHlwZW9mIG5vZGUgIT09ICdvYmplY3QnKSByZXR1cm4gSlNPTi5zdHJpbmdpZnkobm9kZSk7XG5cbiAgICAgICAgdmFyIGksIG91dDtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobm9kZSkpIHtcbiAgICAgICAgICAgIG91dCA9ICdbJztcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBub2RlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkpIG91dCArPSAnLCc7XG4gICAgICAgICAgICAgICAgb3V0ICs9IHN0cmluZ2lmeShub2RlW2ldKSB8fCAnbnVsbCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb3V0ICsgJ10nO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUgPT09IG51bGwpIHJldHVybiAnbnVsbCc7XG5cbiAgICAgICAgaWYgKHNlZW4uaW5kZXhPZihub2RlKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIGlmIChjeWNsZXMpIHJldHVybiBKU09OLnN0cmluZ2lmeSgnX19jeWNsZV9fJyk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb252ZXJ0aW5nIGNpcmN1bGFyIHN0cnVjdHVyZSB0byBKU09OJyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc2VlbkluZGV4ID0gc2Vlbi5wdXNoKG5vZGUpIC0gMTtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhub2RlKS5zb3J0KGNtcCAmJiBjbXAobm9kZSkpO1xuICAgICAgICBvdXQgPSAnJztcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gc3RyaW5naWZ5KG5vZGVba2V5XSk7XG5cbiAgICAgICAgICAgIGlmICghdmFsdWUpIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYgKG91dCkgb3V0ICs9ICcsJztcbiAgICAgICAgICAgIG91dCArPSBKU09OLnN0cmluZ2lmeShrZXkpICsgJzonICsgdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgc2Vlbi5zcGxpY2Uoc2VlbkluZGV4LCAxKTtcbiAgICAgICAgcmV0dXJuICd7JyArIG91dCArICd9JztcbiAgICB9KShkYXRhKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB0cmF2ZXJzZSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHNjaGVtYSwgb3B0cywgY2IpIHtcbiAgLy8gTGVnYWN5IHN1cHBvcnQgZm9yIHYwLjMuMSBhbmQgZWFybGllci5cbiAgaWYgKHR5cGVvZiBvcHRzID09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IG9wdHM7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgY2IgPSBvcHRzLmNiIHx8IGNiO1xuICB2YXIgcHJlID0gKHR5cGVvZiBjYiA9PSAnZnVuY3Rpb24nKSA/IGNiIDogY2IucHJlIHx8IGZ1bmN0aW9uKCkge307XG4gIHZhciBwb3N0ID0gY2IucG9zdCB8fCBmdW5jdGlvbigpIHt9O1xuXG4gIF90cmF2ZXJzZShvcHRzLCBwcmUsIHBvc3QsIHNjaGVtYSwgJycsIHNjaGVtYSk7XG59O1xuXG5cbnRyYXZlcnNlLmtleXdvcmRzID0ge1xuICBhZGRpdGlvbmFsSXRlbXM6IHRydWUsXG4gIGl0ZW1zOiB0cnVlLFxuICBjb250YWluczogdHJ1ZSxcbiAgYWRkaXRpb25hbFByb3BlcnRpZXM6IHRydWUsXG4gIHByb3BlcnR5TmFtZXM6IHRydWUsXG4gIG5vdDogdHJ1ZVxufTtcblxudHJhdmVyc2UuYXJyYXlLZXl3b3JkcyA9IHtcbiAgaXRlbXM6IHRydWUsXG4gIGFsbE9mOiB0cnVlLFxuICBhbnlPZjogdHJ1ZSxcbiAgb25lT2Y6IHRydWVcbn07XG5cbnRyYXZlcnNlLnByb3BzS2V5d29yZHMgPSB7XG4gIGRlZmluaXRpb25zOiB0cnVlLFxuICBwcm9wZXJ0aWVzOiB0cnVlLFxuICBwYXR0ZXJuUHJvcGVydGllczogdHJ1ZSxcbiAgZGVwZW5kZW5jaWVzOiB0cnVlXG59O1xuXG50cmF2ZXJzZS5za2lwS2V5d29yZHMgPSB7XG4gIGRlZmF1bHQ6IHRydWUsXG4gIGVudW06IHRydWUsXG4gIGNvbnN0OiB0cnVlLFxuICByZXF1aXJlZDogdHJ1ZSxcbiAgbWF4aW11bTogdHJ1ZSxcbiAgbWluaW11bTogdHJ1ZSxcbiAgZXhjbHVzaXZlTWF4aW11bTogdHJ1ZSxcbiAgZXhjbHVzaXZlTWluaW11bTogdHJ1ZSxcbiAgbXVsdGlwbGVPZjogdHJ1ZSxcbiAgbWF4TGVuZ3RoOiB0cnVlLFxuICBtaW5MZW5ndGg6IHRydWUsXG4gIHBhdHRlcm46IHRydWUsXG4gIGZvcm1hdDogdHJ1ZSxcbiAgbWF4SXRlbXM6IHRydWUsXG4gIG1pbkl0ZW1zOiB0cnVlLFxuICB1bmlxdWVJdGVtczogdHJ1ZSxcbiAgbWF4UHJvcGVydGllczogdHJ1ZSxcbiAgbWluUHJvcGVydGllczogdHJ1ZVxufTtcblxuXG5mdW5jdGlvbiBfdHJhdmVyc2Uob3B0cywgcHJlLCBwb3N0LCBzY2hlbWEsIGpzb25QdHIsIHJvb3RTY2hlbWEsIHBhcmVudEpzb25QdHIsIHBhcmVudEtleXdvcmQsIHBhcmVudFNjaGVtYSwga2V5SW5kZXgpIHtcbiAgaWYgKHNjaGVtYSAmJiB0eXBlb2Ygc2NoZW1hID09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KHNjaGVtYSkpIHtcbiAgICBwcmUoc2NoZW1hLCBqc29uUHRyLCByb290U2NoZW1hLCBwYXJlbnRKc29uUHRyLCBwYXJlbnRLZXl3b3JkLCBwYXJlbnRTY2hlbWEsIGtleUluZGV4KTtcbiAgICBmb3IgKHZhciBrZXkgaW4gc2NoZW1hKSB7XG4gICAgICB2YXIgc2NoID0gc2NoZW1hW2tleV07XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShzY2gpKSB7XG4gICAgICAgIGlmIChrZXkgaW4gdHJhdmVyc2UuYXJyYXlLZXl3b3Jkcykge1xuICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxzY2gubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICBfdHJhdmVyc2Uob3B0cywgcHJlLCBwb3N0LCBzY2hbaV0sIGpzb25QdHIgKyAnLycgKyBrZXkgKyAnLycgKyBpLCByb290U2NoZW1hLCBqc29uUHRyLCBrZXksIHNjaGVtYSwgaSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoa2V5IGluIHRyYXZlcnNlLnByb3BzS2V5d29yZHMpIHtcbiAgICAgICAgaWYgKHNjaCAmJiB0eXBlb2Ygc2NoID09ICdvYmplY3QnKSB7XG4gICAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzY2gpXG4gICAgICAgICAgICBfdHJhdmVyc2Uob3B0cywgcHJlLCBwb3N0LCBzY2hbcHJvcF0sIGpzb25QdHIgKyAnLycgKyBrZXkgKyAnLycgKyBlc2NhcGVKc29uUHRyKHByb3ApLCByb290U2NoZW1hLCBqc29uUHRyLCBrZXksIHNjaGVtYSwgcHJvcCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoa2V5IGluIHRyYXZlcnNlLmtleXdvcmRzIHx8IChvcHRzLmFsbEtleXMgJiYgIShrZXkgaW4gdHJhdmVyc2Uuc2tpcEtleXdvcmRzKSkpIHtcbiAgICAgICAgX3RyYXZlcnNlKG9wdHMsIHByZSwgcG9zdCwgc2NoLCBqc29uUHRyICsgJy8nICsga2V5LCByb290U2NoZW1hLCBqc29uUHRyLCBrZXksIHNjaGVtYSk7XG4gICAgICB9XG4gICAgfVxuICAgIHBvc3Qoc2NoZW1hLCBqc29uUHRyLCByb290U2NoZW1hLCBwYXJlbnRKc29uUHRyLCBwYXJlbnRLZXl3b3JkLCBwYXJlbnRTY2hlbWEsIGtleUluZGV4KTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGVzY2FwZUpzb25QdHIoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvfi9nLCAnfjAnKS5yZXBsYWNlKC9cXC8vZywgJ34xJyk7XG59XG4iLCIvKiogQGxpY2Vuc2UgVVJJLmpzIHY0LjQuMSAoYykgMjAxMSBHYXJ5IENvdXJ0LiBMaWNlbnNlOiBodHRwOi8vZ2l0aHViLmNvbS9nYXJ5Y291cnQvdXJpLWpzICovXG4oZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuXHR0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBmYWN0b3J5KGV4cG9ydHMpIDpcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KSA6XG5cdChmYWN0b3J5KChnbG9iYWwuVVJJID0gZ2xvYmFsLlVSSSB8fCB7fSkpKTtcbn0odGhpcywgKGZ1bmN0aW9uIChleHBvcnRzKSB7ICd1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gbWVyZ2UoKSB7XG4gICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIHNldHMgPSBBcnJheShfbGVuKSwgX2tleSA9IDA7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgICAgc2V0c1tfa2V5XSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICB9XG5cbiAgICBpZiAoc2V0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHNldHNbMF0gPSBzZXRzWzBdLnNsaWNlKDAsIC0xKTtcbiAgICAgICAgdmFyIHhsID0gc2V0cy5sZW5ndGggLSAxO1xuICAgICAgICBmb3IgKHZhciB4ID0gMTsgeCA8IHhsOyArK3gpIHtcbiAgICAgICAgICAgIHNldHNbeF0gPSBzZXRzW3hdLnNsaWNlKDEsIC0xKTtcbiAgICAgICAgfVxuICAgICAgICBzZXRzW3hsXSA9IHNldHNbeGxdLnNsaWNlKDEpO1xuICAgICAgICByZXR1cm4gc2V0cy5qb2luKCcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gc2V0c1swXTtcbiAgICB9XG59XG5mdW5jdGlvbiBzdWJleHAoc3RyKSB7XG4gICAgcmV0dXJuIFwiKD86XCIgKyBzdHIgKyBcIilcIjtcbn1cbmZ1bmN0aW9uIHR5cGVPZihvKSB7XG4gICAgcmV0dXJuIG8gPT09IHVuZGVmaW5lZCA/IFwidW5kZWZpbmVkXCIgOiBvID09PSBudWxsID8gXCJudWxsXCIgOiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykuc3BsaXQoXCIgXCIpLnBvcCgpLnNwbGl0KFwiXVwiKS5zaGlmdCgpLnRvTG93ZXJDYXNlKCk7XG59XG5mdW5jdGlvbiB0b1VwcGVyQ2FzZShzdHIpIHtcbiAgICByZXR1cm4gc3RyLnRvVXBwZXJDYXNlKCk7XG59XG5mdW5jdGlvbiB0b0FycmF5KG9iaikge1xuICAgIHJldHVybiBvYmogIT09IHVuZGVmaW5lZCAmJiBvYmogIT09IG51bGwgPyBvYmogaW5zdGFuY2VvZiBBcnJheSA/IG9iaiA6IHR5cGVvZiBvYmoubGVuZ3RoICE9PSBcIm51bWJlclwiIHx8IG9iai5zcGxpdCB8fCBvYmouc2V0SW50ZXJ2YWwgfHwgb2JqLmNhbGwgPyBbb2JqXSA6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKG9iaikgOiBbXTtcbn1cbmZ1bmN0aW9uIGFzc2lnbih0YXJnZXQsIHNvdXJjZSkge1xuICAgIHZhciBvYmogPSB0YXJnZXQ7XG4gICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBvYmpba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkRXhwcyhpc0lSSSkge1xuICAgIHZhciBBTFBIQSQkID0gXCJbQS1aYS16XVwiLFxuICAgICAgICBDUiQgPSBcIltcXFxceDBEXVwiLFxuICAgICAgICBESUdJVCQkID0gXCJbMC05XVwiLFxuICAgICAgICBEUVVPVEUkJCA9IFwiW1xcXFx4MjJdXCIsXG4gICAgICAgIEhFWERJRyQkID0gbWVyZ2UoRElHSVQkJCwgXCJbQS1GYS1mXVwiKSxcbiAgICAgICAgLy9jYXNlLWluc2Vuc2l0aXZlXG4gICAgTEYkJCA9IFwiW1xcXFx4MEFdXCIsXG4gICAgICAgIFNQJCQgPSBcIltcXFxceDIwXVwiLFxuICAgICAgICBQQ1RfRU5DT0RFRCQgPSBzdWJleHAoc3ViZXhwKFwiJVtFRmVmXVwiICsgSEVYRElHJCQgKyBcIiVcIiArIEhFWERJRyQkICsgSEVYRElHJCQgKyBcIiVcIiArIEhFWERJRyQkICsgSEVYRElHJCQpICsgXCJ8XCIgKyBzdWJleHAoXCIlWzg5QS1GYS1mXVwiICsgSEVYRElHJCQgKyBcIiVcIiArIEhFWERJRyQkICsgSEVYRElHJCQpICsgXCJ8XCIgKyBzdWJleHAoXCIlXCIgKyBIRVhESUckJCArIEhFWERJRyQkKSksXG4gICAgICAgIC8vZXhwYW5kZWRcbiAgICBHRU5fREVMSU1TJCQgPSBcIltcXFxcOlxcXFwvXFxcXD9cXFxcI1xcXFxbXFxcXF1cXFxcQF1cIixcbiAgICAgICAgU1VCX0RFTElNUyQkID0gXCJbXFxcXCFcXFxcJFxcXFwmXFxcXCdcXFxcKFxcXFwpXFxcXCpcXFxcK1xcXFwsXFxcXDtcXFxcPV1cIixcbiAgICAgICAgUkVTRVJWRUQkJCA9IG1lcmdlKEdFTl9ERUxJTVMkJCwgU1VCX0RFTElNUyQkKSxcbiAgICAgICAgVUNTQ0hBUiQkID0gaXNJUkkgPyBcIltcXFxceEEwLVxcXFx1MjAwRFxcXFx1MjAxMC1cXFxcdTIwMjlcXFxcdTIwMkYtXFxcXHVEN0ZGXFxcXHVGOTAwLVxcXFx1RkRDRlxcXFx1RkRGMC1cXFxcdUZGRUZdXCIgOiBcIltdXCIsXG4gICAgICAgIC8vc3Vic2V0LCBleGNsdWRlcyBiaWRpIGNvbnRyb2wgY2hhcmFjdGVyc1xuICAgIElQUklWQVRFJCQgPSBpc0lSSSA/IFwiW1xcXFx1RTAwMC1cXFxcdUY4RkZdXCIgOiBcIltdXCIsXG4gICAgICAgIC8vc3Vic2V0XG4gICAgVU5SRVNFUlZFRCQkID0gbWVyZ2UoQUxQSEEkJCwgRElHSVQkJCwgXCJbXFxcXC1cXFxcLlxcXFxfXFxcXH5dXCIsIFVDU0NIQVIkJCksXG4gICAgICAgIFNDSEVNRSQgPSBzdWJleHAoQUxQSEEkJCArIG1lcmdlKEFMUEhBJCQsIERJR0lUJCQsIFwiW1xcXFwrXFxcXC1cXFxcLl1cIikgKyBcIipcIiksXG4gICAgICAgIFVTRVJJTkZPJCA9IHN1YmV4cChzdWJleHAoUENUX0VOQ09ERUQkICsgXCJ8XCIgKyBtZXJnZShVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCwgXCJbXFxcXDpdXCIpKSArIFwiKlwiKSxcbiAgICAgICAgREVDX09DVEVUJCA9IHN1YmV4cChzdWJleHAoXCIyNVswLTVdXCIpICsgXCJ8XCIgKyBzdWJleHAoXCIyWzAtNF1cIiArIERJR0lUJCQpICsgXCJ8XCIgKyBzdWJleHAoXCIxXCIgKyBESUdJVCQkICsgRElHSVQkJCkgKyBcInxcIiArIHN1YmV4cChcIlsxLTldXCIgKyBESUdJVCQkKSArIFwifFwiICsgRElHSVQkJCksXG4gICAgICAgIERFQ19PQ1RFVF9SRUxBWEVEJCA9IHN1YmV4cChzdWJleHAoXCIyNVswLTVdXCIpICsgXCJ8XCIgKyBzdWJleHAoXCIyWzAtNF1cIiArIERJR0lUJCQpICsgXCJ8XCIgKyBzdWJleHAoXCIxXCIgKyBESUdJVCQkICsgRElHSVQkJCkgKyBcInxcIiArIHN1YmV4cChcIjA/WzEtOV1cIiArIERJR0lUJCQpICsgXCJ8MD8wP1wiICsgRElHSVQkJCksXG4gICAgICAgIC8vcmVsYXhlZCBwYXJzaW5nIHJ1bGVzXG4gICAgSVBWNEFERFJFU1MkID0gc3ViZXhwKERFQ19PQ1RFVF9SRUxBWEVEJCArIFwiXFxcXC5cIiArIERFQ19PQ1RFVF9SRUxBWEVEJCArIFwiXFxcXC5cIiArIERFQ19PQ1RFVF9SRUxBWEVEJCArIFwiXFxcXC5cIiArIERFQ19PQ1RFVF9SRUxBWEVEJCksXG4gICAgICAgIEgxNiQgPSBzdWJleHAoSEVYRElHJCQgKyBcInsxLDR9XCIpLFxuICAgICAgICBMUzMyJCA9IHN1YmV4cChzdWJleHAoSDE2JCArIFwiXFxcXDpcIiArIEgxNiQpICsgXCJ8XCIgKyBJUFY0QUREUkVTUyQpLFxuICAgICAgICBJUFY2QUREUkVTUzEkID0gc3ViZXhwKHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezZ9XCIgKyBMUzMyJCksXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgNiggaDE2IFwiOlwiICkgbHMzMlxuICAgIElQVjZBRERSRVNTMiQgPSBzdWJleHAoXCJcXFxcOlxcXFw6XCIgKyBzdWJleHAoSDE2JCArIFwiXFxcXDpcIikgKyBcIns1fVwiICsgTFMzMiQpLFxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICBcIjo6XCIgNSggaDE2IFwiOlwiICkgbHMzMlxuICAgIElQVjZBRERSRVNTMyQgPSBzdWJleHAoc3ViZXhwKEgxNiQpICsgXCI/XFxcXDpcXFxcOlwiICsgc3ViZXhwKEgxNiQgKyBcIlxcXFw6XCIpICsgXCJ7NH1cIiArIExTMzIkKSxcbiAgICAgICAgLy9bICAgICAgICAgICAgICAgaDE2IF0gXCI6OlwiIDQoIGgxNiBcIjpcIiApIGxzMzJcbiAgICBJUFY2QUREUkVTUzQkID0gc3ViZXhwKHN1YmV4cChzdWJleHAoSDE2JCArIFwiXFxcXDpcIikgKyBcInswLDF9XCIgKyBIMTYkKSArIFwiP1xcXFw6XFxcXDpcIiArIHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezN9XCIgKyBMUzMyJCksXG4gICAgICAgIC8vWyAqMSggaDE2IFwiOlwiICkgaDE2IF0gXCI6OlwiIDMoIGgxNiBcIjpcIiApIGxzMzJcbiAgICBJUFY2QUREUkVTUzUkID0gc3ViZXhwKHN1YmV4cChzdWJleHAoSDE2JCArIFwiXFxcXDpcIikgKyBcInswLDJ9XCIgKyBIMTYkKSArIFwiP1xcXFw6XFxcXDpcIiArIHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezJ9XCIgKyBMUzMyJCksXG4gICAgICAgIC8vWyAqMiggaDE2IFwiOlwiICkgaDE2IF0gXCI6OlwiIDIoIGgxNiBcIjpcIiApIGxzMzJcbiAgICBJUFY2QUREUkVTUzYkID0gc3ViZXhwKHN1YmV4cChzdWJleHAoSDE2JCArIFwiXFxcXDpcIikgKyBcInswLDN9XCIgKyBIMTYkKSArIFwiP1xcXFw6XFxcXDpcIiArIEgxNiQgKyBcIlxcXFw6XCIgKyBMUzMyJCksXG4gICAgICAgIC8vWyAqMyggaDE2IFwiOlwiICkgaDE2IF0gXCI6OlwiICAgIGgxNiBcIjpcIiAgIGxzMzJcbiAgICBJUFY2QUREUkVTUzckID0gc3ViZXhwKHN1YmV4cChzdWJleHAoSDE2JCArIFwiXFxcXDpcIikgKyBcInswLDR9XCIgKyBIMTYkKSArIFwiP1xcXFw6XFxcXDpcIiArIExTMzIkKSxcbiAgICAgICAgLy9bICo0KCBoMTYgXCI6XCIgKSBoMTYgXSBcIjo6XCIgICAgICAgICAgICAgIGxzMzJcbiAgICBJUFY2QUREUkVTUzgkID0gc3ViZXhwKHN1YmV4cChzdWJleHAoSDE2JCArIFwiXFxcXDpcIikgKyBcInswLDV9XCIgKyBIMTYkKSArIFwiP1xcXFw6XFxcXDpcIiArIEgxNiQpLFxuICAgICAgICAvL1sgKjUoIGgxNiBcIjpcIiApIGgxNiBdIFwiOjpcIiAgICAgICAgICAgICAgaDE2XG4gICAgSVBWNkFERFJFU1M5JCA9IHN1YmV4cChzdWJleHAoc3ViZXhwKEgxNiQgKyBcIlxcXFw6XCIpICsgXCJ7MCw2fVwiICsgSDE2JCkgKyBcIj9cXFxcOlxcXFw6XCIpLFxuICAgICAgICAvL1sgKjYoIGgxNiBcIjpcIiApIGgxNiBdIFwiOjpcIlxuICAgIElQVjZBRERSRVNTJCA9IHN1YmV4cChbSVBWNkFERFJFU1MxJCwgSVBWNkFERFJFU1MyJCwgSVBWNkFERFJFU1MzJCwgSVBWNkFERFJFU1M0JCwgSVBWNkFERFJFU1M1JCwgSVBWNkFERFJFU1M2JCwgSVBWNkFERFJFU1M3JCwgSVBWNkFERFJFU1M4JCwgSVBWNkFERFJFU1M5JF0uam9pbihcInxcIikpLFxuICAgICAgICBaT05FSUQkID0gc3ViZXhwKHN1YmV4cChVTlJFU0VSVkVEJCQgKyBcInxcIiArIFBDVF9FTkNPREVEJCkgKyBcIitcIiksXG4gICAgICAgIC8vUkZDIDY4NzRcbiAgICBJUFY2QUREUlokID0gc3ViZXhwKElQVjZBRERSRVNTJCArIFwiXFxcXCUyNVwiICsgWk9ORUlEJCksXG4gICAgICAgIC8vUkZDIDY4NzRcbiAgICBJUFY2QUREUlpfUkVMQVhFRCQgPSBzdWJleHAoSVBWNkFERFJFU1MkICsgc3ViZXhwKFwiXFxcXCUyNXxcXFxcJSg/IVwiICsgSEVYRElHJCQgKyBcInsyfSlcIikgKyBaT05FSUQkKSxcbiAgICAgICAgLy9SRkMgNjg3NCwgd2l0aCByZWxheGVkIHBhcnNpbmcgcnVsZXNcbiAgICBJUFZGVVRVUkUkID0gc3ViZXhwKFwiW3ZWXVwiICsgSEVYRElHJCQgKyBcIitcXFxcLlwiICsgbWVyZ2UoVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQsIFwiW1xcXFw6XVwiKSArIFwiK1wiKSxcbiAgICAgICAgSVBfTElURVJBTCQgPSBzdWJleHAoXCJcXFxcW1wiICsgc3ViZXhwKElQVjZBRERSWl9SRUxBWEVEJCArIFwifFwiICsgSVBWNkFERFJFU1MkICsgXCJ8XCIgKyBJUFZGVVRVUkUkKSArIFwiXFxcXF1cIiksXG4gICAgICAgIC8vUkZDIDY4NzRcbiAgICBSRUdfTkFNRSQgPSBzdWJleHAoc3ViZXhwKFBDVF9FTkNPREVEJCArIFwifFwiICsgbWVyZ2UoVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQpKSArIFwiKlwiKSxcbiAgICAgICAgSE9TVCQgPSBzdWJleHAoSVBfTElURVJBTCQgKyBcInxcIiArIElQVjRBRERSRVNTJCArIFwiKD8hXCIgKyBSRUdfTkFNRSQgKyBcIilcIiArIFwifFwiICsgUkVHX05BTUUkKSxcbiAgICAgICAgUE9SVCQgPSBzdWJleHAoRElHSVQkJCArIFwiKlwiKSxcbiAgICAgICAgQVVUSE9SSVRZJCA9IHN1YmV4cChzdWJleHAoVVNFUklORk8kICsgXCJAXCIpICsgXCI/XCIgKyBIT1NUJCArIHN1YmV4cChcIlxcXFw6XCIgKyBQT1JUJCkgKyBcIj9cIiksXG4gICAgICAgIFBDSEFSJCA9IHN1YmV4cChQQ1RfRU5DT0RFRCQgKyBcInxcIiArIG1lcmdlKFVOUkVTRVJWRUQkJCwgU1VCX0RFTElNUyQkLCBcIltcXFxcOlxcXFxAXVwiKSksXG4gICAgICAgIFNFR01FTlQkID0gc3ViZXhwKFBDSEFSJCArIFwiKlwiKSxcbiAgICAgICAgU0VHTUVOVF9OWiQgPSBzdWJleHAoUENIQVIkICsgXCIrXCIpLFxuICAgICAgICBTRUdNRU5UX05aX05DJCA9IHN1YmV4cChzdWJleHAoUENUX0VOQ09ERUQkICsgXCJ8XCIgKyBtZXJnZShVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCwgXCJbXFxcXEBdXCIpKSArIFwiK1wiKSxcbiAgICAgICAgUEFUSF9BQkVNUFRZJCA9IHN1YmV4cChzdWJleHAoXCJcXFxcL1wiICsgU0VHTUVOVCQpICsgXCIqXCIpLFxuICAgICAgICBQQVRIX0FCU09MVVRFJCA9IHN1YmV4cChcIlxcXFwvXCIgKyBzdWJleHAoU0VHTUVOVF9OWiQgKyBQQVRIX0FCRU1QVFkkKSArIFwiP1wiKSxcbiAgICAgICAgLy9zaW1wbGlmaWVkXG4gICAgUEFUSF9OT1NDSEVNRSQgPSBzdWJleHAoU0VHTUVOVF9OWl9OQyQgKyBQQVRIX0FCRU1QVFkkKSxcbiAgICAgICAgLy9zaW1wbGlmaWVkXG4gICAgUEFUSF9ST09UTEVTUyQgPSBzdWJleHAoU0VHTUVOVF9OWiQgKyBQQVRIX0FCRU1QVFkkKSxcbiAgICAgICAgLy9zaW1wbGlmaWVkXG4gICAgUEFUSF9FTVBUWSQgPSBcIig/IVwiICsgUENIQVIkICsgXCIpXCIsXG4gICAgICAgIFBBVEgkID0gc3ViZXhwKFBBVEhfQUJFTVBUWSQgKyBcInxcIiArIFBBVEhfQUJTT0xVVEUkICsgXCJ8XCIgKyBQQVRIX05PU0NIRU1FJCArIFwifFwiICsgUEFUSF9ST09UTEVTUyQgKyBcInxcIiArIFBBVEhfRU1QVFkkKSxcbiAgICAgICAgUVVFUlkkID0gc3ViZXhwKHN1YmV4cChQQ0hBUiQgKyBcInxcIiArIG1lcmdlKFwiW1xcXFwvXFxcXD9dXCIsIElQUklWQVRFJCQpKSArIFwiKlwiKSxcbiAgICAgICAgRlJBR01FTlQkID0gc3ViZXhwKHN1YmV4cChQQ0hBUiQgKyBcInxbXFxcXC9cXFxcP11cIikgKyBcIipcIiksXG4gICAgICAgIEhJRVJfUEFSVCQgPSBzdWJleHAoc3ViZXhwKFwiXFxcXC9cXFxcL1wiICsgQVVUSE9SSVRZJCArIFBBVEhfQUJFTVBUWSQpICsgXCJ8XCIgKyBQQVRIX0FCU09MVVRFJCArIFwifFwiICsgUEFUSF9ST09UTEVTUyQgKyBcInxcIiArIFBBVEhfRU1QVFkkKSxcbiAgICAgICAgVVJJJCA9IHN1YmV4cChTQ0hFTUUkICsgXCJcXFxcOlwiICsgSElFUl9QQVJUJCArIHN1YmV4cChcIlxcXFw/XCIgKyBRVUVSWSQpICsgXCI/XCIgKyBzdWJleHAoXCJcXFxcI1wiICsgRlJBR01FTlQkKSArIFwiP1wiKSxcbiAgICAgICAgUkVMQVRJVkVfUEFSVCQgPSBzdWJleHAoc3ViZXhwKFwiXFxcXC9cXFxcL1wiICsgQVVUSE9SSVRZJCArIFBBVEhfQUJFTVBUWSQpICsgXCJ8XCIgKyBQQVRIX0FCU09MVVRFJCArIFwifFwiICsgUEFUSF9OT1NDSEVNRSQgKyBcInxcIiArIFBBVEhfRU1QVFkkKSxcbiAgICAgICAgUkVMQVRJVkUkID0gc3ViZXhwKFJFTEFUSVZFX1BBUlQkICsgc3ViZXhwKFwiXFxcXD9cIiArIFFVRVJZJCkgKyBcIj9cIiArIHN1YmV4cChcIlxcXFwjXCIgKyBGUkFHTUVOVCQpICsgXCI/XCIpLFxuICAgICAgICBVUklfUkVGRVJFTkNFJCA9IHN1YmV4cChVUkkkICsgXCJ8XCIgKyBSRUxBVElWRSQpLFxuICAgICAgICBBQlNPTFVURV9VUkkkID0gc3ViZXhwKFNDSEVNRSQgKyBcIlxcXFw6XCIgKyBISUVSX1BBUlQkICsgc3ViZXhwKFwiXFxcXD9cIiArIFFVRVJZJCkgKyBcIj9cIiksXG4gICAgICAgIEdFTkVSSUNfUkVGJCA9IFwiXihcIiArIFNDSEVNRSQgKyBcIilcXFxcOlwiICsgc3ViZXhwKHN1YmV4cChcIlxcXFwvXFxcXC8oXCIgKyBzdWJleHAoXCIoXCIgKyBVU0VSSU5GTyQgKyBcIilAXCIpICsgXCI/KFwiICsgSE9TVCQgKyBcIilcIiArIHN1YmV4cChcIlxcXFw6KFwiICsgUE9SVCQgKyBcIilcIikgKyBcIj8pXCIpICsgXCI/KFwiICsgUEFUSF9BQkVNUFRZJCArIFwifFwiICsgUEFUSF9BQlNPTFVURSQgKyBcInxcIiArIFBBVEhfUk9PVExFU1MkICsgXCJ8XCIgKyBQQVRIX0VNUFRZJCArIFwiKVwiKSArIHN1YmV4cChcIlxcXFw/KFwiICsgUVVFUlkkICsgXCIpXCIpICsgXCI/XCIgKyBzdWJleHAoXCJcXFxcIyhcIiArIEZSQUdNRU5UJCArIFwiKVwiKSArIFwiPyRcIixcbiAgICAgICAgUkVMQVRJVkVfUkVGJCA9IFwiXigpezB9XCIgKyBzdWJleHAoc3ViZXhwKFwiXFxcXC9cXFxcLyhcIiArIHN1YmV4cChcIihcIiArIFVTRVJJTkZPJCArIFwiKUBcIikgKyBcIj8oXCIgKyBIT1NUJCArIFwiKVwiICsgc3ViZXhwKFwiXFxcXDooXCIgKyBQT1JUJCArIFwiKVwiKSArIFwiPylcIikgKyBcIj8oXCIgKyBQQVRIX0FCRU1QVFkkICsgXCJ8XCIgKyBQQVRIX0FCU09MVVRFJCArIFwifFwiICsgUEFUSF9OT1NDSEVNRSQgKyBcInxcIiArIFBBVEhfRU1QVFkkICsgXCIpXCIpICsgc3ViZXhwKFwiXFxcXD8oXCIgKyBRVUVSWSQgKyBcIilcIikgKyBcIj9cIiArIHN1YmV4cChcIlxcXFwjKFwiICsgRlJBR01FTlQkICsgXCIpXCIpICsgXCI/JFwiLFxuICAgICAgICBBQlNPTFVURV9SRUYkID0gXCJeKFwiICsgU0NIRU1FJCArIFwiKVxcXFw6XCIgKyBzdWJleHAoc3ViZXhwKFwiXFxcXC9cXFxcLyhcIiArIHN1YmV4cChcIihcIiArIFVTRVJJTkZPJCArIFwiKUBcIikgKyBcIj8oXCIgKyBIT1NUJCArIFwiKVwiICsgc3ViZXhwKFwiXFxcXDooXCIgKyBQT1JUJCArIFwiKVwiKSArIFwiPylcIikgKyBcIj8oXCIgKyBQQVRIX0FCRU1QVFkkICsgXCJ8XCIgKyBQQVRIX0FCU09MVVRFJCArIFwifFwiICsgUEFUSF9ST09UTEVTUyQgKyBcInxcIiArIFBBVEhfRU1QVFkkICsgXCIpXCIpICsgc3ViZXhwKFwiXFxcXD8oXCIgKyBRVUVSWSQgKyBcIilcIikgKyBcIj8kXCIsXG4gICAgICAgIFNBTUVET0NfUkVGJCA9IFwiXlwiICsgc3ViZXhwKFwiXFxcXCMoXCIgKyBGUkFHTUVOVCQgKyBcIilcIikgKyBcIj8kXCIsXG4gICAgICAgIEFVVEhPUklUWV9SRUYkID0gXCJeXCIgKyBzdWJleHAoXCIoXCIgKyBVU0VSSU5GTyQgKyBcIilAXCIpICsgXCI/KFwiICsgSE9TVCQgKyBcIilcIiArIHN1YmV4cChcIlxcXFw6KFwiICsgUE9SVCQgKyBcIilcIikgKyBcIj8kXCI7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgTk9UX1NDSEVNRTogbmV3IFJlZ0V4cChtZXJnZShcIlteXVwiLCBBTFBIQSQkLCBESUdJVCQkLCBcIltcXFxcK1xcXFwtXFxcXC5dXCIpLCBcImdcIiksXG4gICAgICAgIE5PVF9VU0VSSU5GTzogbmV3IFJlZ0V4cChtZXJnZShcIlteXFxcXCVcXFxcOl1cIiwgVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQpLCBcImdcIiksXG4gICAgICAgIE5PVF9IT1NUOiBuZXcgUmVnRXhwKG1lcmdlKFwiW15cXFxcJVxcXFxbXFxcXF1cXFxcOl1cIiwgVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQpLCBcImdcIiksXG4gICAgICAgIE5PVF9QQVRIOiBuZXcgUmVnRXhwKG1lcmdlKFwiW15cXFxcJVxcXFwvXFxcXDpcXFxcQF1cIiwgVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQpLCBcImdcIiksXG4gICAgICAgIE5PVF9QQVRIX05PU0NIRU1FOiBuZXcgUmVnRXhwKG1lcmdlKFwiW15cXFxcJVxcXFwvXFxcXEBdXCIsIFVOUkVTRVJWRUQkJCwgU1VCX0RFTElNUyQkKSwgXCJnXCIpLFxuICAgICAgICBOT1RfUVVFUlk6IG5ldyBSZWdFeHAobWVyZ2UoXCJbXlxcXFwlXVwiLCBVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCwgXCJbXFxcXDpcXFxcQFxcXFwvXFxcXD9dXCIsIElQUklWQVRFJCQpLCBcImdcIiksXG4gICAgICAgIE5PVF9GUkFHTUVOVDogbmV3IFJlZ0V4cChtZXJnZShcIlteXFxcXCVdXCIsIFVOUkVTRVJWRUQkJCwgU1VCX0RFTElNUyQkLCBcIltcXFxcOlxcXFxAXFxcXC9cXFxcP11cIiksIFwiZ1wiKSxcbiAgICAgICAgRVNDQVBFOiBuZXcgUmVnRXhwKG1lcmdlKFwiW15dXCIsIFVOUkVTRVJWRUQkJCwgU1VCX0RFTElNUyQkKSwgXCJnXCIpLFxuICAgICAgICBVTlJFU0VSVkVEOiBuZXcgUmVnRXhwKFVOUkVTRVJWRUQkJCwgXCJnXCIpLFxuICAgICAgICBPVEhFUl9DSEFSUzogbmV3IFJlZ0V4cChtZXJnZShcIlteXFxcXCVdXCIsIFVOUkVTRVJWRUQkJCwgUkVTRVJWRUQkJCksIFwiZ1wiKSxcbiAgICAgICAgUENUX0VOQ09ERUQ6IG5ldyBSZWdFeHAoUENUX0VOQ09ERUQkLCBcImdcIiksXG4gICAgICAgIElQVjRBRERSRVNTOiBuZXcgUmVnRXhwKFwiXihcIiArIElQVjRBRERSRVNTJCArIFwiKSRcIiksXG4gICAgICAgIElQVjZBRERSRVNTOiBuZXcgUmVnRXhwKFwiXlxcXFxbPyhcIiArIElQVjZBRERSRVNTJCArIFwiKVwiICsgc3ViZXhwKHN1YmV4cChcIlxcXFwlMjV8XFxcXCUoPyFcIiArIEhFWERJRyQkICsgXCJ7Mn0pXCIpICsgXCIoXCIgKyBaT05FSUQkICsgXCIpXCIpICsgXCI/XFxcXF0/JFwiKSAvL1JGQyA2ODc0LCB3aXRoIHJlbGF4ZWQgcGFyc2luZyBydWxlc1xuICAgIH07XG59XG52YXIgVVJJX1BST1RPQ09MID0gYnVpbGRFeHBzKGZhbHNlKTtcblxudmFyIElSSV9QUk9UT0NPTCA9IGJ1aWxkRXhwcyh0cnVlKTtcblxudmFyIHNsaWNlZFRvQXJyYXkgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIHNsaWNlSXRlcmF0b3IoYXJyLCBpKSB7XG4gICAgdmFyIF9hcnIgPSBbXTtcbiAgICB2YXIgX24gPSB0cnVlO1xuICAgIHZhciBfZCA9IGZhbHNlO1xuICAgIHZhciBfZSA9IHVuZGVmaW5lZDtcblxuICAgIHRyeSB7XG4gICAgICBmb3IgKHZhciBfaSA9IGFycltTeW1ib2wuaXRlcmF0b3JdKCksIF9zOyAhKF9uID0gKF9zID0gX2kubmV4dCgpKS5kb25lKTsgX24gPSB0cnVlKSB7XG4gICAgICAgIF9hcnIucHVzaChfcy52YWx1ZSk7XG5cbiAgICAgICAgaWYgKGkgJiYgX2Fyci5sZW5ndGggPT09IGkpIGJyZWFrO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgX2QgPSB0cnVlO1xuICAgICAgX2UgPSBlcnI7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICghX24gJiYgX2lbXCJyZXR1cm5cIl0pIF9pW1wicmV0dXJuXCJdKCk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBpZiAoX2QpIHRocm93IF9lO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBfYXJyO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChhcnIsIGkpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7XG4gICAgICByZXR1cm4gYXJyO1xuICAgIH0gZWxzZSBpZiAoU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdChhcnIpKSB7XG4gICAgICByZXR1cm4gc2xpY2VJdGVyYXRvcihhcnIsIGkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBhdHRlbXB0IHRvIGRlc3RydWN0dXJlIG5vbi1pdGVyYWJsZSBpbnN0YW5jZVwiKTtcbiAgICB9XG4gIH07XG59KCk7XG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cbnZhciB0b0NvbnN1bWFibGVBcnJheSA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkge1xuICAgIGZvciAodmFyIGkgPSAwLCBhcnIyID0gQXJyYXkoYXJyLmxlbmd0aCk7IGkgPCBhcnIubGVuZ3RoOyBpKyspIGFycjJbaV0gPSBhcnJbaV07XG5cbiAgICByZXR1cm4gYXJyMjtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShhcnIpO1xuICB9XG59O1xuXG4vKiogSGlnaGVzdCBwb3NpdGl2ZSBzaWduZWQgMzItYml0IGZsb2F0IHZhbHVlICovXG5cbnZhciBtYXhJbnQgPSAyMTQ3NDgzNjQ3OyAvLyBha2EuIDB4N0ZGRkZGRkYgb3IgMl4zMS0xXG5cbi8qKiBCb290c3RyaW5nIHBhcmFtZXRlcnMgKi9cbnZhciBiYXNlID0gMzY7XG52YXIgdE1pbiA9IDE7XG52YXIgdE1heCA9IDI2O1xudmFyIHNrZXcgPSAzODtcbnZhciBkYW1wID0gNzAwO1xudmFyIGluaXRpYWxCaWFzID0gNzI7XG52YXIgaW5pdGlhbE4gPSAxMjg7IC8vIDB4ODBcbnZhciBkZWxpbWl0ZXIgPSAnLSc7IC8vICdcXHgyRCdcblxuLyoqIFJlZ3VsYXIgZXhwcmVzc2lvbnMgKi9cbnZhciByZWdleFB1bnljb2RlID0gL154bi0tLztcbnZhciByZWdleE5vbkFTQ0lJID0gL1teXFwwLVxceDdFXS87IC8vIG5vbi1BU0NJSSBjaGFyc1xudmFyIHJlZ2V4U2VwYXJhdG9ycyA9IC9bXFx4MkVcXHUzMDAyXFx1RkYwRVxcdUZGNjFdL2c7IC8vIFJGQyAzNDkwIHNlcGFyYXRvcnNcblxuLyoqIEVycm9yIG1lc3NhZ2VzICovXG52YXIgZXJyb3JzID0ge1xuXHQnb3ZlcmZsb3cnOiAnT3ZlcmZsb3c6IGlucHV0IG5lZWRzIHdpZGVyIGludGVnZXJzIHRvIHByb2Nlc3MnLFxuXHQnbm90LWJhc2ljJzogJ0lsbGVnYWwgaW5wdXQgPj0gMHg4MCAobm90IGEgYmFzaWMgY29kZSBwb2ludCknLFxuXHQnaW52YWxpZC1pbnB1dCc6ICdJbnZhbGlkIGlucHV0J1xufTtcblxuLyoqIENvbnZlbmllbmNlIHNob3J0Y3V0cyAqL1xudmFyIGJhc2VNaW51c1RNaW4gPSBiYXNlIC0gdE1pbjtcbnZhciBmbG9vciA9IE1hdGguZmxvb3I7XG52YXIgc3RyaW5nRnJvbUNoYXJDb2RlID0gU3RyaW5nLmZyb21DaGFyQ29kZTtcblxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbi8qKlxuICogQSBnZW5lcmljIGVycm9yIHV0aWxpdHkgZnVuY3Rpb24uXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtTdHJpbmd9IHR5cGUgVGhlIGVycm9yIHR5cGUuXG4gKiBAcmV0dXJucyB7RXJyb3J9IFRocm93cyBhIGBSYW5nZUVycm9yYCB3aXRoIHRoZSBhcHBsaWNhYmxlIGVycm9yIG1lc3NhZ2UuXG4gKi9cbmZ1bmN0aW9uIGVycm9yJDEodHlwZSkge1xuXHR0aHJvdyBuZXcgUmFuZ2VFcnJvcihlcnJvcnNbdHlwZV0pO1xufVxuXG4vKipcbiAqIEEgZ2VuZXJpYyBgQXJyYXkjbWFwYCB1dGlsaXR5IGZ1bmN0aW9uLlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBmb3IgZXZlcnkgYXJyYXlcbiAqIGl0ZW0uXG4gKiBAcmV0dXJucyB7QXJyYXl9IEEgbmV3IGFycmF5IG9mIHZhbHVlcyByZXR1cm5lZCBieSB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIG1hcChhcnJheSwgZm4pIHtcblx0dmFyIHJlc3VsdCA9IFtdO1xuXHR2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuXHR3aGlsZSAobGVuZ3RoLS0pIHtcblx0XHRyZXN1bHRbbGVuZ3RoXSA9IGZuKGFycmF5W2xlbmd0aF0pO1xuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogQSBzaW1wbGUgYEFycmF5I21hcGAtbGlrZSB3cmFwcGVyIHRvIHdvcmsgd2l0aCBkb21haW4gbmFtZSBzdHJpbmdzIG9yIGVtYWlsXG4gKiBhZGRyZXNzZXMuXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgZG9tYWluIG5hbWUgb3IgZW1haWwgYWRkcmVzcy5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGZvciBldmVyeVxuICogY2hhcmFjdGVyLlxuICogQHJldHVybnMge0FycmF5fSBBIG5ldyBzdHJpbmcgb2YgY2hhcmFjdGVycyByZXR1cm5lZCBieSB0aGUgY2FsbGJhY2tcbiAqIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiBtYXBEb21haW4oc3RyaW5nLCBmbikge1xuXHR2YXIgcGFydHMgPSBzdHJpbmcuc3BsaXQoJ0AnKTtcblx0dmFyIHJlc3VsdCA9ICcnO1xuXHRpZiAocGFydHMubGVuZ3RoID4gMSkge1xuXHRcdC8vIEluIGVtYWlsIGFkZHJlc3Nlcywgb25seSB0aGUgZG9tYWluIG5hbWUgc2hvdWxkIGJlIHB1bnljb2RlZC4gTGVhdmVcblx0XHQvLyB0aGUgbG9jYWwgcGFydCAoaS5lLiBldmVyeXRoaW5nIHVwIHRvIGBAYCkgaW50YWN0LlxuXHRcdHJlc3VsdCA9IHBhcnRzWzBdICsgJ0AnO1xuXHRcdHN0cmluZyA9IHBhcnRzWzFdO1xuXHR9XG5cdC8vIEF2b2lkIGBzcGxpdChyZWdleClgIGZvciBJRTggY29tcGF0aWJpbGl0eS4gU2VlICMxNy5cblx0c3RyaW5nID0gc3RyaW5nLnJlcGxhY2UocmVnZXhTZXBhcmF0b3JzLCAnXFx4MkUnKTtcblx0dmFyIGxhYmVscyA9IHN0cmluZy5zcGxpdCgnLicpO1xuXHR2YXIgZW5jb2RlZCA9IG1hcChsYWJlbHMsIGZuKS5qb2luKCcuJyk7XG5cdHJldHVybiByZXN1bHQgKyBlbmNvZGVkO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gYXJyYXkgY29udGFpbmluZyB0aGUgbnVtZXJpYyBjb2RlIHBvaW50cyBvZiBlYWNoIFVuaWNvZGVcbiAqIGNoYXJhY3RlciBpbiB0aGUgc3RyaW5nLiBXaGlsZSBKYXZhU2NyaXB0IHVzZXMgVUNTLTIgaW50ZXJuYWxseSxcbiAqIHRoaXMgZnVuY3Rpb24gd2lsbCBjb252ZXJ0IGEgcGFpciBvZiBzdXJyb2dhdGUgaGFsdmVzIChlYWNoIG9mIHdoaWNoXG4gKiBVQ1MtMiBleHBvc2VzIGFzIHNlcGFyYXRlIGNoYXJhY3RlcnMpIGludG8gYSBzaW5nbGUgY29kZSBwb2ludCxcbiAqIG1hdGNoaW5nIFVURi0xNi5cbiAqIEBzZWUgYHB1bnljb2RlLnVjczIuZW5jb2RlYFxuICogQHNlZSA8aHR0cHM6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmc+XG4gKiBAbWVtYmVyT2YgcHVueWNvZGUudWNzMlxuICogQG5hbWUgZGVjb2RlXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIFRoZSBVbmljb2RlIGlucHV0IHN0cmluZyAoVUNTLTIpLlxuICogQHJldHVybnMge0FycmF5fSBUaGUgbmV3IGFycmF5IG9mIGNvZGUgcG9pbnRzLlxuICovXG5mdW5jdGlvbiB1Y3MyZGVjb2RlKHN0cmluZykge1xuXHR2YXIgb3V0cHV0ID0gW107XG5cdHZhciBjb3VudGVyID0gMDtcblx0dmFyIGxlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG5cdHdoaWxlIChjb3VudGVyIDwgbGVuZ3RoKSB7XG5cdFx0dmFyIHZhbHVlID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRpZiAodmFsdWUgPj0gMHhEODAwICYmIHZhbHVlIDw9IDB4REJGRiAmJiBjb3VudGVyIDwgbGVuZ3RoKSB7XG5cdFx0XHQvLyBJdCdzIGEgaGlnaCBzdXJyb2dhdGUsIGFuZCB0aGVyZSBpcyBhIG5leHQgY2hhcmFjdGVyLlxuXHRcdFx0dmFyIGV4dHJhID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdGlmICgoZXh0cmEgJiAweEZDMDApID09IDB4REMwMCkge1xuXHRcdFx0XHQvLyBMb3cgc3Vycm9nYXRlLlxuXHRcdFx0XHRvdXRwdXQucHVzaCgoKHZhbHVlICYgMHgzRkYpIDw8IDEwKSArIChleHRyYSAmIDB4M0ZGKSArIDB4MTAwMDApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gSXQncyBhbiB1bm1hdGNoZWQgc3Vycm9nYXRlOyBvbmx5IGFwcGVuZCB0aGlzIGNvZGUgdW5pdCwgaW4gY2FzZSB0aGVcblx0XHRcdFx0Ly8gbmV4dCBjb2RlIHVuaXQgaXMgdGhlIGhpZ2ggc3Vycm9nYXRlIG9mIGEgc3Vycm9nYXRlIHBhaXIuXG5cdFx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcblx0XHRcdFx0Y291bnRlci0tO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBvdXRwdXQ7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIHN0cmluZyBiYXNlZCBvbiBhbiBhcnJheSBvZiBudW1lcmljIGNvZGUgcG9pbnRzLlxuICogQHNlZSBgcHVueWNvZGUudWNzMi5kZWNvZGVgXG4gKiBAbWVtYmVyT2YgcHVueWNvZGUudWNzMlxuICogQG5hbWUgZW5jb2RlXG4gKiBAcGFyYW0ge0FycmF5fSBjb2RlUG9pbnRzIFRoZSBhcnJheSBvZiBudW1lcmljIGNvZGUgcG9pbnRzLlxuICogQHJldHVybnMge1N0cmluZ30gVGhlIG5ldyBVbmljb2RlIHN0cmluZyAoVUNTLTIpLlxuICovXG52YXIgdWNzMmVuY29kZSA9IGZ1bmN0aW9uIHVjczJlbmNvZGUoYXJyYXkpIHtcblx0cmV0dXJuIFN0cmluZy5mcm9tQ29kZVBvaW50LmFwcGx5KFN0cmluZywgdG9Db25zdW1hYmxlQXJyYXkoYXJyYXkpKTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgYSBiYXNpYyBjb2RlIHBvaW50IGludG8gYSBkaWdpdC9pbnRlZ2VyLlxuICogQHNlZSBgZGlnaXRUb0Jhc2ljKClgXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtOdW1iZXJ9IGNvZGVQb2ludCBUaGUgYmFzaWMgbnVtZXJpYyBjb2RlIHBvaW50IHZhbHVlLlxuICogQHJldHVybnMge051bWJlcn0gVGhlIG51bWVyaWMgdmFsdWUgb2YgYSBiYXNpYyBjb2RlIHBvaW50IChmb3IgdXNlIGluXG4gKiByZXByZXNlbnRpbmcgaW50ZWdlcnMpIGluIHRoZSByYW5nZSBgMGAgdG8gYGJhc2UgLSAxYCwgb3IgYGJhc2VgIGlmXG4gKiB0aGUgY29kZSBwb2ludCBkb2VzIG5vdCByZXByZXNlbnQgYSB2YWx1ZS5cbiAqL1xudmFyIGJhc2ljVG9EaWdpdCA9IGZ1bmN0aW9uIGJhc2ljVG9EaWdpdChjb2RlUG9pbnQpIHtcblx0aWYgKGNvZGVQb2ludCAtIDB4MzAgPCAweDBBKSB7XG5cdFx0cmV0dXJuIGNvZGVQb2ludCAtIDB4MTY7XG5cdH1cblx0aWYgKGNvZGVQb2ludCAtIDB4NDEgPCAweDFBKSB7XG5cdFx0cmV0dXJuIGNvZGVQb2ludCAtIDB4NDE7XG5cdH1cblx0aWYgKGNvZGVQb2ludCAtIDB4NjEgPCAweDFBKSB7XG5cdFx0cmV0dXJuIGNvZGVQb2ludCAtIDB4NjE7XG5cdH1cblx0cmV0dXJuIGJhc2U7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIGEgZGlnaXQvaW50ZWdlciBpbnRvIGEgYmFzaWMgY29kZSBwb2ludC5cbiAqIEBzZWUgYGJhc2ljVG9EaWdpdCgpYFxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7TnVtYmVyfSBkaWdpdCBUaGUgbnVtZXJpYyB2YWx1ZSBvZiBhIGJhc2ljIGNvZGUgcG9pbnQuXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgYmFzaWMgY29kZSBwb2ludCB3aG9zZSB2YWx1ZSAod2hlbiB1c2VkIGZvclxuICogcmVwcmVzZW50aW5nIGludGVnZXJzKSBpcyBgZGlnaXRgLCB3aGljaCBuZWVkcyB0byBiZSBpbiB0aGUgcmFuZ2VcbiAqIGAwYCB0byBgYmFzZSAtIDFgLiBJZiBgZmxhZ2AgaXMgbm9uLXplcm8sIHRoZSB1cHBlcmNhc2UgZm9ybSBpc1xuICogdXNlZDsgZWxzZSwgdGhlIGxvd2VyY2FzZSBmb3JtIGlzIHVzZWQuIFRoZSBiZWhhdmlvciBpcyB1bmRlZmluZWRcbiAqIGlmIGBmbGFnYCBpcyBub24temVybyBhbmQgYGRpZ2l0YCBoYXMgbm8gdXBwZXJjYXNlIGZvcm0uXG4gKi9cbnZhciBkaWdpdFRvQmFzaWMgPSBmdW5jdGlvbiBkaWdpdFRvQmFzaWMoZGlnaXQsIGZsYWcpIHtcblx0Ly8gIDAuLjI1IG1hcCB0byBBU0NJSSBhLi56IG9yIEEuLlpcblx0Ly8gMjYuLjM1IG1hcCB0byBBU0NJSSAwLi45XG5cdHJldHVybiBkaWdpdCArIDIyICsgNzUgKiAoZGlnaXQgPCAyNikgLSAoKGZsYWcgIT0gMCkgPDwgNSk7XG59O1xuXG4vKipcbiAqIEJpYXMgYWRhcHRhdGlvbiBmdW5jdGlvbiBhcyBwZXIgc2VjdGlvbiAzLjQgb2YgUkZDIDM0OTIuXG4gKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzQ5MiNzZWN0aW9uLTMuNFxuICogQHByaXZhdGVcbiAqL1xudmFyIGFkYXB0ID0gZnVuY3Rpb24gYWRhcHQoZGVsdGEsIG51bVBvaW50cywgZmlyc3RUaW1lKSB7XG5cdHZhciBrID0gMDtcblx0ZGVsdGEgPSBmaXJzdFRpbWUgPyBmbG9vcihkZWx0YSAvIGRhbXApIDogZGVsdGEgPj4gMTtcblx0ZGVsdGEgKz0gZmxvb3IoZGVsdGEgLyBudW1Qb2ludHMpO1xuXHRmb3IgKDsgLyogbm8gaW5pdGlhbGl6YXRpb24gKi9kZWx0YSA+IGJhc2VNaW51c1RNaW4gKiB0TWF4ID4+IDE7IGsgKz0gYmFzZSkge1xuXHRcdGRlbHRhID0gZmxvb3IoZGVsdGEgLyBiYXNlTWludXNUTWluKTtcblx0fVxuXHRyZXR1cm4gZmxvb3IoayArIChiYXNlTWludXNUTWluICsgMSkgKiBkZWx0YSAvIChkZWx0YSArIHNrZXcpKTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzIHRvIGEgc3RyaW5nIG9mIFVuaWNvZGVcbiAqIHN5bWJvbHMuXG4gKiBAbWVtYmVyT2YgcHVueWNvZGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cbiAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZXN1bHRpbmcgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scy5cbiAqL1xudmFyIGRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShpbnB1dCkge1xuXHQvLyBEb24ndCB1c2UgVUNTLTIuXG5cdHZhciBvdXRwdXQgPSBbXTtcblx0dmFyIGlucHV0TGVuZ3RoID0gaW5wdXQubGVuZ3RoO1xuXHR2YXIgaSA9IDA7XG5cdHZhciBuID0gaW5pdGlhbE47XG5cdHZhciBiaWFzID0gaW5pdGlhbEJpYXM7XG5cblx0Ly8gSGFuZGxlIHRoZSBiYXNpYyBjb2RlIHBvaW50czogbGV0IGBiYXNpY2AgYmUgdGhlIG51bWJlciBvZiBpbnB1dCBjb2RlXG5cdC8vIHBvaW50cyBiZWZvcmUgdGhlIGxhc3QgZGVsaW1pdGVyLCBvciBgMGAgaWYgdGhlcmUgaXMgbm9uZSwgdGhlbiBjb3B5XG5cdC8vIHRoZSBmaXJzdCBiYXNpYyBjb2RlIHBvaW50cyB0byB0aGUgb3V0cHV0LlxuXG5cdHZhciBiYXNpYyA9IGlucHV0Lmxhc3RJbmRleE9mKGRlbGltaXRlcik7XG5cdGlmIChiYXNpYyA8IDApIHtcblx0XHRiYXNpYyA9IDA7XG5cdH1cblxuXHRmb3IgKHZhciBqID0gMDsgaiA8IGJhc2ljOyArK2opIHtcblx0XHQvLyBpZiBpdCdzIG5vdCBhIGJhc2ljIGNvZGUgcG9pbnRcblx0XHRpZiAoaW5wdXQuY2hhckNvZGVBdChqKSA+PSAweDgwKSB7XG5cdFx0XHRlcnJvciQxKCdub3QtYmFzaWMnKTtcblx0XHR9XG5cdFx0b3V0cHV0LnB1c2goaW5wdXQuY2hhckNvZGVBdChqKSk7XG5cdH1cblxuXHQvLyBNYWluIGRlY29kaW5nIGxvb3A6IHN0YXJ0IGp1c3QgYWZ0ZXIgdGhlIGxhc3QgZGVsaW1pdGVyIGlmIGFueSBiYXNpYyBjb2RlXG5cdC8vIHBvaW50cyB3ZXJlIGNvcGllZDsgc3RhcnQgYXQgdGhlIGJlZ2lubmluZyBvdGhlcndpc2UuXG5cblx0Zm9yICh2YXIgaW5kZXggPSBiYXNpYyA+IDAgPyBiYXNpYyArIDEgOiAwOyBpbmRleCA8IGlucHV0TGVuZ3RoOykgLyogbm8gZmluYWwgZXhwcmVzc2lvbiAqL3tcblxuXHRcdC8vIGBpbmRleGAgaXMgdGhlIGluZGV4IG9mIHRoZSBuZXh0IGNoYXJhY3RlciB0byBiZSBjb25zdW1lZC5cblx0XHQvLyBEZWNvZGUgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlciBpbnRvIGBkZWx0YWAsXG5cdFx0Ly8gd2hpY2ggZ2V0cyBhZGRlZCB0byBgaWAuIFRoZSBvdmVyZmxvdyBjaGVja2luZyBpcyBlYXNpZXJcblx0XHQvLyBpZiB3ZSBpbmNyZWFzZSBgaWAgYXMgd2UgZ28sIHRoZW4gc3VidHJhY3Qgb2ZmIGl0cyBzdGFydGluZ1xuXHRcdC8vIHZhbHVlIGF0IHRoZSBlbmQgdG8gb2J0YWluIGBkZWx0YWAuXG5cdFx0dmFyIG9sZGkgPSBpO1xuXHRcdGZvciAodmFyIHcgPSAxLCBrID0gYmFzZTs7IC8qIG5vIGNvbmRpdGlvbiAqL2sgKz0gYmFzZSkge1xuXG5cdFx0XHRpZiAoaW5kZXggPj0gaW5wdXRMZW5ndGgpIHtcblx0XHRcdFx0ZXJyb3IkMSgnaW52YWxpZC1pbnB1dCcpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgZGlnaXQgPSBiYXNpY1RvRGlnaXQoaW5wdXQuY2hhckNvZGVBdChpbmRleCsrKSk7XG5cblx0XHRcdGlmIChkaWdpdCA+PSBiYXNlIHx8IGRpZ2l0ID4gZmxvb3IoKG1heEludCAtIGkpIC8gdykpIHtcblx0XHRcdFx0ZXJyb3IkMSgnb3ZlcmZsb3cnKTtcblx0XHRcdH1cblxuXHRcdFx0aSArPSBkaWdpdCAqIHc7XG5cdFx0XHR2YXIgdCA9IGsgPD0gYmlhcyA/IHRNaW4gOiBrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzO1xuXG5cdFx0XHRpZiAoZGlnaXQgPCB0KSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgYmFzZU1pbnVzVCA9IGJhc2UgLSB0O1xuXHRcdFx0aWYgKHcgPiBmbG9vcihtYXhJbnQgLyBiYXNlTWludXNUKSkge1xuXHRcdFx0XHRlcnJvciQxKCdvdmVyZmxvdycpO1xuXHRcdFx0fVxuXG5cdFx0XHR3ICo9IGJhc2VNaW51c1Q7XG5cdFx0fVxuXG5cdFx0dmFyIG91dCA9IG91dHB1dC5sZW5ndGggKyAxO1xuXHRcdGJpYXMgPSBhZGFwdChpIC0gb2xkaSwgb3V0LCBvbGRpID09IDApO1xuXG5cdFx0Ly8gYGlgIHdhcyBzdXBwb3NlZCB0byB3cmFwIGFyb3VuZCBmcm9tIGBvdXRgIHRvIGAwYCxcblx0XHQvLyBpbmNyZW1lbnRpbmcgYG5gIGVhY2ggdGltZSwgc28gd2UnbGwgZml4IHRoYXQgbm93OlxuXHRcdGlmIChmbG9vcihpIC8gb3V0KSA+IG1heEludCAtIG4pIHtcblx0XHRcdGVycm9yJDEoJ292ZXJmbG93Jyk7XG5cdFx0fVxuXG5cdFx0biArPSBmbG9vcihpIC8gb3V0KTtcblx0XHRpICU9IG91dDtcblxuXHRcdC8vIEluc2VydCBgbmAgYXQgcG9zaXRpb24gYGlgIG9mIHRoZSBvdXRwdXQuXG5cdFx0b3V0cHV0LnNwbGljZShpKyssIDAsIG4pO1xuXHR9XG5cblx0cmV0dXJuIFN0cmluZy5mcm9tQ29kZVBvaW50LmFwcGx5KFN0cmluZywgb3V0cHV0KTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgYSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzIChlLmcuIGEgZG9tYWluIG5hbWUgbGFiZWwpIHRvIGFcbiAqIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG4gKiBAbWVtYmVyT2YgcHVueWNvZGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scy5cbiAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZXN1bHRpbmcgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cbiAqL1xudmFyIGVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShpbnB1dCkge1xuXHR2YXIgb3V0cHV0ID0gW107XG5cblx0Ly8gQ29udmVydCB0aGUgaW5wdXQgaW4gVUNTLTIgdG8gYW4gYXJyYXkgb2YgVW5pY29kZSBjb2RlIHBvaW50cy5cblx0aW5wdXQgPSB1Y3MyZGVjb2RlKGlucHV0KTtcblxuXHQvLyBDYWNoZSB0aGUgbGVuZ3RoLlxuXHR2YXIgaW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGg7XG5cblx0Ly8gSW5pdGlhbGl6ZSB0aGUgc3RhdGUuXG5cdHZhciBuID0gaW5pdGlhbE47XG5cdHZhciBkZWx0YSA9IDA7XG5cdHZhciBiaWFzID0gaW5pdGlhbEJpYXM7XG5cblx0Ly8gSGFuZGxlIHRoZSBiYXNpYyBjb2RlIHBvaW50cy5cblx0dmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSB0cnVlO1xuXHR2YXIgX2RpZEl0ZXJhdG9yRXJyb3IgPSBmYWxzZTtcblx0dmFyIF9pdGVyYXRvckVycm9yID0gdW5kZWZpbmVkO1xuXG5cdHRyeSB7XG5cdFx0Zm9yICh2YXIgX2l0ZXJhdG9yID0gaW5wdXRbU3ltYm9sLml0ZXJhdG9yXSgpLCBfc3RlcDsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gKF9zdGVwID0gX2l0ZXJhdG9yLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSB0cnVlKSB7XG5cdFx0XHR2YXIgX2N1cnJlbnRWYWx1ZTIgPSBfc3RlcC52YWx1ZTtcblxuXHRcdFx0aWYgKF9jdXJyZW50VmFsdWUyIDwgMHg4MCkge1xuXHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoX2N1cnJlbnRWYWx1ZTIpKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdF9kaWRJdGVyYXRvckVycm9yID0gdHJ1ZTtcblx0XHRfaXRlcmF0b3JFcnJvciA9IGVycjtcblx0fSBmaW5hbGx5IHtcblx0XHR0cnkge1xuXHRcdFx0aWYgKCFfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uICYmIF9pdGVyYXRvci5yZXR1cm4pIHtcblx0XHRcdFx0X2l0ZXJhdG9yLnJldHVybigpO1xuXHRcdFx0fVxuXHRcdH0gZmluYWxseSB7XG5cdFx0XHRpZiAoX2RpZEl0ZXJhdG9yRXJyb3IpIHtcblx0XHRcdFx0dGhyb3cgX2l0ZXJhdG9yRXJyb3I7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0dmFyIGJhc2ljTGVuZ3RoID0gb3V0cHV0Lmxlbmd0aDtcblx0dmFyIGhhbmRsZWRDUENvdW50ID0gYmFzaWNMZW5ndGg7XG5cblx0Ly8gYGhhbmRsZWRDUENvdW50YCBpcyB0aGUgbnVtYmVyIG9mIGNvZGUgcG9pbnRzIHRoYXQgaGF2ZSBiZWVuIGhhbmRsZWQ7XG5cdC8vIGBiYXNpY0xlbmd0aGAgaXMgdGhlIG51bWJlciBvZiBiYXNpYyBjb2RlIHBvaW50cy5cblxuXHQvLyBGaW5pc2ggdGhlIGJhc2ljIHN0cmluZyB3aXRoIGEgZGVsaW1pdGVyIHVubGVzcyBpdCdzIGVtcHR5LlxuXHRpZiAoYmFzaWNMZW5ndGgpIHtcblx0XHRvdXRwdXQucHVzaChkZWxpbWl0ZXIpO1xuXHR9XG5cblx0Ly8gTWFpbiBlbmNvZGluZyBsb29wOlxuXHR3aGlsZSAoaGFuZGxlZENQQ291bnQgPCBpbnB1dExlbmd0aCkge1xuXG5cdFx0Ly8gQWxsIG5vbi1iYXNpYyBjb2RlIHBvaW50cyA8IG4gaGF2ZSBiZWVuIGhhbmRsZWQgYWxyZWFkeS4gRmluZCB0aGUgbmV4dFxuXHRcdC8vIGxhcmdlciBvbmU6XG5cdFx0dmFyIG0gPSBtYXhJbnQ7XG5cdFx0dmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZTtcblx0XHR2YXIgX2RpZEl0ZXJhdG9yRXJyb3IyID0gZmFsc2U7XG5cdFx0dmFyIF9pdGVyYXRvckVycm9yMiA9IHVuZGVmaW5lZDtcblxuXHRcdHRyeSB7XG5cdFx0XHRmb3IgKHZhciBfaXRlcmF0b3IyID0gaW5wdXRbU3ltYm9sLml0ZXJhdG9yXSgpLCBfc3RlcDI7ICEoX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSAoX3N0ZXAyID0gX2l0ZXJhdG9yMi5uZXh0KCkpLmRvbmUpOyBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IHRydWUpIHtcblx0XHRcdFx0dmFyIGN1cnJlbnRWYWx1ZSA9IF9zdGVwMi52YWx1ZTtcblxuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlID49IG4gJiYgY3VycmVudFZhbHVlIDwgbSkge1xuXHRcdFx0XHRcdG0gPSBjdXJyZW50VmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gSW5jcmVhc2UgYGRlbHRhYCBlbm91Z2ggdG8gYWR2YW5jZSB0aGUgZGVjb2RlcidzIDxuLGk+IHN0YXRlIHRvIDxtLDA+LFxuXHRcdFx0Ly8gYnV0IGd1YXJkIGFnYWluc3Qgb3ZlcmZsb3cuXG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRfZGlkSXRlcmF0b3JFcnJvcjIgPSB0cnVlO1xuXHRcdFx0X2l0ZXJhdG9yRXJyb3IyID0gZXJyO1xuXHRcdH0gZmluYWxseSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yICYmIF9pdGVyYXRvcjIucmV0dXJuKSB7XG5cdFx0XHRcdFx0X2l0ZXJhdG9yMi5yZXR1cm4oKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBmaW5hbGx5IHtcblx0XHRcdFx0aWYgKF9kaWRJdGVyYXRvckVycm9yMikge1xuXHRcdFx0XHRcdHRocm93IF9pdGVyYXRvckVycm9yMjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHZhciBoYW5kbGVkQ1BDb3VudFBsdXNPbmUgPSBoYW5kbGVkQ1BDb3VudCArIDE7XG5cdFx0aWYgKG0gLSBuID4gZmxvb3IoKG1heEludCAtIGRlbHRhKSAvIGhhbmRsZWRDUENvdW50UGx1c09uZSkpIHtcblx0XHRcdGVycm9yJDEoJ292ZXJmbG93Jyk7XG5cdFx0fVxuXG5cdFx0ZGVsdGEgKz0gKG0gLSBuKSAqIGhhbmRsZWRDUENvdW50UGx1c09uZTtcblx0XHRuID0gbTtcblxuXHRcdHZhciBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMyA9IHRydWU7XG5cdFx0dmFyIF9kaWRJdGVyYXRvckVycm9yMyA9IGZhbHNlO1xuXHRcdHZhciBfaXRlcmF0b3JFcnJvcjMgPSB1bmRlZmluZWQ7XG5cblx0XHR0cnkge1xuXHRcdFx0Zm9yICh2YXIgX2l0ZXJhdG9yMyA9IGlucHV0W1N5bWJvbC5pdGVyYXRvcl0oKSwgX3N0ZXAzOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24zID0gKF9zdGVwMyA9IF9pdGVyYXRvcjMubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjMgPSB0cnVlKSB7XG5cdFx0XHRcdHZhciBfY3VycmVudFZhbHVlID0gX3N0ZXAzLnZhbHVlO1xuXG5cdFx0XHRcdGlmIChfY3VycmVudFZhbHVlIDwgbiAmJiArK2RlbHRhID4gbWF4SW50KSB7XG5cdFx0XHRcdFx0ZXJyb3IkMSgnb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoX2N1cnJlbnRWYWx1ZSA9PSBuKSB7XG5cdFx0XHRcdFx0Ly8gUmVwcmVzZW50IGRlbHRhIGFzIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXIuXG5cdFx0XHRcdFx0dmFyIHEgPSBkZWx0YTtcblx0XHRcdFx0XHRmb3IgKHZhciBrID0gYmFzZTs7IC8qIG5vIGNvbmRpdGlvbiAqL2sgKz0gYmFzZSkge1xuXHRcdFx0XHRcdFx0dmFyIHQgPSBrIDw9IGJpYXMgPyB0TWluIDogayA+PSBiaWFzICsgdE1heCA/IHRNYXggOiBrIC0gYmlhcztcblx0XHRcdFx0XHRcdGlmIChxIDwgdCkge1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHZhciBxTWludXNUID0gcSAtIHQ7XG5cdFx0XHRcdFx0XHR2YXIgYmFzZU1pbnVzVCA9IGJhc2UgLSB0O1xuXHRcdFx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGRpZ2l0VG9CYXNpYyh0ICsgcU1pbnVzVCAlIGJhc2VNaW51c1QsIDApKSk7XG5cdFx0XHRcdFx0XHRxID0gZmxvb3IocU1pbnVzVCAvIGJhc2VNaW51c1QpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKHN0cmluZ0Zyb21DaGFyQ29kZShkaWdpdFRvQmFzaWMocSwgMCkpKTtcblx0XHRcdFx0XHRiaWFzID0gYWRhcHQoZGVsdGEsIGhhbmRsZWRDUENvdW50UGx1c09uZSwgaGFuZGxlZENQQ291bnQgPT0gYmFzaWNMZW5ndGgpO1xuXHRcdFx0XHRcdGRlbHRhID0gMDtcblx0XHRcdFx0XHQrK2hhbmRsZWRDUENvdW50O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRfZGlkSXRlcmF0b3JFcnJvcjMgPSB0cnVlO1xuXHRcdFx0X2l0ZXJhdG9yRXJyb3IzID0gZXJyO1xuXHRcdH0gZmluYWxseSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24zICYmIF9pdGVyYXRvcjMucmV0dXJuKSB7XG5cdFx0XHRcdFx0X2l0ZXJhdG9yMy5yZXR1cm4oKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBmaW5hbGx5IHtcblx0XHRcdFx0aWYgKF9kaWRJdGVyYXRvckVycm9yMykge1xuXHRcdFx0XHRcdHRocm93IF9pdGVyYXRvckVycm9yMztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdCsrZGVsdGE7XG5cdFx0KytuO1xuXHR9XG5cdHJldHVybiBvdXRwdXQuam9pbignJyk7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIGEgUHVueWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIG9yIGFuIGVtYWlsIGFkZHJlc3NcbiAqIHRvIFVuaWNvZGUuIE9ubHkgdGhlIFB1bnljb2RlZCBwYXJ0cyBvZiB0aGUgaW5wdXQgd2lsbCBiZSBjb252ZXJ0ZWQsIGkuZS5cbiAqIGl0IGRvZXNuJ3QgbWF0dGVyIGlmIHlvdSBjYWxsIGl0IG9uIGEgc3RyaW5nIHRoYXQgaGFzIGFscmVhZHkgYmVlblxuICogY29udmVydGVkIHRvIFVuaWNvZGUuXG4gKiBAbWVtYmVyT2YgcHVueWNvZGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgUHVueWNvZGVkIGRvbWFpbiBuYW1lIG9yIGVtYWlsIGFkZHJlc3MgdG9cbiAqIGNvbnZlcnQgdG8gVW5pY29kZS5cbiAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBVbmljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBQdW55Y29kZVxuICogc3RyaW5nLlxuICovXG52YXIgdG9Vbmljb2RlID0gZnVuY3Rpb24gdG9Vbmljb2RlKGlucHV0KSB7XG5cdHJldHVybiBtYXBEb21haW4oaW5wdXQsIGZ1bmN0aW9uIChzdHJpbmcpIHtcblx0XHRyZXR1cm4gcmVnZXhQdW55Y29kZS50ZXN0KHN0cmluZykgPyBkZWNvZGUoc3RyaW5nLnNsaWNlKDQpLnRvTG93ZXJDYXNlKCkpIDogc3RyaW5nO1xuXHR9KTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgYSBVbmljb2RlIHN0cmluZyByZXByZXNlbnRpbmcgYSBkb21haW4gbmFtZSBvciBhbiBlbWFpbCBhZGRyZXNzIHRvXG4gKiBQdW55Y29kZS4gT25seSB0aGUgbm9uLUFTQ0lJIHBhcnRzIG9mIHRoZSBkb21haW4gbmFtZSB3aWxsIGJlIGNvbnZlcnRlZCxcbiAqIGkuZS4gaXQgZG9lc24ndCBtYXR0ZXIgaWYgeW91IGNhbGwgaXQgd2l0aCBhIGRvbWFpbiB0aGF0J3MgYWxyZWFkeSBpblxuICogQVNDSUkuXG4gKiBAbWVtYmVyT2YgcHVueWNvZGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgZG9tYWluIG5hbWUgb3IgZW1haWwgYWRkcmVzcyB0byBjb252ZXJ0LCBhcyBhXG4gKiBVbmljb2RlIHN0cmluZy5cbiAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBQdW55Y29kZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZ2l2ZW4gZG9tYWluIG5hbWUgb3JcbiAqIGVtYWlsIGFkZHJlc3MuXG4gKi9cbnZhciB0b0FTQ0lJID0gZnVuY3Rpb24gdG9BU0NJSShpbnB1dCkge1xuXHRyZXR1cm4gbWFwRG9tYWluKGlucHV0LCBmdW5jdGlvbiAoc3RyaW5nKSB7XG5cdFx0cmV0dXJuIHJlZ2V4Tm9uQVNDSUkudGVzdChzdHJpbmcpID8gJ3huLS0nICsgZW5jb2RlKHN0cmluZykgOiBzdHJpbmc7XG5cdH0pO1xufTtcblxuLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbi8qKiBEZWZpbmUgdGhlIHB1YmxpYyBBUEkgKi9cbnZhciBwdW55Y29kZSA9IHtcblx0LyoqXG4gICogQSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBjdXJyZW50IFB1bnljb2RlLmpzIHZlcnNpb24gbnVtYmVyLlxuICAqIEBtZW1iZXJPZiBwdW55Y29kZVxuICAqIEB0eXBlIFN0cmluZ1xuICAqL1xuXHQndmVyc2lvbic6ICcyLjEuMCcsXG5cdC8qKlxuICAqIEFuIG9iamVjdCBvZiBtZXRob2RzIHRvIGNvbnZlcnQgZnJvbSBKYXZhU2NyaXB0J3MgaW50ZXJuYWwgY2hhcmFjdGVyXG4gICogcmVwcmVzZW50YXRpb24gKFVDUy0yKSB0byBVbmljb2RlIGNvZGUgcG9pbnRzLCBhbmQgYmFjay5cbiAgKiBAc2VlIDxodHRwczovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cbiAgKiBAbWVtYmVyT2YgcHVueWNvZGVcbiAgKiBAdHlwZSBPYmplY3RcbiAgKi9cblx0J3VjczInOiB7XG5cdFx0J2RlY29kZSc6IHVjczJkZWNvZGUsXG5cdFx0J2VuY29kZSc6IHVjczJlbmNvZGVcblx0fSxcblx0J2RlY29kZSc6IGRlY29kZSxcblx0J2VuY29kZSc6IGVuY29kZSxcblx0J3RvQVNDSUknOiB0b0FTQ0lJLFxuXHQndG9Vbmljb2RlJzogdG9Vbmljb2RlXG59O1xuXG4vKipcbiAqIFVSSS5qc1xuICpcbiAqIEBmaWxlb3ZlcnZpZXcgQW4gUkZDIDM5ODYgY29tcGxpYW50LCBzY2hlbWUgZXh0ZW5kYWJsZSBVUkkgcGFyc2luZy92YWxpZGF0aW5nL3Jlc29sdmluZyBsaWJyYXJ5IGZvciBKYXZhU2NyaXB0LlxuICogQGF1dGhvciA8YSBocmVmPVwibWFpbHRvOmdhcnkuY291cnRAZ21haWwuY29tXCI+R2FyeSBDb3VydDwvYT5cbiAqIEBzZWUgaHR0cDovL2dpdGh1Yi5jb20vZ2FyeWNvdXJ0L3VyaS1qc1xuICovXG4vKipcbiAqIENvcHlyaWdodCAyMDExIEdhcnkgQ291cnQuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogUmVkaXN0cmlidXRpb24gYW5kIHVzZSBpbiBzb3VyY2UgYW5kIGJpbmFyeSBmb3Jtcywgd2l0aCBvciB3aXRob3V0IG1vZGlmaWNhdGlvbiwgYXJlXG4gKiBwZXJtaXR0ZWQgcHJvdmlkZWQgdGhhdCB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnMgYXJlIG1ldDpcbiAqXG4gKiAgICAxLiBSZWRpc3RyaWJ1dGlvbnMgb2Ygc291cmNlIGNvZGUgbXVzdCByZXRhaW4gdGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UsIHRoaXMgbGlzdCBvZlxuICogICAgICAgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyLlxuICpcbiAqICAgIDIuIFJlZGlzdHJpYnV0aW9ucyBpbiBiaW5hcnkgZm9ybSBtdXN0IHJlcHJvZHVjZSB0aGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSwgdGhpcyBsaXN0XG4gKiAgICAgICBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlIGRvY3VtZW50YXRpb24gYW5kL29yIG90aGVyIG1hdGVyaWFsc1xuICogICAgICAgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuICpcbiAqIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgR0FSWSBDT1VSVCBgYEFTIElTJycgQU5EIEFOWSBFWFBSRVNTIE9SIElNUExJRURcbiAqIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBUSEUgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSBBTkRcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFSRSBESVNDTEFJTUVELiBJTiBOTyBFVkVOVCBTSEFMTCBHQVJZIENPVVJUIE9SXG4gKiBDT05UUklCVVRPUlMgQkUgTElBQkxFIEZPUiBBTlkgRElSRUNULCBJTkRJUkVDVCwgSU5DSURFTlRBTCwgU1BFQ0lBTCwgRVhFTVBMQVJZLCBPUlxuICogQ09OU0VRVUVOVElBTCBEQU1BR0VTIChJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgUFJPQ1VSRU1FTlQgT0YgU1VCU1RJVFVURSBHT09EUyBPUlxuICogU0VSVklDRVM7IExPU1MgT0YgVVNFLCBEQVRBLCBPUiBQUk9GSVRTOyBPUiBCVVNJTkVTUyBJTlRFUlJVUFRJT04pIEhPV0VWRVIgQ0FVU0VEIEFORCBPTlxuICogQU5ZIFRIRU9SWSBPRiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQ09OVFJBQ1QsIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlQgKElOQ0xVRElOR1xuICogTkVHTElHRU5DRSBPUiBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRiBUSElTIFNPRlRXQVJFLCBFVkVOIElGXG4gKiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbiAqXG4gKiBUaGUgdmlld3MgYW5kIGNvbmNsdXNpb25zIGNvbnRhaW5lZCBpbiB0aGUgc29mdHdhcmUgYW5kIGRvY3VtZW50YXRpb24gYXJlIHRob3NlIG9mIHRoZVxuICogYXV0aG9ycyBhbmQgc2hvdWxkIG5vdCBiZSBpbnRlcnByZXRlZCBhcyByZXByZXNlbnRpbmcgb2ZmaWNpYWwgcG9saWNpZXMsIGVpdGhlciBleHByZXNzZWRcbiAqIG9yIGltcGxpZWQsIG9mIEdhcnkgQ291cnQuXG4gKi9cbnZhciBTQ0hFTUVTID0ge307XG5mdW5jdGlvbiBwY3RFbmNDaGFyKGNocikge1xuICAgIHZhciBjID0gY2hyLmNoYXJDb2RlQXQoMCk7XG4gICAgdmFyIGUgPSB2b2lkIDA7XG4gICAgaWYgKGMgPCAxNikgZSA9IFwiJTBcIiArIGMudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7ZWxzZSBpZiAoYyA8IDEyOCkgZSA9IFwiJVwiICsgYy50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTtlbHNlIGlmIChjIDwgMjA0OCkgZSA9IFwiJVwiICsgKGMgPj4gNiB8IDE5MikudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkgKyBcIiVcIiArIChjICYgNjMgfCAxMjgpLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO2Vsc2UgZSA9IFwiJVwiICsgKGMgPj4gMTIgfCAyMjQpLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpICsgXCIlXCIgKyAoYyA+PiA2ICYgNjMgfCAxMjgpLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpICsgXCIlXCIgKyAoYyAmIDYzIHwgMTI4KS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTtcbiAgICByZXR1cm4gZTtcbn1cbmZ1bmN0aW9uIHBjdERlY0NoYXJzKHN0cikge1xuICAgIHZhciBuZXdTdHIgPSBcIlwiO1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgaWwgPSBzdHIubGVuZ3RoO1xuICAgIHdoaWxlIChpIDwgaWwpIHtcbiAgICAgICAgdmFyIGMgPSBwYXJzZUludChzdHIuc3Vic3RyKGkgKyAxLCAyKSwgMTYpO1xuICAgICAgICBpZiAoYyA8IDEyOCkge1xuICAgICAgICAgICAgbmV3U3RyICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYyk7XG4gICAgICAgICAgICBpICs9IDM7XG4gICAgICAgIH0gZWxzZSBpZiAoYyA+PSAxOTQgJiYgYyA8IDIyNCkge1xuICAgICAgICAgICAgaWYgKGlsIC0gaSA+PSA2KSB7XG4gICAgICAgICAgICAgICAgdmFyIGMyID0gcGFyc2VJbnQoc3RyLnN1YnN0cihpICsgNCwgMiksIDE2KTtcbiAgICAgICAgICAgICAgICBuZXdTdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgoYyAmIDMxKSA8PCA2IHwgYzIgJiA2Myk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld1N0ciArPSBzdHIuc3Vic3RyKGksIDYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaSArPSA2O1xuICAgICAgICB9IGVsc2UgaWYgKGMgPj0gMjI0KSB7XG4gICAgICAgICAgICBpZiAoaWwgLSBpID49IDkpIHtcbiAgICAgICAgICAgICAgICB2YXIgX2MgPSBwYXJzZUludChzdHIuc3Vic3RyKGkgKyA0LCAyKSwgMTYpO1xuICAgICAgICAgICAgICAgIHZhciBjMyA9IHBhcnNlSW50KHN0ci5zdWJzdHIoaSArIDcsIDIpLCAxNik7XG4gICAgICAgICAgICAgICAgbmV3U3RyICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoKGMgJiAxNSkgPDwgMTIgfCAoX2MgJiA2MykgPDwgNiB8IGMzICYgNjMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXdTdHIgKz0gc3RyLnN1YnN0cihpLCA5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkgKz0gOTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ld1N0ciArPSBzdHIuc3Vic3RyKGksIDMpO1xuICAgICAgICAgICAgaSArPSAzO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXdTdHI7XG59XG5mdW5jdGlvbiBfbm9ybWFsaXplQ29tcG9uZW50RW5jb2RpbmcoY29tcG9uZW50cywgcHJvdG9jb2wpIHtcbiAgICBmdW5jdGlvbiBkZWNvZGVVbnJlc2VydmVkKHN0cikge1xuICAgICAgICB2YXIgZGVjU3RyID0gcGN0RGVjQ2hhcnMoc3RyKTtcbiAgICAgICAgcmV0dXJuICFkZWNTdHIubWF0Y2gocHJvdG9jb2wuVU5SRVNFUlZFRCkgPyBzdHIgOiBkZWNTdHI7XG4gICAgfVxuICAgIGlmIChjb21wb25lbnRzLnNjaGVtZSkgY29tcG9uZW50cy5zY2hlbWUgPSBTdHJpbmcoY29tcG9uZW50cy5zY2hlbWUpLnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIGRlY29kZVVucmVzZXJ2ZWQpLnRvTG93ZXJDYXNlKCkucmVwbGFjZShwcm90b2NvbC5OT1RfU0NIRU1FLCBcIlwiKTtcbiAgICBpZiAoY29tcG9uZW50cy51c2VyaW5mbyAhPT0gdW5kZWZpbmVkKSBjb21wb25lbnRzLnVzZXJpbmZvID0gU3RyaW5nKGNvbXBvbmVudHMudXNlcmluZm8pLnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIGRlY29kZVVucmVzZXJ2ZWQpLnJlcGxhY2UocHJvdG9jb2wuTk9UX1VTRVJJTkZPLCBwY3RFbmNDaGFyKS5yZXBsYWNlKHByb3RvY29sLlBDVF9FTkNPREVELCB0b1VwcGVyQ2FzZSk7XG4gICAgaWYgKGNvbXBvbmVudHMuaG9zdCAhPT0gdW5kZWZpbmVkKSBjb21wb25lbnRzLmhvc3QgPSBTdHJpbmcoY29tcG9uZW50cy5ob3N0KS5yZXBsYWNlKHByb3RvY29sLlBDVF9FTkNPREVELCBkZWNvZGVVbnJlc2VydmVkKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UocHJvdG9jb2wuTk9UX0hPU1QsIHBjdEVuY0NoYXIpLnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIHRvVXBwZXJDYXNlKTtcbiAgICBpZiAoY29tcG9uZW50cy5wYXRoICE9PSB1bmRlZmluZWQpIGNvbXBvbmVudHMucGF0aCA9IFN0cmluZyhjb21wb25lbnRzLnBhdGgpLnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIGRlY29kZVVucmVzZXJ2ZWQpLnJlcGxhY2UoY29tcG9uZW50cy5zY2hlbWUgPyBwcm90b2NvbC5OT1RfUEFUSCA6IHByb3RvY29sLk5PVF9QQVRIX05PU0NIRU1FLCBwY3RFbmNDaGFyKS5yZXBsYWNlKHByb3RvY29sLlBDVF9FTkNPREVELCB0b1VwcGVyQ2FzZSk7XG4gICAgaWYgKGNvbXBvbmVudHMucXVlcnkgIT09IHVuZGVmaW5lZCkgY29tcG9uZW50cy5xdWVyeSA9IFN0cmluZyhjb21wb25lbnRzLnF1ZXJ5KS5yZXBsYWNlKHByb3RvY29sLlBDVF9FTkNPREVELCBkZWNvZGVVbnJlc2VydmVkKS5yZXBsYWNlKHByb3RvY29sLk5PVF9RVUVSWSwgcGN0RW5jQ2hhcikucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgdG9VcHBlckNhc2UpO1xuICAgIGlmIChjb21wb25lbnRzLmZyYWdtZW50ICE9PSB1bmRlZmluZWQpIGNvbXBvbmVudHMuZnJhZ21lbnQgPSBTdHJpbmcoY29tcG9uZW50cy5mcmFnbWVudCkucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgZGVjb2RlVW5yZXNlcnZlZCkucmVwbGFjZShwcm90b2NvbC5OT1RfRlJBR01FTlQsIHBjdEVuY0NoYXIpLnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIHRvVXBwZXJDYXNlKTtcbiAgICByZXR1cm4gY29tcG9uZW50cztcbn1cblxuZnVuY3Rpb24gX3N0cmlwTGVhZGluZ1plcm9zKHN0cikge1xuICAgIHJldHVybiBzdHIucmVwbGFjZSgvXjAqKC4qKS8sIFwiJDFcIikgfHwgXCIwXCI7XG59XG5mdW5jdGlvbiBfbm9ybWFsaXplSVB2NChob3N0LCBwcm90b2NvbCkge1xuICAgIHZhciBtYXRjaGVzID0gaG9zdC5tYXRjaChwcm90b2NvbC5JUFY0QUREUkVTUykgfHwgW107XG5cbiAgICB2YXIgX21hdGNoZXMgPSBzbGljZWRUb0FycmF5KG1hdGNoZXMsIDIpLFxuICAgICAgICBhZGRyZXNzID0gX21hdGNoZXNbMV07XG5cbiAgICBpZiAoYWRkcmVzcykge1xuICAgICAgICByZXR1cm4gYWRkcmVzcy5zcGxpdChcIi5cIikubWFwKF9zdHJpcExlYWRpbmdaZXJvcykuam9pbihcIi5cIik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxufVxuZnVuY3Rpb24gX25vcm1hbGl6ZUlQdjYoaG9zdCwgcHJvdG9jb2wpIHtcbiAgICB2YXIgbWF0Y2hlcyA9IGhvc3QubWF0Y2gocHJvdG9jb2wuSVBWNkFERFJFU1MpIHx8IFtdO1xuXG4gICAgdmFyIF9tYXRjaGVzMiA9IHNsaWNlZFRvQXJyYXkobWF0Y2hlcywgMyksXG4gICAgICAgIGFkZHJlc3MgPSBfbWF0Y2hlczJbMV0sXG4gICAgICAgIHpvbmUgPSBfbWF0Y2hlczJbMl07XG5cbiAgICBpZiAoYWRkcmVzcykge1xuICAgICAgICB2YXIgX2FkZHJlc3MkdG9Mb3dlckNhc2UkID0gYWRkcmVzcy50b0xvd2VyQ2FzZSgpLnNwbGl0KCc6OicpLnJldmVyc2UoKSxcbiAgICAgICAgICAgIF9hZGRyZXNzJHRvTG93ZXJDYXNlJDIgPSBzbGljZWRUb0FycmF5KF9hZGRyZXNzJHRvTG93ZXJDYXNlJCwgMiksXG4gICAgICAgICAgICBsYXN0ID0gX2FkZHJlc3MkdG9Mb3dlckNhc2UkMlswXSxcbiAgICAgICAgICAgIGZpcnN0ID0gX2FkZHJlc3MkdG9Mb3dlckNhc2UkMlsxXTtcblxuICAgICAgICB2YXIgZmlyc3RGaWVsZHMgPSBmaXJzdCA/IGZpcnN0LnNwbGl0KFwiOlwiKS5tYXAoX3N0cmlwTGVhZGluZ1plcm9zKSA6IFtdO1xuICAgICAgICB2YXIgbGFzdEZpZWxkcyA9IGxhc3Quc3BsaXQoXCI6XCIpLm1hcChfc3RyaXBMZWFkaW5nWmVyb3MpO1xuICAgICAgICB2YXIgaXNMYXN0RmllbGRJUHY0QWRkcmVzcyA9IHByb3RvY29sLklQVjRBRERSRVNTLnRlc3QobGFzdEZpZWxkc1tsYXN0RmllbGRzLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgdmFyIGZpZWxkQ291bnQgPSBpc0xhc3RGaWVsZElQdjRBZGRyZXNzID8gNyA6IDg7XG4gICAgICAgIHZhciBsYXN0RmllbGRzU3RhcnQgPSBsYXN0RmllbGRzLmxlbmd0aCAtIGZpZWxkQ291bnQ7XG4gICAgICAgIHZhciBmaWVsZHMgPSBBcnJheShmaWVsZENvdW50KTtcbiAgICAgICAgZm9yICh2YXIgeCA9IDA7IHggPCBmaWVsZENvdW50OyArK3gpIHtcbiAgICAgICAgICAgIGZpZWxkc1t4XSA9IGZpcnN0RmllbGRzW3hdIHx8IGxhc3RGaWVsZHNbbGFzdEZpZWxkc1N0YXJ0ICsgeF0gfHwgJyc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzTGFzdEZpZWxkSVB2NEFkZHJlc3MpIHtcbiAgICAgICAgICAgIGZpZWxkc1tmaWVsZENvdW50IC0gMV0gPSBfbm9ybWFsaXplSVB2NChmaWVsZHNbZmllbGRDb3VudCAtIDFdLCBwcm90b2NvbCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFsbFplcm9GaWVsZHMgPSBmaWVsZHMucmVkdWNlKGZ1bmN0aW9uIChhY2MsIGZpZWxkLCBpbmRleCkge1xuICAgICAgICAgICAgaWYgKCFmaWVsZCB8fCBmaWVsZCA9PT0gXCIwXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgbGFzdExvbmdlc3QgPSBhY2NbYWNjLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIGlmIChsYXN0TG9uZ2VzdCAmJiBsYXN0TG9uZ2VzdC5pbmRleCArIGxhc3RMb25nZXN0Lmxlbmd0aCA9PT0gaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgbGFzdExvbmdlc3QubGVuZ3RoKys7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYWNjLnB1c2goeyBpbmRleDogaW5kZXgsIGxlbmd0aDogMSB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LCBbXSk7XG4gICAgICAgIHZhciBsb25nZXN0WmVyb0ZpZWxkcyA9IGFsbFplcm9GaWVsZHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIGIubGVuZ3RoIC0gYS5sZW5ndGg7XG4gICAgICAgIH0pWzBdO1xuICAgICAgICB2YXIgbmV3SG9zdCA9IHZvaWQgMDtcbiAgICAgICAgaWYgKGxvbmdlc3RaZXJvRmllbGRzICYmIGxvbmdlc3RaZXJvRmllbGRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHZhciBuZXdGaXJzdCA9IGZpZWxkcy5zbGljZSgwLCBsb25nZXN0WmVyb0ZpZWxkcy5pbmRleCk7XG4gICAgICAgICAgICB2YXIgbmV3TGFzdCA9IGZpZWxkcy5zbGljZShsb25nZXN0WmVyb0ZpZWxkcy5pbmRleCArIGxvbmdlc3RaZXJvRmllbGRzLmxlbmd0aCk7XG4gICAgICAgICAgICBuZXdIb3N0ID0gbmV3Rmlyc3Quam9pbihcIjpcIikgKyBcIjo6XCIgKyBuZXdMYXN0LmpvaW4oXCI6XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3SG9zdCA9IGZpZWxkcy5qb2luKFwiOlwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoem9uZSkge1xuICAgICAgICAgICAgbmV3SG9zdCArPSBcIiVcIiArIHpvbmU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld0hvc3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxufVxudmFyIFVSSV9QQVJTRSA9IC9eKD86KFteOlxcLz8jXSspOik/KD86XFwvXFwvKCg/OihbXlxcLz8jQF0qKUApPyhcXFtbXlxcLz8jXFxdXStcXF18W15cXC8/IzpdKikoPzpcXDooXFxkKikpPykpPyhbXj8jXSopKD86XFw/KFteI10qKSk/KD86IygoPzoufFxcbnxcXHIpKikpPy9pO1xudmFyIE5PX01BVENIX0lTX1VOREVGSU5FRCA9IFwiXCIubWF0Y2goLygpezB9LylbMV0gPT09IHVuZGVmaW5lZDtcbmZ1bmN0aW9uIHBhcnNlKHVyaVN0cmluZykge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiB7fTtcblxuICAgIHZhciBjb21wb25lbnRzID0ge307XG4gICAgdmFyIHByb3RvY29sID0gb3B0aW9ucy5pcmkgIT09IGZhbHNlID8gSVJJX1BST1RPQ09MIDogVVJJX1BST1RPQ09MO1xuICAgIGlmIChvcHRpb25zLnJlZmVyZW5jZSA9PT0gXCJzdWZmaXhcIikgdXJpU3RyaW5nID0gKG9wdGlvbnMuc2NoZW1lID8gb3B0aW9ucy5zY2hlbWUgKyBcIjpcIiA6IFwiXCIpICsgXCIvL1wiICsgdXJpU3RyaW5nO1xuICAgIHZhciBtYXRjaGVzID0gdXJpU3RyaW5nLm1hdGNoKFVSSV9QQVJTRSk7XG4gICAgaWYgKG1hdGNoZXMpIHtcbiAgICAgICAgaWYgKE5PX01BVENIX0lTX1VOREVGSU5FRCkge1xuICAgICAgICAgICAgLy9zdG9yZSBlYWNoIGNvbXBvbmVudFxuICAgICAgICAgICAgY29tcG9uZW50cy5zY2hlbWUgPSBtYXRjaGVzWzFdO1xuICAgICAgICAgICAgY29tcG9uZW50cy51c2VyaW5mbyA9IG1hdGNoZXNbM107XG4gICAgICAgICAgICBjb21wb25lbnRzLmhvc3QgPSBtYXRjaGVzWzRdO1xuICAgICAgICAgICAgY29tcG9uZW50cy5wb3J0ID0gcGFyc2VJbnQobWF0Y2hlc1s1XSwgMTApO1xuICAgICAgICAgICAgY29tcG9uZW50cy5wYXRoID0gbWF0Y2hlc1s2XSB8fCBcIlwiO1xuICAgICAgICAgICAgY29tcG9uZW50cy5xdWVyeSA9IG1hdGNoZXNbN107XG4gICAgICAgICAgICBjb21wb25lbnRzLmZyYWdtZW50ID0gbWF0Y2hlc1s4XTtcbiAgICAgICAgICAgIC8vZml4IHBvcnQgbnVtYmVyXG4gICAgICAgICAgICBpZiAoaXNOYU4oY29tcG9uZW50cy5wb3J0KSkge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudHMucG9ydCA9IG1hdGNoZXNbNV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL0lFIEZJWCBmb3IgaW1wcm9wZXIgUmVnRXhwIG1hdGNoaW5nXG4gICAgICAgICAgICAvL3N0b3JlIGVhY2ggY29tcG9uZW50XG4gICAgICAgICAgICBjb21wb25lbnRzLnNjaGVtZSA9IG1hdGNoZXNbMV0gfHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgY29tcG9uZW50cy51c2VyaW5mbyA9IHVyaVN0cmluZy5pbmRleE9mKFwiQFwiKSAhPT0gLTEgPyBtYXRjaGVzWzNdIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgY29tcG9uZW50cy5ob3N0ID0gdXJpU3RyaW5nLmluZGV4T2YoXCIvL1wiKSAhPT0gLTEgPyBtYXRjaGVzWzRdIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgY29tcG9uZW50cy5wb3J0ID0gcGFyc2VJbnQobWF0Y2hlc1s1XSwgMTApO1xuICAgICAgICAgICAgY29tcG9uZW50cy5wYXRoID0gbWF0Y2hlc1s2XSB8fCBcIlwiO1xuICAgICAgICAgICAgY29tcG9uZW50cy5xdWVyeSA9IHVyaVN0cmluZy5pbmRleE9mKFwiP1wiKSAhPT0gLTEgPyBtYXRjaGVzWzddIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgY29tcG9uZW50cy5mcmFnbWVudCA9IHVyaVN0cmluZy5pbmRleE9mKFwiI1wiKSAhPT0gLTEgPyBtYXRjaGVzWzhdIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgLy9maXggcG9ydCBudW1iZXJcbiAgICAgICAgICAgIGlmIChpc05hTihjb21wb25lbnRzLnBvcnQpKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50cy5wb3J0ID0gdXJpU3RyaW5nLm1hdGNoKC9cXC9cXC8oPzoufFxcbikqXFw6KD86XFwvfFxcP3xcXCN8JCkvKSA/IG1hdGNoZXNbNF0gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbXBvbmVudHMuaG9zdCkge1xuICAgICAgICAgICAgLy9ub3JtYWxpemUgSVAgaG9zdHNcbiAgICAgICAgICAgIGNvbXBvbmVudHMuaG9zdCA9IF9ub3JtYWxpemVJUHY2KF9ub3JtYWxpemVJUHY0KGNvbXBvbmVudHMuaG9zdCwgcHJvdG9jb2wpLCBwcm90b2NvbCk7XG4gICAgICAgIH1cbiAgICAgICAgLy9kZXRlcm1pbmUgcmVmZXJlbmNlIHR5cGVcbiAgICAgICAgaWYgKGNvbXBvbmVudHMuc2NoZW1lID09PSB1bmRlZmluZWQgJiYgY29tcG9uZW50cy51c2VyaW5mbyA9PT0gdW5kZWZpbmVkICYmIGNvbXBvbmVudHMuaG9zdCA9PT0gdW5kZWZpbmVkICYmIGNvbXBvbmVudHMucG9ydCA9PT0gdW5kZWZpbmVkICYmICFjb21wb25lbnRzLnBhdGggJiYgY29tcG9uZW50cy5xdWVyeSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb21wb25lbnRzLnJlZmVyZW5jZSA9IFwic2FtZS1kb2N1bWVudFwiO1xuICAgICAgICB9IGVsc2UgaWYgKGNvbXBvbmVudHMuc2NoZW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucmVmZXJlbmNlID0gXCJyZWxhdGl2ZVwiO1xuICAgICAgICB9IGVsc2UgaWYgKGNvbXBvbmVudHMuZnJhZ21lbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29tcG9uZW50cy5yZWZlcmVuY2UgPSBcImFic29sdXRlXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb21wb25lbnRzLnJlZmVyZW5jZSA9IFwidXJpXCI7XG4gICAgICAgIH1cbiAgICAgICAgLy9jaGVjayBmb3IgcmVmZXJlbmNlIGVycm9yc1xuICAgICAgICBpZiAob3B0aW9ucy5yZWZlcmVuY2UgJiYgb3B0aW9ucy5yZWZlcmVuY2UgIT09IFwic3VmZml4XCIgJiYgb3B0aW9ucy5yZWZlcmVuY2UgIT09IGNvbXBvbmVudHMucmVmZXJlbmNlKSB7XG4gICAgICAgICAgICBjb21wb25lbnRzLmVycm9yID0gY29tcG9uZW50cy5lcnJvciB8fCBcIlVSSSBpcyBub3QgYSBcIiArIG9wdGlvbnMucmVmZXJlbmNlICsgXCIgcmVmZXJlbmNlLlwiO1xuICAgICAgICB9XG4gICAgICAgIC8vZmluZCBzY2hlbWUgaGFuZGxlclxuICAgICAgICB2YXIgc2NoZW1lSGFuZGxlciA9IFNDSEVNRVNbKG9wdGlvbnMuc2NoZW1lIHx8IGNvbXBvbmVudHMuc2NoZW1lIHx8IFwiXCIpLnRvTG93ZXJDYXNlKCldO1xuICAgICAgICAvL2NoZWNrIGlmIHNjaGVtZSBjYW4ndCBoYW5kbGUgSVJJc1xuICAgICAgICBpZiAoIW9wdGlvbnMudW5pY29kZVN1cHBvcnQgJiYgKCFzY2hlbWVIYW5kbGVyIHx8ICFzY2hlbWVIYW5kbGVyLnVuaWNvZGVTdXBwb3J0KSkge1xuICAgICAgICAgICAgLy9pZiBob3N0IGNvbXBvbmVudCBpcyBhIGRvbWFpbiBuYW1lXG4gICAgICAgICAgICBpZiAoY29tcG9uZW50cy5ob3N0ICYmIChvcHRpb25zLmRvbWFpbkhvc3QgfHwgc2NoZW1lSGFuZGxlciAmJiBzY2hlbWVIYW5kbGVyLmRvbWFpbkhvc3QpKSB7XG4gICAgICAgICAgICAgICAgLy9jb252ZXJ0IFVuaWNvZGUgSUROIC0+IEFTQ0lJIElETlxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHMuaG9zdCA9IHB1bnljb2RlLnRvQVNDSUkoY29tcG9uZW50cy5ob3N0LnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIHBjdERlY0NoYXJzKS50b0xvd2VyQ2FzZSgpKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHMuZXJyb3IgPSBjb21wb25lbnRzLmVycm9yIHx8IFwiSG9zdCdzIGRvbWFpbiBuYW1lIGNhbiBub3QgYmUgY29udmVydGVkIHRvIEFTQ0lJIHZpYSBwdW55Y29kZTogXCIgKyBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vY29udmVydCBJUkkgLT4gVVJJXG4gICAgICAgICAgICBfbm9ybWFsaXplQ29tcG9uZW50RW5jb2RpbmcoY29tcG9uZW50cywgVVJJX1BST1RPQ09MKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vbm9ybWFsaXplIGVuY29kaW5nc1xuICAgICAgICAgICAgX25vcm1hbGl6ZUNvbXBvbmVudEVuY29kaW5nKGNvbXBvbmVudHMsIHByb3RvY29sKTtcbiAgICAgICAgfVxuICAgICAgICAvL3BlcmZvcm0gc2NoZW1lIHNwZWNpZmljIHBhcnNpbmdcbiAgICAgICAgaWYgKHNjaGVtZUhhbmRsZXIgJiYgc2NoZW1lSGFuZGxlci5wYXJzZSkge1xuICAgICAgICAgICAgc2NoZW1lSGFuZGxlci5wYXJzZShjb21wb25lbnRzLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBvbmVudHMuZXJyb3IgPSBjb21wb25lbnRzLmVycm9yIHx8IFwiVVJJIGNhbiBub3QgYmUgcGFyc2VkLlwiO1xuICAgIH1cbiAgICByZXR1cm4gY29tcG9uZW50cztcbn1cblxuZnVuY3Rpb24gX3JlY29tcG9zZUF1dGhvcml0eShjb21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgdmFyIHByb3RvY29sID0gb3B0aW9ucy5pcmkgIT09IGZhbHNlID8gSVJJX1BST1RPQ09MIDogVVJJX1BST1RPQ09MO1xuICAgIHZhciB1cmlUb2tlbnMgPSBbXTtcbiAgICBpZiAoY29tcG9uZW50cy51c2VyaW5mbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKGNvbXBvbmVudHMudXNlcmluZm8pO1xuICAgICAgICB1cmlUb2tlbnMucHVzaChcIkBcIik7XG4gICAgfVxuICAgIGlmIChjb21wb25lbnRzLmhvc3QgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvL25vcm1hbGl6ZSBJUCBob3N0cywgYWRkIGJyYWNrZXRzIGFuZCBlc2NhcGUgem9uZSBzZXBhcmF0b3IgZm9yIElQdjZcbiAgICAgICAgdXJpVG9rZW5zLnB1c2goX25vcm1hbGl6ZUlQdjYoX25vcm1hbGl6ZUlQdjQoU3RyaW5nKGNvbXBvbmVudHMuaG9zdCksIHByb3RvY29sKSwgcHJvdG9jb2wpLnJlcGxhY2UocHJvdG9jb2wuSVBWNkFERFJFU1MsIGZ1bmN0aW9uIChfLCAkMSwgJDIpIHtcbiAgICAgICAgICAgIHJldHVybiBcIltcIiArICQxICsgKCQyID8gXCIlMjVcIiArICQyIDogXCJcIikgKyBcIl1cIjtcbiAgICAgICAgfSkpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGNvbXBvbmVudHMucG9ydCA9PT0gXCJudW1iZXJcIiB8fCB0eXBlb2YgY29tcG9uZW50cy5wb3J0ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKFwiOlwiKTtcbiAgICAgICAgdXJpVG9rZW5zLnB1c2goU3RyaW5nKGNvbXBvbmVudHMucG9ydCkpO1xuICAgIH1cbiAgICByZXR1cm4gdXJpVG9rZW5zLmxlbmd0aCA/IHVyaVRva2Vucy5qb2luKFwiXCIpIDogdW5kZWZpbmVkO1xufVxuXG52YXIgUkRTMSA9IC9eXFwuXFwuP1xcLy87XG52YXIgUkRTMiA9IC9eXFwvXFwuKFxcL3wkKS87XG52YXIgUkRTMyA9IC9eXFwvXFwuXFwuKFxcL3wkKS87XG52YXIgUkRTNSA9IC9eXFwvPyg/Oi58XFxuKSo/KD89XFwvfCQpLztcbmZ1bmN0aW9uIHJlbW92ZURvdFNlZ21lbnRzKGlucHV0KSB7XG4gICAgdmFyIG91dHB1dCA9IFtdO1xuICAgIHdoaWxlIChpbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgaWYgKGlucHV0Lm1hdGNoKFJEUzEpKSB7XG4gICAgICAgICAgICBpbnB1dCA9IGlucHV0LnJlcGxhY2UoUkRTMSwgXCJcIik7XG4gICAgICAgIH0gZWxzZSBpZiAoaW5wdXQubWF0Y2goUkRTMikpIHtcbiAgICAgICAgICAgIGlucHV0ID0gaW5wdXQucmVwbGFjZShSRFMyLCBcIi9cIik7XG4gICAgICAgIH0gZWxzZSBpZiAoaW5wdXQubWF0Y2goUkRTMykpIHtcbiAgICAgICAgICAgIGlucHV0ID0gaW5wdXQucmVwbGFjZShSRFMzLCBcIi9cIik7XG4gICAgICAgICAgICBvdXRwdXQucG9wKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW5wdXQgPT09IFwiLlwiIHx8IGlucHV0ID09PSBcIi4uXCIpIHtcbiAgICAgICAgICAgIGlucHV0ID0gXCJcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBpbSA9IGlucHV0Lm1hdGNoKFJEUzUpO1xuICAgICAgICAgICAgaWYgKGltKSB7XG4gICAgICAgICAgICAgICAgdmFyIHMgPSBpbVswXTtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IGlucHV0LnNsaWNlKHMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5leHBlY3RlZCBkb3Qgc2VnbWVudCBjb25kaXRpb25cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dC5qb2luKFwiXCIpO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemUoY29tcG9uZW50cykge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiB7fTtcblxuICAgIHZhciBwcm90b2NvbCA9IG9wdGlvbnMuaXJpID8gSVJJX1BST1RPQ09MIDogVVJJX1BST1RPQ09MO1xuICAgIHZhciB1cmlUb2tlbnMgPSBbXTtcbiAgICAvL2ZpbmQgc2NoZW1lIGhhbmRsZXJcbiAgICB2YXIgc2NoZW1lSGFuZGxlciA9IFNDSEVNRVNbKG9wdGlvbnMuc2NoZW1lIHx8IGNvbXBvbmVudHMuc2NoZW1lIHx8IFwiXCIpLnRvTG93ZXJDYXNlKCldO1xuICAgIC8vcGVyZm9ybSBzY2hlbWUgc3BlY2lmaWMgc2VyaWFsaXphdGlvblxuICAgIGlmIChzY2hlbWVIYW5kbGVyICYmIHNjaGVtZUhhbmRsZXIuc2VyaWFsaXplKSBzY2hlbWVIYW5kbGVyLnNlcmlhbGl6ZShjb21wb25lbnRzLCBvcHRpb25zKTtcbiAgICBpZiAoY29tcG9uZW50cy5ob3N0KSB7XG4gICAgICAgIC8vaWYgaG9zdCBjb21wb25lbnQgaXMgYW4gSVB2NiBhZGRyZXNzXG4gICAgICAgIGlmIChwcm90b2NvbC5JUFY2QUREUkVTUy50ZXN0KGNvbXBvbmVudHMuaG9zdCkpIHt9XG4gICAgICAgIC8vVE9ETzogbm9ybWFsaXplIElQdjYgYWRkcmVzcyBhcyBwZXIgUkZDIDU5NTJcblxuICAgICAgICAvL2lmIGhvc3QgY29tcG9uZW50IGlzIGEgZG9tYWluIG5hbWVcbiAgICAgICAgZWxzZSBpZiAob3B0aW9ucy5kb21haW5Ib3N0IHx8IHNjaGVtZUhhbmRsZXIgJiYgc2NoZW1lSGFuZGxlci5kb21haW5Ib3N0KSB7XG4gICAgICAgICAgICAgICAgLy9jb252ZXJ0IElETiB2aWEgcHVueWNvZGVcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzLmhvc3QgPSAhb3B0aW9ucy5pcmkgPyBwdW55Y29kZS50b0FTQ0lJKGNvbXBvbmVudHMuaG9zdC5yZXBsYWNlKHByb3RvY29sLlBDVF9FTkNPREVELCBwY3REZWNDaGFycykudG9Mb3dlckNhc2UoKSkgOiBwdW55Y29kZS50b1VuaWNvZGUoY29tcG9uZW50cy5ob3N0KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHMuZXJyb3IgPSBjb21wb25lbnRzLmVycm9yIHx8IFwiSG9zdCdzIGRvbWFpbiBuYW1lIGNhbiBub3QgYmUgY29udmVydGVkIHRvIFwiICsgKCFvcHRpb25zLmlyaSA/IFwiQVNDSUlcIiA6IFwiVW5pY29kZVwiKSArIFwiIHZpYSBwdW55Y29kZTogXCIgKyBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICB9XG4gICAgLy9ub3JtYWxpemUgZW5jb2RpbmdcbiAgICBfbm9ybWFsaXplQ29tcG9uZW50RW5jb2RpbmcoY29tcG9uZW50cywgcHJvdG9jb2wpO1xuICAgIGlmIChvcHRpb25zLnJlZmVyZW5jZSAhPT0gXCJzdWZmaXhcIiAmJiBjb21wb25lbnRzLnNjaGVtZSkge1xuICAgICAgICB1cmlUb2tlbnMucHVzaChjb21wb25lbnRzLnNjaGVtZSk7XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKFwiOlwiKTtcbiAgICB9XG4gICAgdmFyIGF1dGhvcml0eSA9IF9yZWNvbXBvc2VBdXRob3JpdHkoY29tcG9uZW50cywgb3B0aW9ucyk7XG4gICAgaWYgKGF1dGhvcml0eSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChvcHRpb25zLnJlZmVyZW5jZSAhPT0gXCJzdWZmaXhcIikge1xuICAgICAgICAgICAgdXJpVG9rZW5zLnB1c2goXCIvL1wiKTtcbiAgICAgICAgfVxuICAgICAgICB1cmlUb2tlbnMucHVzaChhdXRob3JpdHkpO1xuICAgICAgICBpZiAoY29tcG9uZW50cy5wYXRoICYmIGNvbXBvbmVudHMucGF0aC5jaGFyQXQoMCkgIT09IFwiL1wiKSB7XG4gICAgICAgICAgICB1cmlUb2tlbnMucHVzaChcIi9cIik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNvbXBvbmVudHMucGF0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZhciBzID0gY29tcG9uZW50cy5wYXRoO1xuICAgICAgICBpZiAoIW9wdGlvbnMuYWJzb2x1dGVQYXRoICYmICghc2NoZW1lSGFuZGxlciB8fCAhc2NoZW1lSGFuZGxlci5hYnNvbHV0ZVBhdGgpKSB7XG4gICAgICAgICAgICBzID0gcmVtb3ZlRG90U2VnbWVudHMocyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF1dGhvcml0eSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzID0gcy5yZXBsYWNlKC9eXFwvXFwvLywgXCIvJTJGXCIpOyAvL2Rvbid0IGFsbG93IHRoZSBwYXRoIHRvIHN0YXJ0IHdpdGggXCIvL1wiXG4gICAgICAgIH1cbiAgICAgICAgdXJpVG9rZW5zLnB1c2gocyk7XG4gICAgfVxuICAgIGlmIChjb21wb25lbnRzLnF1ZXJ5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdXJpVG9rZW5zLnB1c2goXCI/XCIpO1xuICAgICAgICB1cmlUb2tlbnMucHVzaChjb21wb25lbnRzLnF1ZXJ5KTtcbiAgICB9XG4gICAgaWYgKGNvbXBvbmVudHMuZnJhZ21lbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB1cmlUb2tlbnMucHVzaChcIiNcIik7XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKGNvbXBvbmVudHMuZnJhZ21lbnQpO1xuICAgIH1cbiAgICByZXR1cm4gdXJpVG9rZW5zLmpvaW4oXCJcIik7IC8vbWVyZ2UgdG9rZW5zIGludG8gYSBzdHJpbmdcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZUNvbXBvbmVudHMoYmFzZSwgcmVsYXRpdmUpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDoge307XG4gICAgdmFyIHNraXBOb3JtYWxpemF0aW9uID0gYXJndW1lbnRzWzNdO1xuXG4gICAgdmFyIHRhcmdldCA9IHt9O1xuICAgIGlmICghc2tpcE5vcm1hbGl6YXRpb24pIHtcbiAgICAgICAgYmFzZSA9IHBhcnNlKHNlcmlhbGl6ZShiYXNlLCBvcHRpb25zKSwgb3B0aW9ucyk7IC8vbm9ybWFsaXplIGJhc2UgY29tcG9uZW50c1xuICAgICAgICByZWxhdGl2ZSA9IHBhcnNlKHNlcmlhbGl6ZShyZWxhdGl2ZSwgb3B0aW9ucyksIG9wdGlvbnMpOyAvL25vcm1hbGl6ZSByZWxhdGl2ZSBjb21wb25lbnRzXG4gICAgfVxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIGlmICghb3B0aW9ucy50b2xlcmFudCAmJiByZWxhdGl2ZS5zY2hlbWUpIHtcbiAgICAgICAgdGFyZ2V0LnNjaGVtZSA9IHJlbGF0aXZlLnNjaGVtZTtcbiAgICAgICAgLy90YXJnZXQuYXV0aG9yaXR5ID0gcmVsYXRpdmUuYXV0aG9yaXR5O1xuICAgICAgICB0YXJnZXQudXNlcmluZm8gPSByZWxhdGl2ZS51c2VyaW5mbztcbiAgICAgICAgdGFyZ2V0Lmhvc3QgPSByZWxhdGl2ZS5ob3N0O1xuICAgICAgICB0YXJnZXQucG9ydCA9IHJlbGF0aXZlLnBvcnQ7XG4gICAgICAgIHRhcmdldC5wYXRoID0gcmVtb3ZlRG90U2VnbWVudHMocmVsYXRpdmUucGF0aCB8fCBcIlwiKTtcbiAgICAgICAgdGFyZ2V0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHJlbGF0aXZlLnVzZXJpbmZvICE9PSB1bmRlZmluZWQgfHwgcmVsYXRpdmUuaG9zdCAhPT0gdW5kZWZpbmVkIHx8IHJlbGF0aXZlLnBvcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy90YXJnZXQuYXV0aG9yaXR5ID0gcmVsYXRpdmUuYXV0aG9yaXR5O1xuICAgICAgICAgICAgdGFyZ2V0LnVzZXJpbmZvID0gcmVsYXRpdmUudXNlcmluZm87XG4gICAgICAgICAgICB0YXJnZXQuaG9zdCA9IHJlbGF0aXZlLmhvc3Q7XG4gICAgICAgICAgICB0YXJnZXQucG9ydCA9IHJlbGF0aXZlLnBvcnQ7XG4gICAgICAgICAgICB0YXJnZXQucGF0aCA9IHJlbW92ZURvdFNlZ21lbnRzKHJlbGF0aXZlLnBhdGggfHwgXCJcIik7XG4gICAgICAgICAgICB0YXJnZXQucXVlcnkgPSByZWxhdGl2ZS5xdWVyeTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghcmVsYXRpdmUucGF0aCkge1xuICAgICAgICAgICAgICAgIHRhcmdldC5wYXRoID0gYmFzZS5wYXRoO1xuICAgICAgICAgICAgICAgIGlmIChyZWxhdGl2ZS5xdWVyeSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5xdWVyeSA9IGJhc2UucXVlcnk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAocmVsYXRpdmUucGF0aC5jaGFyQXQoMCkgPT09IFwiL1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5wYXRoID0gcmVtb3ZlRG90U2VnbWVudHMocmVsYXRpdmUucGF0aCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChiYXNlLnVzZXJpbmZvICE9PSB1bmRlZmluZWQgfHwgYmFzZS5ob3N0ICE9PSB1bmRlZmluZWQgfHwgYmFzZS5wb3J0ICE9PSB1bmRlZmluZWQpICYmICFiYXNlLnBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5wYXRoID0gXCIvXCIgKyByZWxhdGl2ZS5wYXRoO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFiYXNlLnBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5wYXRoID0gcmVsYXRpdmUucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5wYXRoID0gYmFzZS5wYXRoLnNsaWNlKDAsIGJhc2UucGF0aC5sYXN0SW5kZXhPZihcIi9cIikgKyAxKSArIHJlbGF0aXZlLnBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnBhdGggPSByZW1vdmVEb3RTZWdtZW50cyh0YXJnZXQucGF0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRhcmdldC5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy90YXJnZXQuYXV0aG9yaXR5ID0gYmFzZS5hdXRob3JpdHk7XG4gICAgICAgICAgICB0YXJnZXQudXNlcmluZm8gPSBiYXNlLnVzZXJpbmZvO1xuICAgICAgICAgICAgdGFyZ2V0Lmhvc3QgPSBiYXNlLmhvc3Q7XG4gICAgICAgICAgICB0YXJnZXQucG9ydCA9IGJhc2UucG9ydDtcbiAgICAgICAgfVxuICAgICAgICB0YXJnZXQuc2NoZW1lID0gYmFzZS5zY2hlbWU7XG4gICAgfVxuICAgIHRhcmdldC5mcmFnbWVudCA9IHJlbGF0aXZlLmZyYWdtZW50O1xuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmUoYmFzZVVSSSwgcmVsYXRpdmVVUkksIG9wdGlvbnMpIHtcbiAgICB2YXIgc2NoZW1lbGVzc09wdGlvbnMgPSBhc3NpZ24oeyBzY2hlbWU6ICdudWxsJyB9LCBvcHRpb25zKTtcbiAgICByZXR1cm4gc2VyaWFsaXplKHJlc29sdmVDb21wb25lbnRzKHBhcnNlKGJhc2VVUkksIHNjaGVtZWxlc3NPcHRpb25zKSwgcGFyc2UocmVsYXRpdmVVUkksIHNjaGVtZWxlc3NPcHRpb25zKSwgc2NoZW1lbGVzc09wdGlvbnMsIHRydWUpLCBzY2hlbWVsZXNzT3B0aW9ucyk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZSh1cmksIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIHVyaSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICB1cmkgPSBzZXJpYWxpemUocGFyc2UodXJpLCBvcHRpb25zKSwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmICh0eXBlT2YodXJpKSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICB1cmkgPSBwYXJzZShzZXJpYWxpemUodXJpLCBvcHRpb25zKSwgb3B0aW9ucyk7XG4gICAgfVxuICAgIHJldHVybiB1cmk7XG59XG5cbmZ1bmN0aW9uIGVxdWFsKHVyaUEsIHVyaUIsIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIHVyaUEgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgdXJpQSA9IHNlcmlhbGl6ZShwYXJzZSh1cmlBLCBvcHRpb25zKSwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmICh0eXBlT2YodXJpQSkgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgdXJpQSA9IHNlcmlhbGl6ZSh1cmlBLCBvcHRpb25zKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB1cmlCID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHVyaUIgPSBzZXJpYWxpemUocGFyc2UodXJpQiwgb3B0aW9ucyksIG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAodHlwZU9mKHVyaUIpID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHVyaUIgPSBzZXJpYWxpemUodXJpQiwgb3B0aW9ucyk7XG4gICAgfVxuICAgIHJldHVybiB1cmlBID09PSB1cmlCO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVDb21wb25lbnQoc3RyLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIHN0ciAmJiBzdHIudG9TdHJpbmcoKS5yZXBsYWNlKCFvcHRpb25zIHx8ICFvcHRpb25zLmlyaSA/IFVSSV9QUk9UT0NPTC5FU0NBUEUgOiBJUklfUFJPVE9DT0wuRVNDQVBFLCBwY3RFbmNDaGFyKTtcbn1cblxuZnVuY3Rpb24gdW5lc2NhcGVDb21wb25lbnQoc3RyLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIHN0ciAmJiBzdHIudG9TdHJpbmcoKS5yZXBsYWNlKCFvcHRpb25zIHx8ICFvcHRpb25zLmlyaSA/IFVSSV9QUk9UT0NPTC5QQ1RfRU5DT0RFRCA6IElSSV9QUk9UT0NPTC5QQ1RfRU5DT0RFRCwgcGN0RGVjQ2hhcnMpO1xufVxuXG52YXIgaGFuZGxlciA9IHtcbiAgICBzY2hlbWU6IFwiaHR0cFwiLFxuICAgIGRvbWFpbkhvc3Q6IHRydWUsXG4gICAgcGFyc2U6IGZ1bmN0aW9uIHBhcnNlKGNvbXBvbmVudHMsIG9wdGlvbnMpIHtcbiAgICAgICAgLy9yZXBvcnQgbWlzc2luZyBob3N0XG4gICAgICAgIGlmICghY29tcG9uZW50cy5ob3N0KSB7XG4gICAgICAgICAgICBjb21wb25lbnRzLmVycm9yID0gY29tcG9uZW50cy5lcnJvciB8fCBcIkhUVFAgVVJJcyBtdXN0IGhhdmUgYSBob3N0LlwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb21wb25lbnRzO1xuICAgIH0sXG4gICAgc2VyaWFsaXplOiBmdW5jdGlvbiBzZXJpYWxpemUoY29tcG9uZW50cywgb3B0aW9ucykge1xuICAgICAgICB2YXIgc2VjdXJlID0gU3RyaW5nKGNvbXBvbmVudHMuc2NoZW1lKS50b0xvd2VyQ2FzZSgpID09PSBcImh0dHBzXCI7XG4gICAgICAgIC8vbm9ybWFsaXplIHRoZSBkZWZhdWx0IHBvcnRcbiAgICAgICAgaWYgKGNvbXBvbmVudHMucG9ydCA9PT0gKHNlY3VyZSA/IDQ0MyA6IDgwKSB8fCBjb21wb25lbnRzLnBvcnQgPT09IFwiXCIpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucG9ydCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICAvL25vcm1hbGl6ZSB0aGUgZW1wdHkgcGF0aFxuICAgICAgICBpZiAoIWNvbXBvbmVudHMucGF0aCkge1xuICAgICAgICAgICAgY29tcG9uZW50cy5wYXRoID0gXCIvXCI7XG4gICAgICAgIH1cbiAgICAgICAgLy9OT1RFOiBXZSBkbyBub3QgcGFyc2UgcXVlcnkgc3RyaW5ncyBmb3IgSFRUUCBVUklzXG4gICAgICAgIC8vYXMgV1dXIEZvcm0gVXJsIEVuY29kZWQgcXVlcnkgc3RyaW5ncyBhcmUgcGFydCBvZiB0aGUgSFRNTDQrIHNwZWMsXG4gICAgICAgIC8vYW5kIG5vdCB0aGUgSFRUUCBzcGVjLlxuICAgICAgICByZXR1cm4gY29tcG9uZW50cztcbiAgICB9XG59O1xuXG52YXIgaGFuZGxlciQxID0ge1xuICAgIHNjaGVtZTogXCJodHRwc1wiLFxuICAgIGRvbWFpbkhvc3Q6IGhhbmRsZXIuZG9tYWluSG9zdCxcbiAgICBwYXJzZTogaGFuZGxlci5wYXJzZSxcbiAgICBzZXJpYWxpemU6IGhhbmRsZXIuc2VyaWFsaXplXG59O1xuXG5mdW5jdGlvbiBpc1NlY3VyZSh3c0NvbXBvbmVudHMpIHtcbiAgICByZXR1cm4gdHlwZW9mIHdzQ29tcG9uZW50cy5zZWN1cmUgPT09ICdib29sZWFuJyA/IHdzQ29tcG9uZW50cy5zZWN1cmUgOiBTdHJpbmcod3NDb21wb25lbnRzLnNjaGVtZSkudG9Mb3dlckNhc2UoKSA9PT0gXCJ3c3NcIjtcbn1cbi8vUkZDIDY0NTVcbnZhciBoYW5kbGVyJDIgPSB7XG4gICAgc2NoZW1lOiBcIndzXCIsXG4gICAgZG9tYWluSG9zdDogdHJ1ZSxcbiAgICBwYXJzZTogZnVuY3Rpb24gcGFyc2UoY29tcG9uZW50cywgb3B0aW9ucykge1xuICAgICAgICB2YXIgd3NDb21wb25lbnRzID0gY29tcG9uZW50cztcbiAgICAgICAgLy9pbmRpY2F0ZSBpZiB0aGUgc2VjdXJlIGZsYWcgaXMgc2V0XG4gICAgICAgIHdzQ29tcG9uZW50cy5zZWN1cmUgPSBpc1NlY3VyZSh3c0NvbXBvbmVudHMpO1xuICAgICAgICAvL2NvbnN0cnVjdCByZXNvdWNlIG5hbWVcbiAgICAgICAgd3NDb21wb25lbnRzLnJlc291cmNlTmFtZSA9ICh3c0NvbXBvbmVudHMucGF0aCB8fCAnLycpICsgKHdzQ29tcG9uZW50cy5xdWVyeSA/ICc/JyArIHdzQ29tcG9uZW50cy5xdWVyeSA6ICcnKTtcbiAgICAgICAgd3NDb21wb25lbnRzLnBhdGggPSB1bmRlZmluZWQ7XG4gICAgICAgIHdzQ29tcG9uZW50cy5xdWVyeSA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHdzQ29tcG9uZW50cztcbiAgICB9LFxuICAgIHNlcmlhbGl6ZTogZnVuY3Rpb24gc2VyaWFsaXplKHdzQ29tcG9uZW50cywgb3B0aW9ucykge1xuICAgICAgICAvL25vcm1hbGl6ZSB0aGUgZGVmYXVsdCBwb3J0XG4gICAgICAgIGlmICh3c0NvbXBvbmVudHMucG9ydCA9PT0gKGlzU2VjdXJlKHdzQ29tcG9uZW50cykgPyA0NDMgOiA4MCkgfHwgd3NDb21wb25lbnRzLnBvcnQgPT09IFwiXCIpIHtcbiAgICAgICAgICAgIHdzQ29tcG9uZW50cy5wb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIC8vZW5zdXJlIHNjaGVtZSBtYXRjaGVzIHNlY3VyZSBmbGFnXG4gICAgICAgIGlmICh0eXBlb2Ygd3NDb21wb25lbnRzLnNlY3VyZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICB3c0NvbXBvbmVudHMuc2NoZW1lID0gd3NDb21wb25lbnRzLnNlY3VyZSA/ICd3c3MnIDogJ3dzJztcbiAgICAgICAgICAgIHdzQ29tcG9uZW50cy5zZWN1cmUgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy9yZWNvbnN0cnVjdCBwYXRoIGZyb20gcmVzb3VyY2UgbmFtZVxuICAgICAgICBpZiAod3NDb21wb25lbnRzLnJlc291cmNlTmFtZSkge1xuICAgICAgICAgICAgdmFyIF93c0NvbXBvbmVudHMkcmVzb3VyYyA9IHdzQ29tcG9uZW50cy5yZXNvdXJjZU5hbWUuc3BsaXQoJz8nKSxcbiAgICAgICAgICAgICAgICBfd3NDb21wb25lbnRzJHJlc291cmMyID0gc2xpY2VkVG9BcnJheShfd3NDb21wb25lbnRzJHJlc291cmMsIDIpLFxuICAgICAgICAgICAgICAgIHBhdGggPSBfd3NDb21wb25lbnRzJHJlc291cmMyWzBdLFxuICAgICAgICAgICAgICAgIHF1ZXJ5ID0gX3dzQ29tcG9uZW50cyRyZXNvdXJjMlsxXTtcblxuICAgICAgICAgICAgd3NDb21wb25lbnRzLnBhdGggPSBwYXRoICYmIHBhdGggIT09ICcvJyA/IHBhdGggOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB3c0NvbXBvbmVudHMucXVlcnkgPSBxdWVyeTtcbiAgICAgICAgICAgIHdzQ29tcG9uZW50cy5yZXNvdXJjZU5hbWUgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy9mb3JiaWQgZnJhZ21lbnQgY29tcG9uZW50XG4gICAgICAgIHdzQ29tcG9uZW50cy5mcmFnbWVudCA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHdzQ29tcG9uZW50cztcbiAgICB9XG59O1xuXG52YXIgaGFuZGxlciQzID0ge1xuICAgIHNjaGVtZTogXCJ3c3NcIixcbiAgICBkb21haW5Ib3N0OiBoYW5kbGVyJDIuZG9tYWluSG9zdCxcbiAgICBwYXJzZTogaGFuZGxlciQyLnBhcnNlLFxuICAgIHNlcmlhbGl6ZTogaGFuZGxlciQyLnNlcmlhbGl6ZVxufTtcblxudmFyIE8gPSB7fTtcbnZhciBpc0lSSSA9IHRydWU7XG4vL1JGQyAzOTg2XG52YXIgVU5SRVNFUlZFRCQkID0gXCJbQS1aYS16MC05XFxcXC1cXFxcLlxcXFxfXFxcXH5cIiArIChpc0lSSSA/IFwiXFxcXHhBMC1cXFxcdTIwMERcXFxcdTIwMTAtXFxcXHUyMDI5XFxcXHUyMDJGLVxcXFx1RDdGRlxcXFx1RjkwMC1cXFxcdUZEQ0ZcXFxcdUZERjAtXFxcXHVGRkVGXCIgOiBcIlwiKSArIFwiXVwiO1xudmFyIEhFWERJRyQkID0gXCJbMC05QS1GYS1mXVwiOyAvL2Nhc2UtaW5zZW5zaXRpdmVcbnZhciBQQ1RfRU5DT0RFRCQgPSBzdWJleHAoc3ViZXhwKFwiJVtFRmVmXVwiICsgSEVYRElHJCQgKyBcIiVcIiArIEhFWERJRyQkICsgSEVYRElHJCQgKyBcIiVcIiArIEhFWERJRyQkICsgSEVYRElHJCQpICsgXCJ8XCIgKyBzdWJleHAoXCIlWzg5QS1GYS1mXVwiICsgSEVYRElHJCQgKyBcIiVcIiArIEhFWERJRyQkICsgSEVYRElHJCQpICsgXCJ8XCIgKyBzdWJleHAoXCIlXCIgKyBIRVhESUckJCArIEhFWERJRyQkKSk7IC8vZXhwYW5kZWRcbi8vUkZDIDUzMjIsIGV4Y2VwdCB0aGVzZSBzeW1ib2xzIGFzIHBlciBSRkMgNjA2ODogQCA6IC8gPyAjIFsgXSAmIDsgPVxuLy9jb25zdCBBVEVYVCQkID0gXCJbQS1aYS16MC05XFxcXCFcXFxcI1xcXFwkXFxcXCVcXFxcJlxcXFwnXFxcXCpcXFxcK1xcXFwtXFxcXC9cXFxcPVxcXFw/XFxcXF5cXFxcX1xcXFxgXFxcXHtcXFxcfFxcXFx9XFxcXH5dXCI7XG4vL2NvbnN0IFdTUCQkID0gXCJbXFxcXHgyMFxcXFx4MDldXCI7XG4vL2NvbnN0IE9CU19RVEVYVCQkID0gXCJbXFxcXHgwMS1cXFxceDA4XFxcXHgwQlxcXFx4MENcXFxceDBFLVxcXFx4MUZcXFxceDdGXVwiOyAgLy8oJWQxLTggLyAlZDExLTEyIC8gJWQxNC0zMSAvICVkMTI3KVxuLy9jb25zdCBRVEVYVCQkID0gbWVyZ2UoXCJbXFxcXHgyMVxcXFx4MjMtXFxcXHg1QlxcXFx4NUQtXFxcXHg3RV1cIiwgT0JTX1FURVhUJCQpOyAgLy8lZDMzIC8gJWQzNS05MSAvICVkOTMtMTI2IC8gb2JzLXF0ZXh0XG4vL2NvbnN0IFZDSEFSJCQgPSBcIltcXFxceDIxLVxcXFx4N0VdXCI7XG4vL2NvbnN0IFdTUCQkID0gXCJbXFxcXHgyMFxcXFx4MDldXCI7XG4vL2NvbnN0IE9CU19RUCQgPSBzdWJleHAoXCJcXFxcXFxcXFwiICsgbWVyZ2UoXCJbXFxcXHgwMFxcXFx4MERcXFxceDBBXVwiLCBPQlNfUVRFWFQkJCkpOyAgLy8lZDAgLyBDUiAvIExGIC8gb2JzLXF0ZXh0XG4vL2NvbnN0IEZXUyQgPSBzdWJleHAoc3ViZXhwKFdTUCQkICsgXCIqXCIgKyBcIlxcXFx4MERcXFxceDBBXCIpICsgXCI/XCIgKyBXU1AkJCArIFwiK1wiKTtcbi8vY29uc3QgUVVPVEVEX1BBSVIkID0gc3ViZXhwKHN1YmV4cChcIlxcXFxcXFxcXCIgKyBzdWJleHAoVkNIQVIkJCArIFwifFwiICsgV1NQJCQpKSArIFwifFwiICsgT0JTX1FQJCk7XG4vL2NvbnN0IFFVT1RFRF9TVFJJTkckID0gc3ViZXhwKCdcXFxcXCInICsgc3ViZXhwKEZXUyQgKyBcIj9cIiArIFFDT05URU5UJCkgKyBcIipcIiArIEZXUyQgKyBcIj9cIiArICdcXFxcXCInKTtcbnZhciBBVEVYVCQkID0gXCJbQS1aYS16MC05XFxcXCFcXFxcJFxcXFwlXFxcXCdcXFxcKlxcXFwrXFxcXC1cXFxcXlxcXFxfXFxcXGBcXFxce1xcXFx8XFxcXH1cXFxcfl1cIjtcbnZhciBRVEVYVCQkID0gXCJbXFxcXCFcXFxcJFxcXFwlXFxcXCdcXFxcKFxcXFwpXFxcXCpcXFxcK1xcXFwsXFxcXC1cXFxcLjAtOVxcXFw8XFxcXD5BLVpcXFxceDVFLVxcXFx4N0VdXCI7XG52YXIgVkNIQVIkJCA9IG1lcmdlKFFURVhUJCQsIFwiW1xcXFxcXFwiXFxcXFxcXFxdXCIpO1xudmFyIFNPTUVfREVMSU1TJCQgPSBcIltcXFxcIVxcXFwkXFxcXCdcXFxcKFxcXFwpXFxcXCpcXFxcK1xcXFwsXFxcXDtcXFxcOlxcXFxAXVwiO1xudmFyIFVOUkVTRVJWRUQgPSBuZXcgUmVnRXhwKFVOUkVTRVJWRUQkJCwgXCJnXCIpO1xudmFyIFBDVF9FTkNPREVEID0gbmV3IFJlZ0V4cChQQ1RfRU5DT0RFRCQsIFwiZ1wiKTtcbnZhciBOT1RfTE9DQUxfUEFSVCA9IG5ldyBSZWdFeHAobWVyZ2UoXCJbXl1cIiwgQVRFWFQkJCwgXCJbXFxcXC5dXCIsICdbXFxcXFwiXScsIFZDSEFSJCQpLCBcImdcIik7XG52YXIgTk9UX0hGTkFNRSA9IG5ldyBSZWdFeHAobWVyZ2UoXCJbXl1cIiwgVU5SRVNFUlZFRCQkLCBTT01FX0RFTElNUyQkKSwgXCJnXCIpO1xudmFyIE5PVF9IRlZBTFVFID0gTk9UX0hGTkFNRTtcbmZ1bmN0aW9uIGRlY29kZVVucmVzZXJ2ZWQoc3RyKSB7XG4gICAgdmFyIGRlY1N0ciA9IHBjdERlY0NoYXJzKHN0cik7XG4gICAgcmV0dXJuICFkZWNTdHIubWF0Y2goVU5SRVNFUlZFRCkgPyBzdHIgOiBkZWNTdHI7XG59XG52YXIgaGFuZGxlciQ0ID0ge1xuICAgIHNjaGVtZTogXCJtYWlsdG9cIixcbiAgICBwYXJzZTogZnVuY3Rpb24gcGFyc2UkJDEoY29tcG9uZW50cywgb3B0aW9ucykge1xuICAgICAgICB2YXIgbWFpbHRvQ29tcG9uZW50cyA9IGNvbXBvbmVudHM7XG4gICAgICAgIHZhciB0byA9IG1haWx0b0NvbXBvbmVudHMudG8gPSBtYWlsdG9Db21wb25lbnRzLnBhdGggPyBtYWlsdG9Db21wb25lbnRzLnBhdGguc3BsaXQoXCIsXCIpIDogW107XG4gICAgICAgIG1haWx0b0NvbXBvbmVudHMucGF0aCA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKG1haWx0b0NvbXBvbmVudHMucXVlcnkpIHtcbiAgICAgICAgICAgIHZhciB1bmtub3duSGVhZGVycyA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGhlYWRlcnMgPSB7fTtcbiAgICAgICAgICAgIHZhciBoZmllbGRzID0gbWFpbHRvQ29tcG9uZW50cy5xdWVyeS5zcGxpdChcIiZcIik7XG4gICAgICAgICAgICBmb3IgKHZhciB4ID0gMCwgeGwgPSBoZmllbGRzLmxlbmd0aDsgeCA8IHhsOyArK3gpIHtcbiAgICAgICAgICAgICAgICB2YXIgaGZpZWxkID0gaGZpZWxkc1t4XS5zcGxpdChcIj1cIik7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChoZmllbGRbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInRvXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdG9BZGRycyA9IGhmaWVsZFsxXS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBfeCA9IDAsIF94bCA9IHRvQWRkcnMubGVuZ3RoOyBfeCA8IF94bDsgKytfeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvLnB1c2godG9BZGRyc1tfeF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJzdWJqZWN0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsdG9Db21wb25lbnRzLnN1YmplY3QgPSB1bmVzY2FwZUNvbXBvbmVudChoZmllbGRbMV0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJib2R5XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsdG9Db21wb25lbnRzLmJvZHkgPSB1bmVzY2FwZUNvbXBvbmVudChoZmllbGRbMV0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB1bmtub3duSGVhZGVycyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJzW3VuZXNjYXBlQ29tcG9uZW50KGhmaWVsZFswXSwgb3B0aW9ucyldID0gdW5lc2NhcGVDb21wb25lbnQoaGZpZWxkWzFdLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh1bmtub3duSGVhZGVycykgbWFpbHRvQ29tcG9uZW50cy5oZWFkZXJzID0gaGVhZGVycztcbiAgICAgICAgfVxuICAgICAgICBtYWlsdG9Db21wb25lbnRzLnF1ZXJ5ID0gdW5kZWZpbmVkO1xuICAgICAgICBmb3IgKHZhciBfeDIgPSAwLCBfeGwyID0gdG8ubGVuZ3RoOyBfeDIgPCBfeGwyOyArK194Mikge1xuICAgICAgICAgICAgdmFyIGFkZHIgPSB0b1tfeDJdLnNwbGl0KFwiQFwiKTtcbiAgICAgICAgICAgIGFkZHJbMF0gPSB1bmVzY2FwZUNvbXBvbmVudChhZGRyWzBdKTtcbiAgICAgICAgICAgIGlmICghb3B0aW9ucy51bmljb2RlU3VwcG9ydCkge1xuICAgICAgICAgICAgICAgIC8vY29udmVydCBVbmljb2RlIElETiAtPiBBU0NJSSBJRE5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhZGRyWzFdID0gcHVueWNvZGUudG9BU0NJSSh1bmVzY2FwZUNvbXBvbmVudChhZGRyWzFdLCBvcHRpb25zKS50b0xvd2VyQ2FzZSgpKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1haWx0b0NvbXBvbmVudHMuZXJyb3IgPSBtYWlsdG9Db21wb25lbnRzLmVycm9yIHx8IFwiRW1haWwgYWRkcmVzcydzIGRvbWFpbiBuYW1lIGNhbiBub3QgYmUgY29udmVydGVkIHRvIEFTQ0lJIHZpYSBwdW55Y29kZTogXCIgKyBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYWRkclsxXSA9IHVuZXNjYXBlQ29tcG9uZW50KGFkZHJbMV0sIG9wdGlvbnMpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0b1tfeDJdID0gYWRkci5qb2luKFwiQFwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWFpbHRvQ29tcG9uZW50cztcbiAgICB9LFxuICAgIHNlcmlhbGl6ZTogZnVuY3Rpb24gc2VyaWFsaXplJCQxKG1haWx0b0NvbXBvbmVudHMsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGNvbXBvbmVudHMgPSBtYWlsdG9Db21wb25lbnRzO1xuICAgICAgICB2YXIgdG8gPSB0b0FycmF5KG1haWx0b0NvbXBvbmVudHMudG8pO1xuICAgICAgICBpZiAodG8pIHtcbiAgICAgICAgICAgIGZvciAodmFyIHggPSAwLCB4bCA9IHRvLmxlbmd0aDsgeCA8IHhsOyArK3gpIHtcbiAgICAgICAgICAgICAgICB2YXIgdG9BZGRyID0gU3RyaW5nKHRvW3hdKTtcbiAgICAgICAgICAgICAgICB2YXIgYXRJZHggPSB0b0FkZHIubGFzdEluZGV4T2YoXCJAXCIpO1xuICAgICAgICAgICAgICAgIHZhciBsb2NhbFBhcnQgPSB0b0FkZHIuc2xpY2UoMCwgYXRJZHgpLnJlcGxhY2UoUENUX0VOQ09ERUQsIGRlY29kZVVucmVzZXJ2ZWQpLnJlcGxhY2UoUENUX0VOQ09ERUQsIHRvVXBwZXJDYXNlKS5yZXBsYWNlKE5PVF9MT0NBTF9QQVJULCBwY3RFbmNDaGFyKTtcbiAgICAgICAgICAgICAgICB2YXIgZG9tYWluID0gdG9BZGRyLnNsaWNlKGF0SWR4ICsgMSk7XG4gICAgICAgICAgICAgICAgLy9jb252ZXJ0IElETiB2aWEgcHVueWNvZGVcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBkb21haW4gPSAhb3B0aW9ucy5pcmkgPyBwdW55Y29kZS50b0FTQ0lJKHVuZXNjYXBlQ29tcG9uZW50KGRvbWFpbiwgb3B0aW9ucykudG9Mb3dlckNhc2UoKSkgOiBwdW55Y29kZS50b1VuaWNvZGUoZG9tYWluKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHMuZXJyb3IgPSBjb21wb25lbnRzLmVycm9yIHx8IFwiRW1haWwgYWRkcmVzcydzIGRvbWFpbiBuYW1lIGNhbiBub3QgYmUgY29udmVydGVkIHRvIFwiICsgKCFvcHRpb25zLmlyaSA/IFwiQVNDSUlcIiA6IFwiVW5pY29kZVwiKSArIFwiIHZpYSBwdW55Y29kZTogXCIgKyBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0b1t4XSA9IGxvY2FsUGFydCArIFwiQFwiICsgZG9tYWluO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29tcG9uZW50cy5wYXRoID0gdG8uam9pbihcIixcIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGhlYWRlcnMgPSBtYWlsdG9Db21wb25lbnRzLmhlYWRlcnMgPSBtYWlsdG9Db21wb25lbnRzLmhlYWRlcnMgfHwge307XG4gICAgICAgIGlmIChtYWlsdG9Db21wb25lbnRzLnN1YmplY3QpIGhlYWRlcnNbXCJzdWJqZWN0XCJdID0gbWFpbHRvQ29tcG9uZW50cy5zdWJqZWN0O1xuICAgICAgICBpZiAobWFpbHRvQ29tcG9uZW50cy5ib2R5KSBoZWFkZXJzW1wiYm9keVwiXSA9IG1haWx0b0NvbXBvbmVudHMuYm9keTtcbiAgICAgICAgdmFyIGZpZWxkcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBuYW1lIGluIGhlYWRlcnMpIHtcbiAgICAgICAgICAgIGlmIChoZWFkZXJzW25hbWVdICE9PSBPW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgZmllbGRzLnB1c2gobmFtZS5yZXBsYWNlKFBDVF9FTkNPREVELCBkZWNvZGVVbnJlc2VydmVkKS5yZXBsYWNlKFBDVF9FTkNPREVELCB0b1VwcGVyQ2FzZSkucmVwbGFjZShOT1RfSEZOQU1FLCBwY3RFbmNDaGFyKSArIFwiPVwiICsgaGVhZGVyc1tuYW1lXS5yZXBsYWNlKFBDVF9FTkNPREVELCBkZWNvZGVVbnJlc2VydmVkKS5yZXBsYWNlKFBDVF9FTkNPREVELCB0b1VwcGVyQ2FzZSkucmVwbGFjZShOT1RfSEZWQUxVRSwgcGN0RW5jQ2hhcikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmaWVsZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb21wb25lbnRzLnF1ZXJ5ID0gZmllbGRzLmpvaW4oXCImXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb21wb25lbnRzO1xuICAgIH1cbn07XG5cbnZhciBVUk5fUEFSU0UgPSAvXihbXlxcOl0rKVxcOiguKikvO1xuLy9SRkMgMjE0MVxudmFyIGhhbmRsZXIkNSA9IHtcbiAgICBzY2hlbWU6IFwidXJuXCIsXG4gICAgcGFyc2U6IGZ1bmN0aW9uIHBhcnNlJCQxKGNvbXBvbmVudHMsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIG1hdGNoZXMgPSBjb21wb25lbnRzLnBhdGggJiYgY29tcG9uZW50cy5wYXRoLm1hdGNoKFVSTl9QQVJTRSk7XG4gICAgICAgIHZhciB1cm5Db21wb25lbnRzID0gY29tcG9uZW50cztcbiAgICAgICAgaWYgKG1hdGNoZXMpIHtcbiAgICAgICAgICAgIHZhciBzY2hlbWUgPSBvcHRpb25zLnNjaGVtZSB8fCB1cm5Db21wb25lbnRzLnNjaGVtZSB8fCBcInVyblwiO1xuICAgICAgICAgICAgdmFyIG5pZCA9IG1hdGNoZXNbMV0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIHZhciBuc3MgPSBtYXRjaGVzWzJdO1xuICAgICAgICAgICAgdmFyIHVyblNjaGVtZSA9IHNjaGVtZSArIFwiOlwiICsgKG9wdGlvbnMubmlkIHx8IG5pZCk7XG4gICAgICAgICAgICB2YXIgc2NoZW1lSGFuZGxlciA9IFNDSEVNRVNbdXJuU2NoZW1lXTtcbiAgICAgICAgICAgIHVybkNvbXBvbmVudHMubmlkID0gbmlkO1xuICAgICAgICAgICAgdXJuQ29tcG9uZW50cy5uc3MgPSBuc3M7XG4gICAgICAgICAgICB1cm5Db21wb25lbnRzLnBhdGggPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAoc2NoZW1lSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHVybkNvbXBvbmVudHMgPSBzY2hlbWVIYW5kbGVyLnBhcnNlKHVybkNvbXBvbmVudHMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdXJuQ29tcG9uZW50cy5lcnJvciA9IHVybkNvbXBvbmVudHMuZXJyb3IgfHwgXCJVUk4gY2FuIG5vdCBiZSBwYXJzZWQuXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVybkNvbXBvbmVudHM7XG4gICAgfSxcbiAgICBzZXJpYWxpemU6IGZ1bmN0aW9uIHNlcmlhbGl6ZSQkMSh1cm5Db21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBzY2hlbWUgPSBvcHRpb25zLnNjaGVtZSB8fCB1cm5Db21wb25lbnRzLnNjaGVtZSB8fCBcInVyblwiO1xuICAgICAgICB2YXIgbmlkID0gdXJuQ29tcG9uZW50cy5uaWQ7XG4gICAgICAgIHZhciB1cm5TY2hlbWUgPSBzY2hlbWUgKyBcIjpcIiArIChvcHRpb25zLm5pZCB8fCBuaWQpO1xuICAgICAgICB2YXIgc2NoZW1lSGFuZGxlciA9IFNDSEVNRVNbdXJuU2NoZW1lXTtcbiAgICAgICAgaWYgKHNjaGVtZUhhbmRsZXIpIHtcbiAgICAgICAgICAgIHVybkNvbXBvbmVudHMgPSBzY2hlbWVIYW5kbGVyLnNlcmlhbGl6ZSh1cm5Db21wb25lbnRzLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdXJpQ29tcG9uZW50cyA9IHVybkNvbXBvbmVudHM7XG4gICAgICAgIHZhciBuc3MgPSB1cm5Db21wb25lbnRzLm5zcztcbiAgICAgICAgdXJpQ29tcG9uZW50cy5wYXRoID0gKG5pZCB8fCBvcHRpb25zLm5pZCkgKyBcIjpcIiArIG5zcztcbiAgICAgICAgcmV0dXJuIHVyaUNvbXBvbmVudHM7XG4gICAgfVxufTtcblxudmFyIFVVSUQgPSAvXlswLTlBLUZhLWZdezh9KD86XFwtWzAtOUEtRmEtZl17NH0pezN9XFwtWzAtOUEtRmEtZl17MTJ9JC87XG4vL1JGQyA0MTIyXG52YXIgaGFuZGxlciQ2ID0ge1xuICAgIHNjaGVtZTogXCJ1cm46dXVpZFwiLFxuICAgIHBhcnNlOiBmdW5jdGlvbiBwYXJzZSh1cm5Db21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciB1dWlkQ29tcG9uZW50cyA9IHVybkNvbXBvbmVudHM7XG4gICAgICAgIHV1aWRDb21wb25lbnRzLnV1aWQgPSB1dWlkQ29tcG9uZW50cy5uc3M7XG4gICAgICAgIHV1aWRDb21wb25lbnRzLm5zcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKCFvcHRpb25zLnRvbGVyYW50ICYmICghdXVpZENvbXBvbmVudHMudXVpZCB8fCAhdXVpZENvbXBvbmVudHMudXVpZC5tYXRjaChVVUlEKSkpIHtcbiAgICAgICAgICAgIHV1aWRDb21wb25lbnRzLmVycm9yID0gdXVpZENvbXBvbmVudHMuZXJyb3IgfHwgXCJVVUlEIGlzIG5vdCB2YWxpZC5cIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXVpZENvbXBvbmVudHM7XG4gICAgfSxcbiAgICBzZXJpYWxpemU6IGZ1bmN0aW9uIHNlcmlhbGl6ZSh1dWlkQ29tcG9uZW50cywgb3B0aW9ucykge1xuICAgICAgICB2YXIgdXJuQ29tcG9uZW50cyA9IHV1aWRDb21wb25lbnRzO1xuICAgICAgICAvL25vcm1hbGl6ZSBVVUlEXG4gICAgICAgIHVybkNvbXBvbmVudHMubnNzID0gKHV1aWRDb21wb25lbnRzLnV1aWQgfHwgXCJcIikudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgcmV0dXJuIHVybkNvbXBvbmVudHM7XG4gICAgfVxufTtcblxuU0NIRU1FU1toYW5kbGVyLnNjaGVtZV0gPSBoYW5kbGVyO1xuU0NIRU1FU1toYW5kbGVyJDEuc2NoZW1lXSA9IGhhbmRsZXIkMTtcblNDSEVNRVNbaGFuZGxlciQyLnNjaGVtZV0gPSBoYW5kbGVyJDI7XG5TQ0hFTUVTW2hhbmRsZXIkMy5zY2hlbWVdID0gaGFuZGxlciQzO1xuU0NIRU1FU1toYW5kbGVyJDQuc2NoZW1lXSA9IGhhbmRsZXIkNDtcblNDSEVNRVNbaGFuZGxlciQ1LnNjaGVtZV0gPSBoYW5kbGVyJDU7XG5TQ0hFTUVTW2hhbmRsZXIkNi5zY2hlbWVdID0gaGFuZGxlciQ2O1xuXG5leHBvcnRzLlNDSEVNRVMgPSBTQ0hFTUVTO1xuZXhwb3J0cy5wY3RFbmNDaGFyID0gcGN0RW5jQ2hhcjtcbmV4cG9ydHMucGN0RGVjQ2hhcnMgPSBwY3REZWNDaGFycztcbmV4cG9ydHMucGFyc2UgPSBwYXJzZTtcbmV4cG9ydHMucmVtb3ZlRG90U2VnbWVudHMgPSByZW1vdmVEb3RTZWdtZW50cztcbmV4cG9ydHMuc2VyaWFsaXplID0gc2VyaWFsaXplO1xuZXhwb3J0cy5yZXNvbHZlQ29tcG9uZW50cyA9IHJlc29sdmVDb21wb25lbnRzO1xuZXhwb3J0cy5yZXNvbHZlID0gcmVzb2x2ZTtcbmV4cG9ydHMubm9ybWFsaXplID0gbm9ybWFsaXplO1xuZXhwb3J0cy5lcXVhbCA9IGVxdWFsO1xuZXhwb3J0cy5lc2NhcGVDb21wb25lbnQgPSBlc2NhcGVDb21wb25lbnQ7XG5leHBvcnRzLnVuZXNjYXBlQ29tcG9uZW50ID0gdW5lc2NhcGVDb21wb25lbnQ7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD11cmkuYWxsLmpzLm1hcFxuIl19
