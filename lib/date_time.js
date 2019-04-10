//Date-time functions and helpers
module.exports.monthList = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
module.exports.weekDayList = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

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
    let hours = currentDateTime.getUTCHours();
    let minutes = currentDateTime.getUTCMinutes();
    let seconds = currentDateTime.getUTCSeconds();
    //let hours = currentDateTime.getHours();
    //let minutes = currentDateTime.getMinutes();
    //let seconds = currentDateTime.getSeconds();
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;    
    return hours + ':' + minutes + ':' + seconds;
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
    let result = parseDateTime('2000-01-01T00:00:00.000Z');
    
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
