# schedulator
Simple schedule handling tool. Allows to create JSON schedule scheme and calculate next run based on it. Scheme has clear, readable and people-friendly format.
## Installation
`~$ npm install schedulator`
## Shut up and show me how to use it
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
//2019-01-02T11:30:00.000Z
```
> All examples here and later calculated based on fact that current date time is `2018-12-31T10:00:00.000Z`

## Schedule methods
### nextOccurrence(scheduleObject)
Returns UTC date and time of nearest next occurrence of `scheduleObject` in ISO format (e.g. 2019-01-01T01:00:00.000Z). Method returns `null` in case if it is not possible to calculate next occurrence or `scheduleObject` has `endDateTime` in the past or event had one time schedule which already happened.
> Exception with error text will be thrown in case if `scheduleObject` contains incorrect schedule schema.
```javascript
let schedule = require('schedulator');
let scheduleTestObject = 
{
    "oneTime": "2019-01-01T01:00:00.000Z"
}
console.log(schedule.nextOccurrence(scheduleTestObject));
//2019-01-01T01:00:00.000Z
```
## Schedule object
Schedule object describes scheduling rule in JSON format and can be presented by one time, daily, weekly or monthly entry.

> All schemas will be validated before calculation of next occurence. Exception with error will be thrown in case of any schema mismath. 

### one time
Event happens only once and is not going to be repeated.

 - `oneTime` - string, UTC date and time of event in ISO format.

```javascript
let scheduleTestObject = 
{ 
    "oneTime": "2019-01-01T01:00:00.000Z"
}
```
### daily
Event happens ones per each `n` day according to [dailyFrequency](#dailyFrequency) field value.

- `startDateTime` - string, required. UTC date and time in ISO format since when schedule starts to be active. Will be used as a run date-time in case if it fits to run cundition.  
- `endDateTime` - string, optional. UTC date and time in ISO format till when schedule is active. `nextOccurrence` returns `null` if this date is earlier when current date and time. Schedule without this attribute will always be active.
- `eachNDay` - integer, required. Frequency of occurrence in calendar days. Minimum 1.
- `dailyFrequency` - object, required. Represents occurrence of event in scope of the day (qv [dailyFrequency](#dailyFrequency)).

```javascript
let scheduleTestObject = 
{ 
	"startDateTime": "2020-01-31T20:54:23.071Z",
	"endDateTime": "2021-01-31T20:54:23.071Z",
	"eachNDay": 2,
	"dailyFrequency": { "occursOnceAt": "11:11:11"}
}
//2020-02-02T11:11:11.000Z
```
### weekly
Event happens ones per each `n` week according to [dailyFrequency](#dailyFrequency) field value.

- `startDateTime` - string, required. UTC date and time in ISO format since when schedule starts to be active. Will be used as a run date-time in case if it fits to run cundition.  
- `endDateTime` - string, optional. UTC date and time in ISO format till when schedule is active. `nextOccurrence` returns `null` if this date is earlier when current date and time. Schedule without this attribute will always be active.
- `eachNWeek` - integer, required. Frequency of occurrence in weeks. Minimum 1.
- `dayOfWeek` - array of string, required. Which days of week event should be triggered. Array should contain unique elements. Reference: `["sun", "mon", "tue", "wed", "thu", "fri", "sat"]`
- `dailyFrequency` - object, required. Represents occurrence of event in scope of the day (qv [dailyFrequency](#dailyFrequency)).

> Note: Sunday is being considered as a first day of week. Array `dayOfWeek` can have any order. For example, both `["sun", "mon", "tue"]` and `["tue", "sun", "mon"]` variants are valid.

```javascript
let scheduleTestObject = {
	"startDateTime": "2020-01-01T00:00:01.000Z",
	"endDateTime": "2020-12-31T23:59:59.000Z",
	"eachNWeek": 3,
	"dayOfWeek": ['mon', 'wed', 'fri'],
	"dailyFrequency": { "occursOnceAt": "11:11:11"}
}	
//2020-01-13T11:11:11.000Z
```
### monthly
Event happens ones per each `n` month according to [dailyFrequency](#dailyFrequency) field value.

- `startDateTime` - string, required. UTC date and time in ISO format since when schedule starts to be active. Will be used as a run date-time in case if it fits to run cundition.  
- `endDateTime` - string, optional. UTC date and time in ISO format till when schedule is active. `nextOccurrence` returns `null` if this date is earlier when current date and time. Schedule without this attribute will always be active.
- `month` - array of string, required. Which months event should be triggered. Array should contain unique elements. Reference: `["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]`
- `day` - array of integer, required. Which days of month event should be triggered. Array should contain unique elements. Each and every element should lie between 0 and 32.
- `dailyFrequency` - object, required. Represents occurrence of event in scope of the day (qv [dailyFrequency](#dailyFrequency)).

> Note: Arrays `month` and `day` can have any order. For example, all variants `["jul", "sep", "may"]` and `["may", "jul", "sep"]`, `[1, 2, 3]` and `[3, 2, 1]` are valid.

```javascript
let scheduleTestObject = {
	"startDateTime": "2020-01-01T00:00:01.000Z",
	"endDateTime": "2020-12-31T23:59:59.000Z",
    "month": ["jul", "sep"],
    "day": [11, 2, 8, 1],
    "dailyFrequency": { "occursOnceAt": "11:11:11"}
}	
//2020-07-01T11:11:11.000Z
```
### dailyFrequency
Daily, weekly and monthly schedule contains `dailyFrequency` value which presents occurrence of event in scope of the day.