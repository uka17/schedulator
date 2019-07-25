# schedulator
[![Build Status](https://travis-ci.org/uka17/schedulator.svg?branch=master)](https://travis-ci.org/uka17/schedulator)
[![npm](https://img.shields.io/npm/v/schedulator.svg)](https://www.npmjs.com/package/schedulator)
[![npm downloads](https://img.shields.io/npm/dm/schedulator.svg)](https://www.npmjs.com/package/schedulator)
[![Coverage Status](https://coveralls.io/repos/github/uka17/schedulator/badge.svg?)](https://coveralls.io/github/uka17/schedulator)

Simple schedule handling tool. Allows to create JSON schedule scheme and calculate next run based on it. Scheme has clear, readable and human-friendly format.

## Table of content
- [Installation](#installation)
- [Shut up and show me how to use it](#shut-up-and-show-me-how-to-use-it)
- [Schedule methods](#schedule-methods)
  * [nextOccurrence(scheduleObject)](#nextoccurrence-scheduleobject-)
- [Schedule object](#schedule-object)
  * [enabled](#enabled)
  * [oneTime](#onetime)
  * [daily](#daily)
  * [weekly](#weekly)
  * [monthly](#monthly)
  * [dailyFrequency](#dailyfrequency)
    + [once](#once)
    + [every](#every)

## Installation
Node
`~$ npm install schedulator`

Web
`<script src="schedulator-min.js"></script>`
## Shut up and show me how to use it
Node
```javascript
let schedule = require('schedulator');
let scheduleTestObject = 
{
  "startDateTime": "2019-01-01T01:00:00.000Z",
  "eachNWeek": 1,
  "dayOfWeek": ['mon', 'wed', 'fri'],
  "dailyFrequency": { "occursOnceAt": "11:30:00"}
}
console.log(schedule.nextOccurrence(scheduleTestObject));
//{"result": 2019-01-02T11:30:00.000Z, "error": null}
```
Web
```html
<!DOCTYPE html>
<html>
<head>
    <script src="schedulator-min.js"></script>
</head>
<body>
<script>
  var scheduleTestObject = 
  {
  "startDateTime": "2019-01-01T01:00:00.000Z",
  "eachNWeek": 1,
  "dayOfWeek": ['mon', 'wed', 'fri'],
  "dailyFrequency": { "occursOnceAt": "11:30:00"}
  }
  alert('Next occurrence: ' + schedule.nextOccurrence(scheduleTestObject).result);
  //{"result": 2019-01-02T11:30:00.000Z, "error": null}
</script>
</body>
</html> 
```
> All examples here and later calculated based on fact that current date time is `2018-12-31T10:00:00.000Z`

## Schedule methods
### nextOccurrence(scheduleObject)
Returns object with UTC date and time of nearest next occurrence of `scheduleObject` in ISO format (e.g. 2019-01-31T13:00:00.000Z) and error messages if value can not be calculated. Object contains 2 fields:
- `result` - date-time of next occurence or `null` in case of one of next clauses: 
  * it is not possible to calculate next occurrence 
  * `endDateTime` of `scheduleObject` is in the past 
  * event had `oneTime` schedule which already happened
- `error` - error message in case if it is not possible to calculate next occurence and `null` in case if calculation was done succesfully

```javascript
let schedule = require('schedulator');
let scheduleTestObject = 
{
 "oneTime": "2019-01-01T01:00:00.000Z"
}
console.log(schedule.nextOccurrence(scheduleTestObject));
//{"result": 2019-01-01T01:00:00.000Z, "error": null}

let scheduleOutdatedTestObject = 
{ 
	"startDateTime": "2018-12-31T01:00:00.000Z",
	"endDateTime": "2001-12-31T01:00:00.000Z",
    "month": ["dec", "jul"],
    "day": [29, 30, 31],
    "dailyFrequency": { 
		"start": "09:00:00", 
		"occursEvery": {
			"intervalValue": 90, 
			"intervalType": "minute"
		}
	}
}
console.log(schedule.nextOccurrence(scheduleOutdatedTestObject));
//{ result: null, error: 'calculated date-time earlier than endDateTime' }
```
## Schedule object
Schedule object describes scheduling rule in JSON format and can be presented by `oneTime`, `daily`, `weekly` or `monthly` entry. Additionally schedule object contain `enabled` property which is not mandatory.

> All schemas will be validated before run of `nextOccurrence` method. Error will be returned in `result.error` in case of any schema mismatch.  

```javascript
let schedule = require('schedulator');
let scheduleTestObject = 
{
  "oneTime": 1
}
console.log(schedule.nextOccurrence(scheduleTestObject));
//{ result: null, error: 'schema is incorrect: data.oneTime should be string, data should NOT have additional properties, data should NOT have additional properties, data should NOT have additional properties, data should match exactly one schema in oneOf' }
```
### enabled
Next run can be calculate only in case if `enabled` is `true`, otherwise error will be returned.

```javascript
let schedule = require('schedulator');
let scheduleTestObject = 
{ 
 "enabled": false,
 "oneTime": "2019-01-01T01:00:00.000Z"
}
console.log(schedule.nextOccurrence(scheduleTestObject));
//{"result": null, error: "schedule is disabled"}
```

### oneTime
Event happens only once and is not going to be repeated.

 - `oneTime` - string, UTC date and time of event in ISO format (e.g. 2019-01-31T13:00:00.000Z).

```javascript
let schedule = require('schedulator');
let scheduleTestObject = 
{ 
 "oneTime": "2019-01-01T01:00:00.000Z"
}
console.log(schedule.nextOccurrence(scheduleTestObject));
//{"result": 2019-01-01T01:00:00.000Z, "error": null}
```
### daily
Event happens ones per `n` day(s) according to [dailyFrequency](#dailyFrequency) field value.

- `startDateTime` - string, required. UTC date and time in ISO format (e.g. 2019-01-31T13:00:00.000Z) since when schedule starts to be active. Will be used as a run date-time in case if it fits to run condition.  
- `endDateTime` - string, optional. UTC date and time in ISO format (e.g. 2019-01-31T13:00:00.000Z) till when schedule is active. `nextOccurrence` returns `null` if this date is earlier when current date and time. Schedule without this attribute will always be active.
- `eachNDay` - integer, required. Frequency of occurrence in calendar days. Minimum `1`.
- `dailyFrequency` - object, required. Defines occurrence of event in scope of the day (qv [dailyFrequency](#dailyFrequency)).

```javascript
let schedule = require('schedulator');
let scheduleTestObject = 
{ 
 "startDateTime": "2020-01-31T20:54:23.071Z",
 "endDateTime": "2021-01-31T20:54:23.071Z",
 "eachNDay": 2,
 "dailyFrequency": { "occursOnceAt": "11:11:11"}
}
console.log(schedule.nextOccurrence(scheduleTestObject));
//{"result": 2020-02-02T11:11:11.000Z, "error": null}
```
### weekly
Event happens ones per `n` week(s) according to [dailyFrequency](#dailyFrequency) field value.

- `startDateTime` - string, required. UTC date and time in ISO format (e.g. 2019-01-31T13:00:00.000Z) since when schedule starts to be active. Will be used as a run date-time in case if it fits to run condition.  
- `endDateTime` - string, optional. UTC date and time in ISO format (e.g. 2019-01-31T13:00:00.000Z) till when schedule is active. `nextOccurrence` returns `null` if this date-time is earlier when current date-time. Schedule without this attribute will always be active.
- `eachNWeek` - integer, required. Frequency of occurrence in weeks. Minimum `1`.
- `dayOfWeek` - array of string, required. Which days of week event should be triggered. Array should contain unique elements. Reference: `["sun", "mon", "tue", "wed", "thu", "fri", "sat"]`
- `dailyFrequency` - object, required. Defines occurrence of event in scope of the day (qv [dailyFrequency](#dailyFrequency)).

> Sunday is being considered as a first day of week. 
> Array `dayOfWeek` can have any order. For example, both `["sun", "mon", "tue"]` and `["tue", "sun", "mon"]` variants are valid.

```javascript
let schedule = require('schedulator');
let scheduleTestObject = {
 "startDateTime": "2020-01-01T00:00:01.000Z",
 "endDateTime": "2020-12-31T23:59:59.000Z",
 "eachNWeek": 3,
 "dayOfWeek": ['mon', 'wed', 'fri'],
 "dailyFrequency": { "occursOnceAt": "11:11:11"}
}	
console.log(schedule.nextOccurrence(scheduleTestObject));
//{"result": 2020-01-13T11:11:11.000Z, "error": null}
```
### monthly
Event happens ones per each month mentioned and according to [dailyFrequency](#dailyFrequency) field value.

- `startDateTime` - string, required. UTC date and time in ISO format (e.g. 2019-01-31T13:00:00.000Z) since when schedule starts to be active. Will be used as a run date-time in case if it fits to run condition.  
- `endDateTime` - string, optional. UTC date and time in ISO format (e.g. 2019-01-31T13:00:00.000Z) till when schedule is active. `nextOccurrence` returns `null` if this date-time is earlier when current date-time. Schedule without this attribute will always be active.
- `month` - array of string, required. Defines during which months event should trigger. Array should contain unique elements. Reference: `["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]`
- `day` - array of integer, required. Defines days of month event should trigger. Array should contain unique elements. Each and every element should lie between `0` and `32`.
- `dailyFrequency` - object, required. Defines occurrence of event in scope of the day (qv [dailyFrequency](#dailyFrequency)).

> Arrays `month` and `day` can have any order. For example, all variants `["jul", "sep", "may"]` and `["may", "jul", "sep"]`, `[1, 2, 3]` and `[3, 2, 1]` are valid.

```javascript
let schedule = require('schedulator');
let scheduleTestObject = {
 "startDateTime": "2020-01-01T00:00:01.000Z",
 "endDateTime": "2020-12-31T23:59:59.000Z",
 "month": ["jul", "sep"],
 "day": [11, 2, 8, 1],
 "dailyFrequency": { "occursOnceAt": "11:11:11"}
}
console.log(schedule.nextOccurrence(scheduleTestObject));
//{"result": 2020-07-01T11:11:11.000Z, "error": null}
```
### dailyFrequency
Daily, weekly and monthly schedule contains `dailyFrequency` attribute which defines occurrence of event in scope of the day. Can be either `once` (happens only once per day) or `every` (happens several times per day based on the clause).

#### once
Happens only once per day at proper time.

- `occursOnceAt` - string, requiered. Time (format hh:mm:ss) when event should be triggered.

```javascript
let schedule = require('schedulator');
let scheduleTestObject = 
{ 
 "startDateTime": "2020-01-31T20:54:23.071Z",
 "eachNDay": 1,
 "dailyFrequency": { "occursOnceAt": "11:11:11"}
}
console.log(schedule.nextOccurrence(scheduleTestObject));
//{"result": 2020-02-01T11:11:11.000Z, "error": null}
```
#### every
Event happens starting from `start` time and repeats either till the end of the day or till time defined by `end` parameter accordingly to `occursEvery` condition. 

- `start` - string, required. Indicates start time (format `hh:mm:ss`) of the schedule and first occurrence in scope of the day.
- `end` - string, required. Indicates end time (format `hh:mm:ss`) of schedule duration in scope of the day.
- `occursEvery` - object, required. Object which defines repetitive condition for event. 

>  [nextOccurrence](#nextOccurrence(scheduleObject)) method returns `null` as a result in case if `start` time later or equal to `end` time.

Repeat condition `occursEvery` is calculated based on `intervalValue` and `intervalType` attibutes.

- `intervalValue` - integer, required. Event happens each `n` minutes or hours presented by this parameter. Minimum `1`.
- `intervalType` - string, required. Defines type of interval. Reference: `["minute", "hour"]`

```javascript
let schedule = require('schedulator');
let scheduleTestObject = 
{ 
	"startDateTime": "2018-12-31T01:00:00.000Z",
    "month": ["dec", "jul"],
    "day": [29, 30, 31],
    "dailyFrequency": { 
		"start": "09:00:00", 
		"occursEvery": {
			"intervalValue": 90, 
			"intervalType": "minute"
		}
	}
}
//Considering script runs at 2018-12-31T10:00:00.000Z...
console.log(schedule.nextOccurrence(scheduleTestObject));
//{"result": 2018-12-31T10:30:00.000Z, "error": null}
```
