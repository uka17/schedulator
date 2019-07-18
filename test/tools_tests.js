//dateTime unit tests
var chai  = require('chai');
chai.use(require('chai-datetime'))
var assert = chai.assert;

var addDate = require('../lib/tools').addDate;
var parseDateTime = require('../lib/tools').parseDateTime;
var getTimefromDateTime = require('../lib/tools').getTimefromDateTime;
var leadZero = require('../lib/tools').leadZero;


describe('tools', function() {
  it('getTimefromDateTime. date provided and leading zeroes', function(done) {
    let nDateTime = parseDateTime('2018-01-31T02:03:04.071Z');
    assert.equal(getTimefromDateTime(nDateTime), '02:03:04');
    done();
  });           
  it('getTimefromDateTime. date provided and no need to add leading zeroes', function(done) {
    let nDateTime = parseDateTime('2018-01-31T12:13:14.071Z');
    assert.equal(getTimefromDateTime(nDateTime), '12:13:14');
    done();
  });                   
  it('getTimefromDateTime. date is not provided', function(done) {
    assert.include( (new Date()).toUTCString(), getTimefromDateTime()); 
    done();
  });           
  it('addDate 1+', function(done) {
    let expected = parseDateTime('2018-01-31T02:02:02.071Z');        
    let initial = parseDateTime('2018-01-31T01:01:01.071Z');
    initial = addDate(initial, 0, 0, 0, 1, 1, 1);
    assert.equalDate(initial, expected);
    assert.equalTime(initial, expected);
    done();
  });         
  it('addDate 2+', function(done) {
    let initial = parseDateTime('2018-02-28T23:00:00.000Z');            
    let expected = parseDateTime('2018-03-01T01:00:00.000Z');
    initial = addDate(initial, 0, 0, 0, 2);
    assert.equalDate(initial, expected);
    assert.equalTime(initial, expected);
    done();
  });            
  it('addDate 3+', function(done) {
    let initial = parseDateTime('2018-06-10T02:02:02.071Z');            
    let expected = parseDateTime('2019-06-10T02:02:02.071Z');
    initial = addDate(initial, 1, 0, 0, 0, 0, 0);
    assert.equalDate(initial, expected);
    assert.equalTime(initial, expected);
    done();
  });             
  it('addDate 4-', function(done) {
    let expected = parseDateTime('2018-01-31T01:01:01.000Z');            
    let initial = parseDateTime('2018-01-31T02:02:02.000Z');
    initial = addDate(initial, 0, 0, 0, -1, -1, -1);
    assert.equalDate(initial, expected);
    assert.equalTime(initial, expected);
    done();
  });         
  it('addDate 5-', function(done) {
    let initial = parseDateTime('2018-05-01T01:00:00.000Z');            
    let expected = parseDateTime('2018-04-30T23:00:00.000Z');
    initial = addDate(initial, 0, 0, 0, -2, 0, 0);
    assert.equalDate(initial, expected);
    assert.equalTime(initial, expected);
    done();
  });            
  it('addDate 6-', function(done) {
    let initial = parseDateTime('2019-06-10T02:02:02.071Z');            
    let expected = parseDateTime('2018-06-10T02:02:02.071Z');
    initial = addDate(initial, -1, 0, 0, 0, 0, 0);
    assert.equalDate(initial, expected);
    assert.equalTime(initial, expected);
    done();
  });          
  it('addDate 7+, undefined parameter', function(done) {
    let initial = parseDateTime('2001-01-01T01:01:01.000Z');            
    let expected = parseDateTime('2002-01-01T01:01:01.000Z');
    initial = addDate(initial, 1);
    assert.equalDate(initial, expected);
    assert.equalTime(initial, expected);
    done();
  });                  
  it('parseDateTime. success', function(done) {
    let dateTime = new Date(Date.parse('2019-06-10T02:02:02.071Z'));
    assert.equalDate(parseDateTime('2019-06-10T02:02:02.071Z'), dateTime);
    assert.equalTime(parseDateTime('2019-06-10T02:02:02.071Z'), dateTime);
    done();
  });        
  it('parseDateTime. failure', function(done) {
    assert.isNull(parseDateTime(true));
    done();
  });    
  it('leadZero. success 3 > 03', function(done) {
    assert.equal(leadZero(3), '03');
    done();
  });  
  it('leadZero. success 11 > 11', function(done) {
    assert.equal(leadZero(11), '11');
    done();
  });          
});           
