/* eslint-disable no-undef */
/* eslint-disable no-prototype-builtins */
//dateTime unit tests
var chai  = require("chai");
chai.use(require("chai-datetime"));
var assert = chai.assert;

var getDateTime = require("../lib/tools").getDateTime;
var addDate = require("../lib/tools").addDate;
var monthList = require("../lib/tools").monthList;
var parseDateTime = require("../lib/tools").parseDateTime;
var getTimefromDateTime = require("../lib/tools").getTimefromDateTime;
var leadZero = require("../lib/tools").leadZero;
var schedule = require("../lib/schedule");

/**
 * Shows debug inforamtion about schedule for tracking test results
 * @param {object} schedule Schedule object to be logged
 * @param {datetime} calculated Calculated date-time
 * @param {datetime} expected Expected date-time
 * @param {boolean} showDebug Show debug info or not
 */
function logSchedule(schedule, calculated, expected, showDebug) {
  //debug switch
  if(showDebug) {
    console.log("start date    : ", schedule.startDateTime);
    console.log("end date      : ", schedule.endDateTime);
    console.log("current time  : ", getDateTime());                
    let interval;
    let frequency;
    if(schedule.hasOwnProperty("eachNDay"))
      interval = `each ${schedule.eachNDay} day`;
    if(schedule.hasOwnProperty("eachNWeek")) {
      let dayList = schedule.dayOfWeek.reduce((reducer, current) => reducer = reducer + " " + current , "");   
      interval = `each ${schedule.eachNWeek} week, on: ${dayList}`;
    }
    if(schedule.hasOwnProperty("month")) {
      let scheduleMonthList = schedule.month.reduce((reducer, current) => reducer = reducer + " " + current , "");
      let scheduleDayList = schedule.day.reduce((reducer, current) => reducer = reducer + " " + current , "");
      interval = `months: ${scheduleMonthList}, days: ${scheduleDayList}`;                
    }
    if(schedule.hasOwnProperty("oneTime")) {
      frequency = schedule.oneTime;
    }
    if(schedule.dailyFrequency.hasOwnProperty("occursOnceAt")) {
      frequency = `once at: ${schedule.dailyFrequency.occursOnceAt}`;  
    }
    if(schedule.dailyFrequency.hasOwnProperty("occursEvery")) {
      frequency = `starting: ${schedule.dailyFrequency.start}, every ${schedule.dailyFrequency.occursEvery.intervalValue} ${schedule.dailyFrequency.occursEvery.intervalType}`;  
    }
    console.log("interval      : ", interval);
    console.log("frequency     : ", frequency);
    console.log("calculated run: ", calculated);
    console.log("expexted run  : ", expected);  
  }
}
describe("schedule", function() {
  describe("common tests", function() {           
    it("valid", function(done) {                
      let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").oneTimeScheduleOK));
      scheduleTestObject.oneTime = "2119-06-10T02:02:02.071Z";
      assert.isNotNull(schedule.nextOccurrence(scheduleTestObject).result);
      done();
    });           
    it("disabled", function(done) {                
      let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").oneTimeScheduleOK));
      scheduleTestObject.enabled = false;
      assert.isNull(schedule.nextOccurrence(scheduleTestObject).result);
      assert.include(schedule.nextOccurrence(scheduleTestObject).error, "disabled");
      done();
    });                                                       
  });    
  describe("nextOccurrence", function() {           
    describe("oneTime", function() {
      it("success. added time", function(done) {                
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").oneTimeScheduleOK));
        scheduleTestObject.oneTime = addDate(getDateTime(), 0, 0, 0, 6, 0, 0).toISOString();
        let nextRun = parseDateTime(scheduleTestObject.oneTime);
        assert.equalDate(schedule.nextOccurrence(scheduleTestObject).result, nextRun);
        assert.equalTime(schedule.nextOccurrence(scheduleTestObject).result, nextRun);
        done();
      });         
      it("success. added date", function(done) {
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").oneTimeScheduleOK));
        scheduleTestObject.oneTime = addDate(getDateTime(), 0, 0, 1, 0, 0, 0).toISOString();
        let nextRun = parseDateTime(scheduleTestObject.oneTime);
        assert.equalDate(schedule.nextOccurrence(scheduleTestObject).result, nextRun);
        assert.equalTime(schedule.nextOccurrence(scheduleTestObject).result, nextRun);
        done();
      });      
      it("success. far future", function(done) {
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").oneTimeScheduleOK));
        scheduleTestObject.oneTime = "2039-06-10T02:02:02.071Z";
        let nextRun = parseDateTime(scheduleTestObject.oneTime);
        assert.equalDate(schedule.nextOccurrence(scheduleTestObject).result, nextRun);
        assert.equalTime(schedule.nextOccurrence(scheduleTestObject).result, nextRun);
        done();
      });                                               
    });
    describe("eachNDay. occursOnceAt", function() {           
      it("success. run at now+5min", function(done) {
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").dailyScheduleOnceOK));
        scheduleTestObject.startDateTime = getDateTime().toISOString();
        scheduleTestObject.eachNDay = 1;
        let nextRunDateTime = addDate(getDateTime(), 0, 0, 0, 0, 5, 0);
        nextRunDateTime.setMilliseconds(0);
        scheduleTestObject.dailyFrequency.occursOnceAt = getTimefromDateTime(nextRunDateTime);
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);        
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });      
      it("success. occurrs and start date in far future", function(done) {
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").dailyScheduleOnceOK));
        scheduleTestObject.startDateTime = "2020-01-31T20:54:23.071Z";
        scheduleTestObject.endDateTime = "2021-01-31T20:54:23.071Z";
        scheduleTestObject.eachNDay = 2;
        scheduleTestObject.dailyFrequency.occursOnceAt = "11:11:11";
        let nextRunDateTime = parseDateTime("2020-02-02T11:11:11.000Z");
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);        
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });             
      it("success. startDateTime=firstOccurrence", function(done) {
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").dailyScheduleOnceOK));
        scheduleTestObject.startDateTime = "2119-01-01T12:00:00.000Z";
        scheduleTestObject.eachNDay = 1;
        let nextRunDateTime = parseDateTime("2119-01-01T12:00:00.000Z");
        scheduleTestObject.dailyFrequency.occursOnceAt = "12:00:00";
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);        
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });             
      it("success. run at 23:59:59", function(done) {
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").dailyScheduleOnceOK));
        scheduleTestObject.startDateTime = addDate(getDateTime(), 0, 0, -15, 0, 0, 0).toISOString();
        scheduleTestObject.eachNDay = 1;
        let nextRunDateTime = getDateTime();
        nextRunDateTime.setUTCHours(23, 59, 59, 0);
        scheduleTestObject.dailyFrequency.occursOnceAt = "23:59:59";
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);      
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });                
      it("success. run every 7 days at now+15min", function(done) {
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").dailyScheduleOnceOK));
        scheduleTestObject.startDateTime = addDate(getDateTime(), 0, 0, -15, 0, 0, 0).toISOString();
        scheduleTestObject.eachNDay = 7;
        let nextRunDateTime = addDate(getDateTime(), 0, 0, 6, 0, 15, 0); 
        nextRunDateTime.setMilliseconds(0);
        scheduleTestObject.dailyFrequency.occursOnceAt = getTimefromDateTime(nextRunDateTime);
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;
        let calculationError = schedule.nextOccurrence(scheduleTestObject).error;
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);               
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        assert.isNull(calculationError);
        done();
      });             
      it("success. run at now+1day-1hour", function(done) {
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").dailyScheduleOnceOK));
        scheduleTestObject.startDateTime = addDate(getDateTime(), 0, 0, -1, -1, 0, 0).toISOString();
        scheduleTestObject.eachNDay = 1;
        let nextRunDateTime = addDate(getDateTime(), 0, 0, 1, -1, 0, 0);
        nextRunDateTime.setMilliseconds(0);
        scheduleTestObject.dailyFrequency.occursOnceAt = getTimefromDateTime(nextRunDateTime);
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);            
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });               
      it("failure. endDateTime restriction", function(done) {
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").dailyScheduleOnceOK));
        scheduleTestObject.startDateTime = addDate(getDateTime(), 0, 0, -1, -1, 0, 0).toISOString();
        scheduleTestObject.eachNDay = 1;
        scheduleTestObject.endDateTime = getDateTime().toISOString();
        let nextRunDateTime = addDate(getDateTime(), 0, 0, 1, -1, 0, 0);
        nextRunDateTime.setMilliseconds(0);
        scheduleTestObject.dailyFrequency.occursOnceAt = getTimefromDateTime(nextRunDateTime);
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;
        let calculationError = schedule.nextOccurrence(scheduleTestObject).error;
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);           
        assert.isNull(calculationResult);
        assert.equal(calculationError, "calculated date-time earlier than endDateTime");
        done();
      });                     
    });

    describe("eachNDay. occursEvery", function() {
      it("success. run every 15 minutes starting 10:07:00", function(done) {
        //test data preparation
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").dailyScheduleEveryOK));
        scheduleTestObject.startDateTime = "2018-01-01T10:00:00.000Z";
        scheduleTestObject.eachNDay = 1;                
        scheduleTestObject.dailyFrequency.start = "10:07:00";
        scheduleTestObject.dailyFrequency.occursEvery.intervalType = "minute";
        scheduleTestObject.dailyFrequency.occursEvery.intervalValue = 15;
        //calculate test case data
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;
        //manual calculation for validation
        let time = scheduleTestObject.dailyFrequency.start.split(":");
        let nextRunDateTime = new Date(getDateTime().setUTCHours(time[0], time[1], time[2], 0));
        while(nextRunDateTime < getDateTime()) {
          nextRunDateTime = addDate(nextRunDateTime, 0, 0, 0, 0, scheduleTestObject.dailyFrequency.occursEvery.intervalValue, 0);
        }
        //log
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        //assertion
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });          
      it("success. run every 5 hours starting 05:55:00", function(done) {
        //test data preparation
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").dailyScheduleEveryOK));
        scheduleTestObject.startDateTime = "2018-01-01T10:00:00.000Z";
        scheduleTestObject.eachNDay = 1;                
        scheduleTestObject.dailyFrequency.start = "05:55:00";
        scheduleTestObject.dailyFrequency.occursEvery.intervalType = "hour";
        scheduleTestObject.dailyFrequency.occursEvery.intervalValue = 5;
        //calculate test case data
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;
        //manual calculation for validation
        let time = scheduleTestObject.dailyFrequency.start.split(":");
        let nextRunDateTime = new Date(getDateTime().setUTCHours(time[0], time[1], time[2], 0));
        //correct timzeone shift
        let initialDay = nextRunDateTime.getUTCDate();
        while(nextRunDateTime < getDateTime()) {
          nextRunDateTime = addDate(nextRunDateTime, 0, 0, 0, scheduleTestObject.dailyFrequency.occursEvery.intervalValue, 0, 0);
          //date overwhelming
          if(initialDay != nextRunDateTime.getUTCDate())
            nextRunDateTime.setUTCHours(time[0], time[1], time[2], 0);
        }
        //log
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        //assertion
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });    
      it("success. run every 11 hours starting 05:00:00 (date owerwhelming)", function(done) {
        //test data preparation
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").dailyScheduleEveryOK));
        scheduleTestObject.startDateTime = "2018-01-01T10:00:00.000Z";
        scheduleTestObject.eachNDay = 1;                
        scheduleTestObject.dailyFrequency.start = "05:00:00";
        scheduleTestObject.dailyFrequency.occursEvery.intervalType = "hour";
        scheduleTestObject.dailyFrequency.occursEvery.intervalValue = 11;
        //calculate test case data
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;
        //manual calculation for validation
        let time = scheduleTestObject.dailyFrequency.start.split(":");
        let nextRunDateTime = new Date(getDateTime().setUTCHours(time[0], time[1], time[2], 0));
        //correct timzeone shift
        let currentDay = nextRunDateTime.getUTCDate();
        while(nextRunDateTime < getDateTime()) {
          nextRunDateTime = addDate(nextRunDateTime, 0, 0, 0, scheduleTestObject.dailyFrequency.occursEvery.intervalValue, 0, 0);
          //date overwhelming caused next day
          if(currentDay != nextRunDateTime.getUTCDate()) {
            nextRunDateTime = addDate(nextRunDateTime, 0, 0, scheduleTestObject.eachNDay - 1, 0, 0, 0);
            nextRunDateTime = new Date(nextRunDateTime.setUTCHours(time[0], time[1], time[2], 0));
          }
        }
        //log
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        //assertion
        assert.equalDate(calculationResult, nextRunDateTime);                
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });                    
      it("success. run every 2 hours starting 09:18:36, each 12 days", function(done) {
        //test data preparation
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").dailyScheduleEveryOK));
        scheduleTestObject.startDateTime = "2018-07-01T12:00:00.000Z";
        scheduleTestObject.eachNDay = 12;                
        scheduleTestObject.dailyFrequency.start = "09:18:36";
        scheduleTestObject.dailyFrequency.occursEvery.intervalType = "hour";
        scheduleTestObject.dailyFrequency.occursEvery.intervalValue = 2;
        //calculate test case data
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;
        //manual calculation for validation
        let currentDate = new Date(getDateTime().setUTCHours(0, 0, 0, 0));
        let nextRunDateTime = new Date(scheduleTestObject.startDateTime);
        nextRunDateTime.setUTCHours(0, 0, 0);
        //date
        while(nextRunDateTime < currentDate) {                
          nextRunDateTime = addDate(nextRunDateTime, 0, 0, scheduleTestObject.eachNDay, 0, 0, 0);
        }
        //time
        let time = scheduleTestObject.dailyFrequency.start.split(":");
        nextRunDateTime = new Date(nextRunDateTime.setUTCHours(time[0], time[1], time[2], 0));
        while(nextRunDateTime < getDateTime()) {
          nextRunDateTime = addDate(nextRunDateTime, 0, 0, 0, scheduleTestObject.dailyFrequency.occursEvery.intervalValue, 0, 0);
        }
        //log
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        //assertion
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });   
      it("success. run every 23 hours starting 19:00:00, each 3 days (date owerwhelming)", function(done) {
        //test data preparation
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").dailyScheduleEveryOK));
        scheduleTestObject.startDateTime = addDate(getDateTime(), 0, 0, -3, 0, 0, 0).toISOString();
        scheduleTestObject.eachNDay = 3;                
        scheduleTestObject.dailyFrequency.start = "19:00:00";
        scheduleTestObject.dailyFrequency.occursEvery.intervalType = "hour";
        scheduleTestObject.dailyFrequency.occursEvery.intervalValue = 23;
        //calculate test case data
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;
        //manual calculation for validation
        let currentDate = new Date(getDateTime().setUTCHours(0, 0, 0, 0));
        let nextRunDateTime = new Date(scheduleTestObject.startDateTime);
        nextRunDateTime.setUTCHours(0, 0, 0);
        //date
        while(nextRunDateTime < currentDate) {
          nextRunDateTime = addDate(nextRunDateTime, 0, 0, scheduleTestObject.eachNDay, 0, 0, 0);
        }
        //time
        let time = scheduleTestObject.dailyFrequency.start.split(":");
        nextRunDateTime = new Date(nextRunDateTime.setUTCHours(time[0], time[1], time[2], 0));
        let currentDay = nextRunDateTime.getUTCDate();
        while(nextRunDateTime < getDateTime()) {
          nextRunDateTime = addDate(nextRunDateTime, 0, 0, 0, scheduleTestObject.dailyFrequency.occursEvery.intervalValue, 0, 0);
          //date overwhelming caused next interval day
          if(currentDay != nextRunDateTime.getUTCDate()) {
            nextRunDateTime = addDate(nextRunDateTime, 0, 0, scheduleTestObject.eachNDay - 1, 0, 0, 0);
            nextRunDateTime = new Date(nextRunDateTime.setUTCHours(time[0], time[1], time[2], 0));
          }
        }
        //log
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        //assertion
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });               
      it("failure. run every 59 minutes starting 10:10:10, endDateTime restriction", function(done) {
        //test data preparation
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").dailyScheduleEveryOK));
        scheduleTestObject.startDateTime = "2018-01-01T10:00:00.000Z";
        scheduleTestObject.eachNDay = 1;                
        scheduleTestObject.dailyFrequency.start = "10:10:10";
        scheduleTestObject.dailyFrequency.occursEvery.intervalType = "minute";
        scheduleTestObject.dailyFrequency.occursEvery.intervalValue = 59;
        scheduleTestObject.endDateTime = getDateTime().toISOString();
        //calculate test case data
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;
        logSchedule(scheduleTestObject, calculationResult, null);
        //assertion
        assert.isNull(calculationResult);
        done();
      });    
      it("success. run every 10 hours (\"end\" earlier that next occurrence this day)", function(done) {
        //test data preparation
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").dailyScheduleEveryOK));
        scheduleTestObject.startDateTime = "2001-01-01T10:00:00.000Z";
        scheduleTestObject.eachNDay = 1;                
        scheduleTestObject.dailyFrequency.start = "00:00:01";
        scheduleTestObject.dailyFrequency.occursEvery.intervalType = "hour";
        scheduleTestObject.dailyFrequency.occursEvery.intervalValue = 10;
        scheduleTestObject.dailyFrequency.end = "10:00:01";
        //time
        let time = scheduleTestObject.dailyFrequency.start.split(":");
        nextRunDateTime = new Date(addDate(getDateTime(), 0, 0, 1).setUTCHours(time[0], time[1], time[2], 0));
        //calculate test case data
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        //assertion
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });      
      it("failed. run every 10 hours (\"end\" earlier or same as \"start\")", function(done) {
        //test data preparation
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").dailyScheduleEveryOK));
        scheduleTestObject.startDateTime = "2100-01-01T10:00:00.000Z";
        scheduleTestObject.eachNDay = 1;                
        scheduleTestObject.dailyFrequency.start = "10:00:00";
        scheduleTestObject.dailyFrequency.occursEvery.intervalType = "hour";
        scheduleTestObject.dailyFrequency.occursEvery.intervalValue = 10;
        scheduleTestObject.dailyFrequency.end = "10:00:00";
        //calculate test case data
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;
        logSchedule(scheduleTestObject, calculationResult, null);
        //assertion
        assert.isNull(calculationResult);
        done();
      });                                   
      //todo eachNDays>1        
    });

    describe("eachNWeek", function() {     
      it("success. run every 1st week (future)", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").weeklyScheduleOK));
        scheduleTestObject.startDateTime = "2084-01-20T10:00:00.000Z";
        scheduleTestObject.dayOfWeek = ["wed", "fri"];
        scheduleTestObject.eachNWeek = 1;
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;   
        let nextRunDateTime = parseDateTime("2084-01-21T11:11:11.000Z");
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });        
      it("success. run every 1st week (future), reverse week day order", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").weeklyScheduleOK));
        scheduleTestObject.startDateTime = "2020-01-01T00:00:01.000Z";
        scheduleTestObject.endDateTime = "2020-12-31T23:59:59.000Z";
        scheduleTestObject.eachNWeek = 3;
        scheduleTestObject.dayOfWeek = ["wed", "fri", "mon"];
        scheduleTestObject.dailyFrequency.occursOnceAt = "11:11:11";
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;                   
        let nextRunDateTime = parseDateTime("2020-01-13T11:11:11.000Z");
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });                  
      it("success. run every 1st week at sun (future)", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").weeklyScheduleOK));
        scheduleTestObject.startDateTime = "2084-01-20T10:00:00.000Z";
        scheduleTestObject.dayOfWeek = ["sun"];
        scheduleTestObject.eachNWeek = 1;
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;   
        let nextRunDateTime = parseDateTime("2084-01-23T11:11:11.000Z");
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });                        
      it("success. run every 2st week (future)", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").weeklyScheduleOK));
        scheduleTestObject.startDateTime = "2084-01-20T10:00:00.000Z";
        scheduleTestObject.dayOfWeek = ["mon", "wed", "fri"];
        scheduleTestObject.eachNWeek = 2;
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;   
        let nextRunDateTime = parseDateTime("2084-01-24T11:11:11.000Z");
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });                      
      it("success. run every 3rd week", function(done) {
        //21-27 Oct, 24 Oct
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").weeklyScheduleOK));
        scheduleTestObject.startDateTime = addDate(getDateTime(), 0, 0, -35, 0, 0, 0).toISOString();
        scheduleTestObject.eachNWeek = 3;
        scheduleTestObject.dayOfWeek = ["mon"];
        //find Sunday
        let currentDate = getDateTime();
        currentWeekSunday = addDate(currentDate, 0, 0, -currentDate.getUTCDay(), 0, 0, 0);            
        //find week for run
        let addedRunPeriod = currentDate.getUTCDay() == 0 ? 0 : 21;
        let nextRunDateTime = addDate(currentWeekSunday, 0, 0, addedRunPeriod, 11, 11, 11);
        //find Sunday of week where to run
        nextRunDateTime = addDate(nextRunDateTime, 0, 0, -nextRunDateTime.getUTCDay()+1, 0, 0, 0);
        nextRunDateTime.setUTCHours(11, 11, 11, 0);
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result; 
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);         
        done();
      });                  
      it("success. run every 1st week, everyday, every 2 hours", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").weeklyScheduleOK));
        scheduleTestObject.startDateTime = "2018-01-01T10:00:00.000Z";
        scheduleTestObject.dayOfWeek = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        scheduleTestObject.eachNWeek = 1;
        scheduleTestObject.dailyFrequency = { 
          "start": "00:15:00",
          "occursEvery": 
                    {   
                      "intervalType": "hour",
                      "intervalValue": 2
                    }
        };
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;   
        let xHour = getDateTime().getUTCHours();
        xHour = xHour%2 == 0 ? 2 : 1;
        let nextRunDateTime = getDateTime();
        nextRunDateTime.setUTCHours(nextRunDateTime.getUTCHours(), 15, 0, 0);          
        if(xHour%2 == 0) {
          if(getDateTime().getMinutes() > 15)
            nextRunDateTime = addDate(nextRunDateTime, 0, 0, 0, xHour, 0, 0);
        }
        else
          nextRunDateTime = addDate(nextRunDateTime, 0, 0, 0, xHour, 0, 0);

        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });              
      it("success. run every 1st week, everyday, every 13 hours (date overwhelming)", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").weeklyScheduleOK));
        scheduleTestObject.startDateTime = "2018-01-01T10:00:00.000Z";
        scheduleTestObject.dayOfWeek = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        scheduleTestObject.eachNWeek = 1;
        scheduleTestObject.dailyFrequency = { 
          "start": "13:00:00",
          "occursEvery": 
                        {   
                          "intervalType": "hour",
                          "intervalValue": 13
                        }
        };
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;   
        let nextRunDateTime = getDateTime();    
        let xHour = getDateTime().getUTCHours(); 
        nextRunDateTime.setUTCHours(13, 0, 0, 0);                                           
        if(xHour >= 13)              
          nextRunDateTime = addDate(nextRunDateTime, 0, 0, 1, 0, 0, 0);
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });
      it("success. run every 1st week, everyday, happened today, but already missed", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").weeklyScheduleOK));
        scheduleTestObject.startDateTime = "2018-01-01T10:00:00.000Z";
        scheduleTestObject.dayOfWeek = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        scheduleTestObject.eachNWeek = 1;
        scheduleTestObject.dailyFrequency.occursOnceAt = "00:00:01";
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;   
        let nextRunDateTime = getDateTime();
        nextRunDateTime.setUTCHours(0, 0, 1, 0);                
        nextRunDateTime = addDate(nextRunDateTime, 0, 0, 1, 0, 0, 0);
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });               
      it("failed. endDateTime restriction", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").weeklyScheduleOK));
        scheduleTestObject.startDateTime = "2018-01-20T10:00:00.000Z";
        scheduleTestObject.dayOfWeek = ["wed", "fri"];
        scheduleTestObject.eachNWeek = 1;
        scheduleTestObject.endDateTime = parseDateTime("2018-10-01T10:00:00.000Z").toISOString();
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;   
        logSchedule(scheduleTestObject, calculationResult);
        assert.isNull(calculationResult);
        done();
      });                                      
    });   

    describe("month", function() {     
      it("success. run every NY", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").monthlyScheduleOK));
        scheduleTestObject.startDateTime = "2018-01-01T10:00:00.000Z";
        scheduleTestObject.month = ["jan"];
        scheduleTestObject.day = [1];
        scheduleTestObject.dailyFrequency = { "occursOnceAt": "00:00:00" };                
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;   
        let nextRunDateTime = parseDateTime("2020-01-01T00:00:00.000Z");
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });        
      it("success. oct 15, 17, 19 once at 07:00", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").monthlyScheduleOK));
        scheduleTestObject.startDateTime = "2018-01-01T10:00:00.000Z";
        scheduleTestObject.month = ["oct"];
        scheduleTestObject.day = [15, 17, 19];
        scheduleTestObject.dailyFrequency = { "occursOnceAt": "07:00:00" };                
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;   
        let nextRunDateTime = parseDateTime("2019-10-15T07:00:00.000Z");
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });
      it("success. middle of days interval once at 00:01", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").monthlyScheduleOK));
        scheduleTestObject.startDateTime = "2018-01-01T10:00:00.000Z";
        scheduleTestObject.month =  monthList.slice(getDateTime().getUTCMonth(), getDateTime().getUTCMonth() + 1);
        let currentDay = getDateTime().getUTCDate();
        scheduleTestObject.day = [currentDay - 1, currentDay, currentDay + 1];
        scheduleTestObject.dailyFrequency = { "occursOnceAt": "00:01:00" };     
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;   
        let nextRunDateTime = getDateTime();
        nextRunDateTime.setUTCDate(scheduleTestObject.day[2]);
        nextRunDateTime.setUTCHours(0, 1, 0, 0);
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });              
      it("success. happend 1 minutes ago", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").monthlyScheduleOK));
        scheduleTestObject.startDateTime = "2018-01-01T10:00:00.000Z";
        scheduleTestObject.month =  monthList.slice(getDateTime().getUTCMonth(), getDateTime().getUTCMonth() + 1);
        scheduleTestObject.day = [getDateTime().getUTCDate()];
        //1 minutes ago
        scheduleTestObject.dailyFrequency = { "occursOnceAt": `${leadZero(getDateTime().getUTCHours())}:${leadZero(getDateTime().getMinutes() - 1)}:${leadZero(getDateTime().getSeconds())}` };                         
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;   
        let nextRunDateTime = addDate(getDateTime(), 1, 0, 0, 0, -1);
        nextRunDateTime.setMilliseconds(0);
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });               
      it("success. will happen in 1 minutes", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").monthlyScheduleOK));
        scheduleTestObject.startDateTime = "2018-01-01T10:00:00.000Z";
        scheduleTestObject.month =  monthList.slice(getDateTime().getUTCMonth(), getDateTime().getUTCMonth() + 1);
        scheduleTestObject.day = [getDateTime().getUTCDate()];
        //1 minutes in future
        scheduleTestObject.dailyFrequency = { "occursOnceAt": `${leadZero(getDateTime().getUTCHours())}:${leadZero(getDateTime().getMinutes() + 1)}:${leadZero(getDateTime().getSeconds())}` };                                        
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;   
        let nextRunDateTime = addDate(getDateTime(), 0, 0, 0, 0, +1);
        nextRunDateTime.setMilliseconds(0);
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });                  
      it("success. happen every 13 hours (date overwhelming)", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").monthlyScheduleOK));
        scheduleTestObject.startDateTime = "2018-01-01T10:00:00.000Z";
        scheduleTestObject.month =  monthList.slice(getDateTime().getUTCMonth(), getDateTime().getUTCMonth() + 1);
        scheduleTestObject.day = [getDateTime().getUTCDate()];
        scheduleTestObject.dailyFrequency = { "start": "12:00:00", "occursEvery": {"intervalValue": 13, "intervalType": "hour"}};
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;   
        let nextRunDateTime = addDate(getDateTime(), 1);
        nextRunDateTime.setUTCHours(12, 0, 0, 0);
        if(getDateTime().getUTCHours() < 12)
          nextRunDateTime = addDate(nextRunDateTime, -1);
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });              
      it("success. happen every 13 hours (date overwhelming with next day)", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").monthlyScheduleOK));
        scheduleTestObject.startDateTime = "2018-01-01T10:00:00.000Z";
        scheduleTestObject.endDateTime = "2118-01-01T10:00:00.000Z";
        scheduleTestObject.month =  monthList.slice(getDateTime().getUTCMonth(), getDateTime().getUTCMonth() + 1);
        scheduleTestObject.day = [getDateTime().getUTCDate() + 1, getDateTime().getUTCDate()];
        scheduleTestObject.dailyFrequency = { "start": "12:00:00", "occursEvery": {"intervalValue": 13, "intervalType": "hour"}};
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;   
        let nextRunDateTime = addDate(getDateTime(), 0, 0, 1);
        nextRunDateTime.setUTCHours(12, 0, 0, 0);
        if(getDateTime().getUTCHours() < 12)
          nextRunDateTime = addDate(nextRunDateTime, 0, 0, -1);                
        logSchedule(scheduleTestObject, calculationResult, nextRunDateTime);
        assert.equalDate(calculationResult, nextRunDateTime);
        assert.equalTime(calculationResult, nextRunDateTime);
        done();
      });   
      it("failed. run every NY, endDateTime restriction (5 minutes ago)", function(done) {               
        let scheduleTestObject = JSON.parse(JSON.stringify(require("./test_data").monthlyScheduleOK));
        scheduleTestObject.startDateTime = "2018-01-01T10:00:00.000Z";
        scheduleTestObject.endDateTime = addDate(getDateTime(), 0, 0, 0, 0, -5).toISOString();
        scheduleTestObject.month = ["jan"];
        scheduleTestObject.day = [1];
        scheduleTestObject.dailyFrequency = { "occursOnceAt": "00:00:00" };                
        let calculationResult = schedule.nextOccurrence(scheduleTestObject).result;   
        logSchedule(scheduleTestObject, calculationResult, null);
        assert.isNull(calculationResult);
        done();
      });                                                                                   
    });   
  });
});    
