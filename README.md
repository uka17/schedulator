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
> All examples here and later calculated based on fact that current date time is 2018-12-31T10:00:00.000Z

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
Event happens one per each `n` day according to [dailyFrequency](#dailyFrequency) field value.

- `startDateTime` - string, required. UTC date and time in ISO format since when schedule starts to be active.
- `endDateTime` - string, optional. UTC date and time in ISO format till when schedule is active. `nextOccurrence` returns `null` if this date is earlier when current date and time. Schedule without this attribute will always be active.
- `eachNDay` - integer, required. Frequency of occurrence. 
- `dailyFrequency` - object, required. Represents occurrence of event in scope of the day (qv [dailyFrequency](#dailyFrequency)).

```javascript
let scheduleTestObject = 
{ 
	"startDateTime": "2018-01-31T20:54:23.071Z",
	"endDateTime": "2019-01-31T20:54:23.071Z",
    "eachNDay": 2,
    "dailyFrequency": { "occursOnceAt": "11:11:11"}
}
//
```
### weekly
Event happens one per each `n` week according to [dailyFrequency](#dailyFrequency) field value.
### monthly
Event happens one per each `n` month according to [dailyFrequency](#dailyFrequency) field value.
### dailyFrequency
Daily, weekly and monthly schedule contains `dailyFrequency` value which presents occurrence of event in scope of the day.