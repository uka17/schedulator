let schedule = require('./lib/schedule');
let scheduleTestObject =
	{
		"name": "weekly",
		"enabled": true,
		"startDateTime": "2019-01-01T01:00:00.000Z",
		"eachNWeek": 1,
		"dayOfWeek": ['mon', 'wed', 'fri'],
		"dailyFrequency": { "occursOnceAt": "11:30:00"}
	}
console.log(schedule.nextOccurrence(scheduleTestObject));