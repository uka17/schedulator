# schedulator
Simple schedule handling tool. Allows to create JSON schedule scheme and calculate next run based on it. Scheme has clear, readable and people-friendly format.
 ## 1. Installation
    ~$ npm install schedulator
 ## 2. Shut up and show me how to use it
```
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
```
 ## 3. Schedule schema
 TBD
