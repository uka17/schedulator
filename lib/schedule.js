//Schedule main engine
let getDateTime = require('./tools').getDateTime;
let addDate = require('./tools').addDate;
let parseDateTime = require('./tools').parseDateTime;
let monthList = require('./tools').monthList;
let weekDayList = require('./tools').weekDayList;
let scheduleModel = require('./models.json');
var Ajv = require('ajv');
let ajv = new Ajv();
ajv.addSchema(scheduleModel.scheduleSchemaDaily);

/**
 * Calculates next run time for already calculated day
 * @param {object} schedule Schedule for which next run time should be calculated
 * @param {object} runDate Day of next run with 00:00 time
 * @returns {object} Next run date and time or null in case if next run time is out of runDate range (e.g. attempt to calculate 'each 13 hours' at 19:00) 
 * or already in past (e.g. attempt to calculate '11:00' at 11:05)
 */
function calculateTimeOfRun(schedule, runDate) {  
    //as with simple = ref will be created we need to clone Date object
    let runDateTime = new Date(runDate);

    if(schedule.dailyFrequency.hasOwnProperty('occursOnceAt')) {
        let time = schedule.dailyFrequency.occursOnceAt.split(':');
        runDateTime.setUTCHours(time[0], time[1], time[2]); //it should put time in UTC, but it puts it in local        
        if(runDateTime > getDateTime())
            return runDateTime;
        else
            return null;                                   
    }

    if(schedule.dailyFrequency.hasOwnProperty('occursEvery')) {
        let time = schedule.dailyFrequency.start.split(':');
        //milliseconds should be removed?
        runDateTime.setUTCHours(time[0], time[1], time[2], 0);
        while(runDateTime < getDateTime()) {
            //TODO nice to have interval like 03:30 (both hour and minutes)
            switch(schedule.dailyFrequency.occursEvery.intervalType) {
                case 'minute':
                    runDateTime = addDate(runDateTime, 0, 0, 0, 0, schedule.dailyFrequency.occursEvery.intervalValue);
                break;
                case 'hour':
                    runDateTime = addDate(runDateTime, 0, 0, 0, schedule.dailyFrequency.occursEvery.intervalValue);
                break;
            }
        }
        if(runDate.getUTCDate() == runDateTime.getUTCDate())
            return runDateTime;   
        else
            return null;
        
    }
}
/**
 * Scans week which starts with weekStart and tries to find date for run
 * @param {object} schedule Schedule for which next run time should be calculated
 * @param {object} weekStart Date of sunday (0 day of week)
 * @returns {object} Date or next run or null in case if date was not calculated
 */
function calculateWeekDayOfRun(schedule, weekStart) {
    let currentDay = weekStart;
    let weekDayLastIndex = 0;
    for (let i = 0; i < schedule.dayOfWeek.length; i++) {
        let weekDayIndex = weekDayList.indexOf(schedule.dayOfWeek[i]);
        if(weekDayIndex != -1) {
            currentDay = addDate(currentDay, 0, 0, weekDayIndex - weekDayLastIndex);
            weekDayLastIndex = weekDayIndex;
            //day calculating time found - don't go next
            let calculationResult = calculateTimeOfRun(schedule, currentDay);
            if(calculationResult) {            
                if(calculationResult > parseDateTime(schedule.startDateTime))
                    return calculationResult;
                currentDay = calculationResult;
            }
        }        
    }   
    return null;
}
/**
 * Calculates next run date and time 
 * @param {object} schedule Schedule for which next run date and time should be calculated
 * @returns {object} Next run date and time or null in case if next run date and time can not be calculated
 */ 
module.exports.nextOccurrence = (schedule) => {     
    //check if schedule is a valid JSON object    
    let validate = ajv.compile(scheduleModel.scheduleSchema);
    let valid = validate(schedule);
    if(!valid)
        throw new Error(ajv.errorsText(validate.errors));
    
    let result = null;     
    //oneTime
    if(schedule.hasOwnProperty('oneTime')) {        
        let oneTime = schedule.oneTime;        
        if(parseDateTime(oneTime) > parseDateTime(getDateTime()))
            result = oneTime;
    }
    //eachNDay 
    if(schedule.hasOwnProperty('eachNDay')) {        
        //searching for a day of run        
        let currentDate = new Date((new Date()).setUTCHours(0, 0, 0, 0));
        //due to save milliseconds and not link newDateTime object with schedule.startDateTime
        let newDateTime = new Date(parseDateTime(schedule.startDateTime));
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
    if(schedule.hasOwnProperty('eachNWeek')) {               
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
            if(calculationResult)
                newDateTime = calculationResult;
        }        

        result = newDateTime;      
    }  
    //month
    if(schedule.hasOwnProperty('month')) {                               
        let newDateTime = new Date(parseDateTime(schedule.startDateTime));
        let currentDatetime = getDateTime();
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
    if(schedule.endDateTime && result)
        return result > parseDateTime(schedule.endDateTime) ? null : result;        
    else
        return result == null ? null : parseDateTime(result);
}