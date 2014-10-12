'use strict';

//var iotagentLib = require('../../');

describe('IoT Agent NGSI Integration', function() {
    describe('When a new device is connected to the IoT Agent', function() {
        it('should register the device context in the Context Broker');
        it('should subscribe to data modification in the Context Broker side for the device');
    });
    describe('When a device is removed from the IoT Agent', function() {
        it('should cancel its registration in the Context Broker');
        it('should cancel data update modifications related to the device');
    });
    describe('When the IoT Agent receives new information from a device', function() {
        it('should change the value of the corresponding attribute in the context broker');
    });
    describe('When the IoT Agent receives an update on the device data', function () {
        it('should call the device handler with the received data');
    });
    describe('When a context query arrives to the IoT Agent', function() {
        it('should return the information querying the underlying devices');
    });
});
