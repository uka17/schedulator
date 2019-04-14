let schedule = require('./lib/schedule');

let scheduleTestObject = {
	"startDateTime": "2020-01-01T00:00:01.000Z",
	"endDateTime": "2020-12-31T23:59:59.000Z",
	"eachNWeek": 3,
	"dayOfWeek": ['wed', 'fri', 'mon'],
	"dailyFrequency": { "occursOnceAt": "11:11:11"}
}	
console.log(schedule.nextOccurrence(scheduleTestObject));