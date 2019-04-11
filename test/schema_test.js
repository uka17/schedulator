let assert  = require('chai').assert;
let scheduleModel = require('../lib/models.json');
let testData = require('./test_data');
let DataVsSchemaResult = require('../lib/tools').DataVsSchemaResult;
let DataVsSchemaErrors = require('../lib/tools').DataVsSchemaErrors;

//test data preparation
let oneTimeSchedule = testData.oneTimeScheduleOK;
let dailyScheduleOnce = testData.dailyScheduleOnceOK;
let dailyScheduleEvery = testData.dailyScheduleEveryOK;
let weeklySchedule = testData.weeklyScheduleOK;
let monthlySchedule = testData.monthlyScheduleOK;
//---
describe('schema validation', function() {
    describe('schedule', function() {
        describe('oneTime', function() {
            it('initial validation. OK', function(done) {        
                let nOneTimeSchedule = JSON.parse(JSON.stringify(oneTimeSchedule));
                assert.equal(DataVsSchemaResult(nOneTimeSchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), true);
                done();
            })
            it('incorrect "name" type', function(done) {                                            
                let nOneTimeSchedule = JSON.parse(JSON.stringify(oneTimeSchedule));
                nOneTimeSchedule.name = 1;
                assert.equal(DataVsSchemaResult(nOneTimeSchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nOneTimeSchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.name should be string');
                done();
            })
            it('incorrect "enabled" type', function(done) {                                            
                let nOneTimeSchedule = JSON.parse(JSON.stringify(oneTimeSchedule));
                nOneTimeSchedule.enabled = 1;
                assert.equal(DataVsSchemaResult(nOneTimeSchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nOneTimeSchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.enabled should be boolean');
                done();
            })
            it('incorrect "oneTime" type', function(done) {                                            
                let nOneTimeSchedule = JSON.parse(JSON.stringify(oneTimeSchedule));
                nOneTimeSchedule.oneTime = 1;
                assert.equal(DataVsSchemaResult(nOneTimeSchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nOneTimeSchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.oneTime should be string');
                done();
            })
            it('incorrect "oneTime" format', function(done) {                                            
                let nOneTimeSchedule = JSON.parse(JSON.stringify(oneTimeSchedule));
                nOneTimeSchedule.oneTime = '18-12-1984 11:11:11';
                assert.equal(DataVsSchemaResult(nOneTimeSchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nOneTimeSchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.oneTime should match format "date-time"');
                done();
            })            
            it('extra property', function(done) {                                            
                let nOneTimeSchedule = JSON.parse(JSON.stringify(oneTimeSchedule));
                nOneTimeSchedule['bla'] = 1;
                assert.equal(DataVsSchemaResult(nOneTimeSchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nOneTimeSchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data should NOT have additional properties');
                done();
            })                              
            it('requiered fileds "name" issue', function(done) {                                            
                let nOneTimeSchedule = JSON.parse(JSON.stringify(oneTimeSchedule));
                delete nOneTimeSchedule.name;
                assert.equal(DataVsSchemaResult(nOneTimeSchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nOneTimeSchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), "data should have required property 'name'");
                done();
            })                             
        });
        describe('daily', function() {
            describe('general checks', function() {
                it('initial validation dailyScheduleOnce. OK', function(done) {                            
                    let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                    assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), true);
                    done();
                })
                it('initial validation dailyScheduleEvery. OK', function(done) {                            
                    let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleEvery));
                    assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), true);
                    done();
                })
                it('incorrect "name" type', function(done) {                                            
                    let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                    nDailyScheduleOnce.name = 1;
                    assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                    assert.include(DataVsSchemaErrors(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.name should be string');
                    done();
                })
                it('incorrect "enabled" type', function(done) {                                            
                    let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                    nDailyScheduleOnce.enabled = 1;
                    assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                    assert.include(DataVsSchemaErrors(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.enabled should be boolean');
                    done();
                })
                it('incorrect "eachNDay" type', function(done) {                                            
                    let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                    nDailyScheduleOnce.eachNDay = true;
                    assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                    assert.include(DataVsSchemaErrors(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.eachNDay should be integer');
                    done();
                })
                it('incorrect "dailyFrequency" type', function(done) {                                            
                    let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                    nDailyScheduleOnce.dailyFrequency = 1;
                    assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                    assert.include(DataVsSchemaErrors(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency should be object');
                    done();
                })                
                it('incorrect "eachNDay" =0', function(done) {                                            
                    let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                    nDailyScheduleOnce.eachNDay = 0;
                    assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                    assert.include(DataVsSchemaErrors(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.eachNDay should be >= 1');
                    done();
                })
                it('incorrect "eachNDay" <0', function(done) {                                            
                    let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                    nDailyScheduleOnce.eachNDay = -1;
                    assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                    assert.include(DataVsSchemaErrors(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.eachNDay should be >= 1');
                    done();
                })                                         
                it('extra property', function(done) {                                            
                    let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                    nDailyScheduleOnce['bla'] = 1;
                    assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                    assert.include(DataVsSchemaErrors(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data should NOT have additional properties');
                    done();
                })        
                it('excluding noт mandatory field. OK', function(done) {                                            
                    let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                    delete nDailyScheduleOnce.endDateTime;
                    assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), true);
                    done();
                })                             
                it('requiered fileds "name" issue', function(done) {                                            
                    let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                    delete nDailyScheduleOnce.name;
                    assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                    assert.include(DataVsSchemaErrors(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), "data should have required property 'name'");
                    done();
                })    
                it('requiered fileds "eachNDay" issue', function(done) {                                            
                    let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                    delete nDailyScheduleOnce.eachNDay;
                    assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                    assert.include(DataVsSchemaErrors(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), "data should have required property 'eachNDay'");
                    done();
                })           
                describe('once', function() {
                    it('incorrect "dailyFrequency.occursOnceAt" type', function(done) {                                            
                        let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                        nDailyScheduleOnce.dailyFrequency.occursOnceAt = 1;
                        assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                        assert.include(DataVsSchemaErrors(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency.occursOnceAt should be string');
                        done();
                    })
                    it('incorrect "dailyFrequency.occursOnceAt" format (11)', function(done) {                                            
                        let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                        nDailyScheduleOnce.dailyFrequency.occursOnceAt = '11';
                        assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                        assert.include(DataVsSchemaErrors(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency.occursOnceAt should match format "time"');
                        done();
                    })
                    it('incorrect "dailyFrequency.occursOnceAt" format (11:11:99)', function(done) {                                            
                        let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                        nDailyScheduleOnce.dailyFrequency.occursOnceAt = '11:11:99';
                        assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                        assert.include(DataVsSchemaErrors(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency.occursOnceAt should match format "time"');
                        done();
                    })        
                    it('extra property', function(done) {                                            
                        let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                        nDailyScheduleOnce.dailyFrequency['bla'] = 1;
                        assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                        assert.include(DataVsSchemaErrors(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency should NOT have additional properties');
                        done();
                    })                    
                    it('requiered fileds "occursOnceAt" issue', function(done) {                                            
                        let nDailyScheduleOnce = JSON.parse(JSON.stringify(dailyScheduleOnce));
                        delete nDailyScheduleOnce.dailyFrequency.occursOnceAt;
                        assert.equal(DataVsSchemaResult(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                        assert.include(DataVsSchemaErrors(nDailyScheduleOnce, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), "data.dailyFrequency should have required property 'occursOnceAt'");
                        done();
                    })                                  
                })
                describe('every', function() {
                    it('incorrect "dailyFrequency.start" type', function(done) {                                            
                        let nDailyScheduleEvery = JSON.parse(JSON.stringify(dailyScheduleEvery));
                        nDailyScheduleEvery.dailyFrequency.start = 1;
                        assert.equal(DataVsSchemaResult(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                        assert.include(DataVsSchemaErrors(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency.start should be string');
                        done();
                    })          
                    it('incorrect "dailyFrequency.start" format (11)', function(done) {                                            
                        let nDailyScheduleEvery = JSON.parse(JSON.stringify(dailyScheduleEvery));
                        nDailyScheduleEvery.dailyFrequency.start = '11';
                        assert.equal(DataVsSchemaResult(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                        assert.include(DataVsSchemaErrors(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency.start should match format "time"');
                        done();
                    })
                    it('incorrect "dailyFrequency.start" format (11:11:99)', function(done) {                                            
                        let nDailyScheduleEvery = JSON.parse(JSON.stringify(dailyScheduleEvery));
                        nDailyScheduleEvery.dailyFrequency.start = '11:11:99';
                        assert.equal(DataVsSchemaResult(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                        assert.include(DataVsSchemaErrors(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency.start should match format "time"');
                        done();
                    })    
                    it('incorrect "dailyFrequency.occursEvery" type', function(done) {                                            
                        let nDailyScheduleEvery = JSON.parse(JSON.stringify(dailyScheduleEvery));
                        nDailyScheduleEvery.dailyFrequency.occursEvery = 1;
                        assert.equal(DataVsSchemaResult(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                        assert.include(DataVsSchemaErrors(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency.occursEvery should be object');
                        done();
                    })  
                    it('extra property', function(done) {                                            
                        let nDailyScheduleEvery = JSON.parse(JSON.stringify(dailyScheduleOnce));
                        nDailyScheduleEvery.dailyFrequency['bla'] = 1;
                        assert.equal(DataVsSchemaResult(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                        assert.include(DataVsSchemaErrors(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency should NOT have additional properties');
                        done();
                    })                    
                    it('requiered fileds "dailyFrequency.start" issue', function(done) {                                            
                        let nDailyScheduleEvery = JSON.parse(JSON.stringify(dailyScheduleEvery));
                        delete nDailyScheduleEvery.dailyFrequency.start;
                        assert.equal(DataVsSchemaResult(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                        assert.include(DataVsSchemaErrors(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), "data.dailyFrequency should have required property 'start'");
                        done();
                    })              
                    it('requiered fileds "dailyFrequency.occursEvery" issue', function(done) {                                            
                        let nDailyScheduleEvery = JSON.parse(JSON.stringify(dailyScheduleEvery));
                        delete nDailyScheduleEvery.dailyFrequency.occursEvery;
                        assert.equal(DataVsSchemaResult(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                        assert.include(DataVsSchemaErrors(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), "data.dailyFrequency should have required property 'occursEvery'");
                        done();
                    })          
                    describe('occursEvery', function() {
                        it('incorrect "dailyFrequency.occursEvery.intervalValue" type', function(done) {                                            
                            let nDailyScheduleEvery = JSON.parse(JSON.stringify(dailyScheduleEvery));
                            nDailyScheduleEvery.dailyFrequency.occursEvery.intervalValue = true;
                            assert.equal(DataVsSchemaResult(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                            assert.include(DataVsSchemaErrors(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency.occursEvery.intervalValue should be integer');
                            done();
                        })   
                        it('incorrect "dailyFrequency.occursEvery.intervalValue" <0', function(done) {                                            
                            let nDailyScheduleEvery = JSON.parse(JSON.stringify(dailyScheduleEvery));
                            nDailyScheduleEvery.dailyFrequency.occursEvery.intervalValue = -1;
                            assert.equal(DataVsSchemaResult(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                            assert.include(DataVsSchemaErrors(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency.occursEvery.intervalValue should be >= 0');
                            done();
                        }) 
                        it('incorrect "dailyFrequency.occursEvery.intervalType" type', function(done) {                                            
                            let nDailyScheduleEvery = JSON.parse(JSON.stringify(dailyScheduleEvery));
                            nDailyScheduleEvery.dailyFrequency.occursEvery.intervalType = true;
                            assert.equal(DataVsSchemaResult(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                            assert.include(DataVsSchemaErrors(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency.occursEvery.intervalType should be equal to one of the allowed values');
                            done();
                        })  
                        it('incorrect "dailyFrequency.occursEvery.intervalType" value', function(done) {                                            
                            let nDailyScheduleEvery = JSON.parse(JSON.stringify(dailyScheduleEvery));
                            nDailyScheduleEvery.dailyFrequency.occursEvery.intervalType = 'a';
                            assert.equal(DataVsSchemaResult(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                            assert.include(DataVsSchemaErrors(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency.occursEvery.intervalType should be equal to one of the allowed values');
                            done();
                        })      
                        it('extra property', function(done) {                                            
                            let nDailyScheduleEvery = JSON.parse(JSON.stringify(dailyScheduleEvery));
                            nDailyScheduleEvery.dailyFrequency.occursEvery['bla'] = 1;
                            assert.equal(DataVsSchemaResult(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                            assert.include(DataVsSchemaErrors(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency.occursEvery should NOT have additional properties');
                            done();
                        })       
                        it('requiered fileds "dailyFrequency.occursEvery.intervalValue" issue', function(done) {                                            
                            let nDailyScheduleEvery = JSON.parse(JSON.stringify(dailyScheduleEvery));
                            delete nDailyScheduleEvery.dailyFrequency.occursEvery.intervalValue;
                            assert.equal(DataVsSchemaResult(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                            assert.include(DataVsSchemaErrors(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), "data.dailyFrequency.occursEvery should have required property 'intervalValue'");
                            done();
                        })   
                        it('requiered fileds "dailyFrequency.occursEvery.intervalType" issue', function(done) {                                            
                            let nDailyScheduleEvery = JSON.parse(JSON.stringify(dailyScheduleEvery));
                            delete nDailyScheduleEvery.dailyFrequency.occursEvery.intervalType;
                            assert.equal(DataVsSchemaResult(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                            assert.include(DataVsSchemaErrors(nDailyScheduleEvery, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), "data.dailyFrequency.occursEvery should have required property 'intervalType'");
                            done();
                        })                                           
                    })                     
                })                                      
            });
        });
        describe('weekly', function() {
            it('initial validation. OK', function(done) {                            
                let nWeeklySchedule = JSON.parse(JSON.stringify(weeklySchedule));
                assert.equal(DataVsSchemaResult(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), true);
                done();
            })
            it('incorrect "name" type', function(done) {                                            
                let nWeeklySchedule = JSON.parse(JSON.stringify(weeklySchedule));
                nWeeklySchedule.name = 1;
                assert.equal(DataVsSchemaResult(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.name should be string');
                done();
            })
            it('incorrect "enabled" type', function(done) {                                            
                let nWeeklySchedule = JSON.parse(JSON.stringify(weeklySchedule));
                nWeeklySchedule.enabled = 1;
                assert.equal(DataVsSchemaResult(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.enabled should be boolean');
                done();
            })
            it('incorrect "eachNWeek" type', function(done) {                                            
                let nWeeklySchedule = JSON.parse(JSON.stringify(weeklySchedule));
                nWeeklySchedule.eachNWeek = true;
                assert.equal(DataVsSchemaResult(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.eachNWeek should be integer');
                done();
            })
            it('incorrect "dailyFrequency" type', function(done) {                                            
                let nWeeklySchedule = JSON.parse(JSON.stringify(weeklySchedule));
                nWeeklySchedule.dailyFrequency = 1;
                assert.equal(DataVsSchemaResult(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency should be object');
                done();
            })                
            it('incorrect "eachNWeek" =0', function(done) {                                            
                let nWeeklySchedule = JSON.parse(JSON.stringify(weeklySchedule));
                nWeeklySchedule.eachNWeek = 0;
                assert.equal(DataVsSchemaResult(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.eachNWeek should be >= 1');
                done();
            })
            it('incorrect "eachNWeek" <0', function(done) {                                            
                let nWeeklySchedule = JSON.parse(JSON.stringify(weeklySchedule));
                nWeeklySchedule.eachNWeek = -1;
                assert.equal(DataVsSchemaResult(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.eachNWeek should be >= 1');
                done();
            })       
            it('incorrect "dayOfWeek" type', function(done) {                                            
                let nWeeklySchedule = JSON.parse(JSON.stringify(weeklySchedule));
                nWeeklySchedule.dayOfWeek = true;
                assert.equal(DataVsSchemaResult(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dayOfWeek should be array');
                done();
            })               
            it('incorrect "dayOfWeek" value', function(done) {                                            
                let nWeeklySchedule = JSON.parse(JSON.stringify(weeklySchedule));
                nWeeklySchedule.dayOfWeek = ['zzz'];
                assert.equal(DataVsSchemaResult(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dayOfWeek[0] should be equal to one of the allowed values');
                done();
            })             
            it('"dayOfWeek" contains not unique items', function(done) {                                            
                let nWeeklySchedule = JSON.parse(JSON.stringify(weeklySchedule));
                nWeeklySchedule.dayOfWeek = ['mon', 'fri', 'mon'];
                assert.equal(DataVsSchemaResult(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dayOfWeek should NOT have duplicate items');
                done();
            })                                   
            it('extra property', function(done) {                                            
                let nWeeklySchedule = JSON.parse(JSON.stringify(weeklySchedule));
                nWeeklySchedule['bla'] = 1;
                assert.equal(DataVsSchemaResult(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data should NOT have additional properties');
                done();
            })        
            it('excluding noт mandatory field. OK', function(done) {                                            
                let nWeeklySchedule = JSON.parse(JSON.stringify(weeklySchedule));
                delete nWeeklySchedule.endDateTime;
                assert.equal(DataVsSchemaResult(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), true);
                done();
            })                             
            it('requiered fileds "name" issue', function(done) {                                            
                let nWeeklySchedule = JSON.parse(JSON.stringify(weeklySchedule));
                delete nWeeklySchedule.name;
                assert.equal(DataVsSchemaResult(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), "data should have required property 'name'");
                done();
            })    
            it('requiered fileds "eachNWeek" issue', function(done) {                                            
                let nWeeklySchedule = JSON.parse(JSON.stringify(weeklySchedule));
                delete nWeeklySchedule.eachNWeek;
                assert.equal(DataVsSchemaResult(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), "data should have required property 'eachNWeek'");
                done();
            })
            it('requiered fileds "dayOfWeek" issue', function(done) {                                            
                let nWeeklySchedule = JSON.parse(JSON.stringify(weeklySchedule));
                delete nWeeklySchedule.dayOfWeek;
                assert.equal(DataVsSchemaResult(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nWeeklySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), "data should have required property 'dayOfWeek'");
                done();
            })            
        });    
        describe('monthly', function() {
            it('initial validation. OK', function(done) {                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), true);
                done();
            })
            it('incorrect "name" type', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                nMonthlySchedule.name = 1;
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.name should be string');
                done();
            })
            it('incorrect "enabled" type', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                nMonthlySchedule.enabled = 1;
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.enabled should be boolean');
                done();
            })
            it('incorrect "month" type', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                nMonthlySchedule.month = true;
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.month should be array');
                done();
            })
            it('incorrect "day" type', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                nMonthlySchedule.day = true;
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.day should be array');
                done();
            })       
            it('incorrect "day.items" type', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                nMonthlySchedule.day = ["a"];
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'should be integer');
                done();
            })      
            it('"day" contains not unique items', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                nMonthlySchedule.day = [1, 1];
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.day should NOT have duplicate items');
                done();
            })          
            it('incorrect "dailyFrequency" type', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                nMonthlySchedule.dailyFrequency = 1;
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.dailyFrequency should be object');
                done();
            })                
            it('"day" contains =0', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                nMonthlySchedule.day = [0, 1];
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'should be >= 1');
                done();
            })
            it('"day" contains <0', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                nMonthlySchedule.day = [2, -1];
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'should be >= 1');
                done();
            })       
            it('"day" contains >31', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                nMonthlySchedule.day = [1, 32];
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'should be <= 31');
                done();
            })                     
            it('incorrect "month" value', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                nMonthlySchedule.month = ['zzz'];
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.month[0] should be equal to one of the allowed values');
                done();
            })             
            it('"month" contains not unique items', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                nMonthlySchedule.month = ['jan', 'dec', 'jan'];
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data.month should NOT have duplicate items');
                done();
            })                                   
            it('extra property', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                nMonthlySchedule['bla'] = 1;
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), 'data should NOT have additional properties');
                done();
            })        
            it('excluding noт mandatory field. OK', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                delete nMonthlySchedule.endDateTime;
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), true);
                done();
            })                             
            it('requiered fileds "name" issue', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                delete nMonthlySchedule.name;
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), "data should have required property 'name'");
                done();
            })    
            it('requiered fileds "month" issue', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                delete nMonthlySchedule.month;
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), "data should have required property 'month'");
                done();
            })
            it('requiered fileds "day" issue', function(done) {                                            
                let nMonthlySchedule = JSON.parse(JSON.stringify(monthlySchedule));
                delete nMonthlySchedule.day;
                assert.equal(DataVsSchemaResult(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), false);
                assert.include(DataVsSchemaErrors(nMonthlySchedule, scheduleModel.scheduleSchema, [scheduleModel.scheduleSchemaDaily]), "data should have required property 'day'");
                done();
            })        
        });               
    })
});    

