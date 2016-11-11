# Operations Manual: logs and alarms
## Index

* [Overview](#overview)
* [Logs](#logs)
* [Alarms](#alarms)
* [Error naming code](#errorcode)

## <a name="overview"/>  Overview
The following document shows all the errors that can appear in an IoT Agent using this library, and gives a brief
idea of the severity and how to react to those errors.

## <a name="logs"/>  Logs
The following section contains the error log entries that can appear in the IoT Agents logs, grouped by category.

### GENERAL-001 Couldn\'t find callback in listDevices() call.

### MONGODB-001: Error trying to connect to MongoDB: %s

Implies there has been an error connecting with the DB. The component will automatically retry from this error, but it
may be a sign of connectivity problems between the DB and the component. If the connection cannot be restablished from
this error, a MONGODB-002 error will be raised.

### MONGODB-002: Error found after [%d] attempts: %s

Indicates that it was impossible to establish a connection to the MongoDB cluster, even after retrying N times. This
could be caused by a connectivity problem with the MongoDB machine, a problem in the MongoDB cluster, or a misconfiguration
of the IoTA Manager. Check the conectivity, the state of the MongoDB cluster and the Mongo configuration data.

### MONGODB-003: No host found for MongoDB driver.

This error will thrown if MongoDB is selected as the configured repository for data but some information is missing
in the configuration file. Check the configuration file and add all the required information.

### IOTAM-001: Error updating information in the IOTAM. Status Code [%d]

The IoTAgent could not contact the IoTAgent manager to update its information. This condition may indicate a lack of
connectivity between machines or a problem in the IoTAManager. IoTAgent information in the IoTAManager will be out of
date until this problem is solved.

### KEYSTONE-001: Error retrieving token from Keystone: %s

There was connection error connecting with Keystone to retrieve a token. This condition may indicate a lack of connectivity
between both machines or a problem with Keystone.

### KEYSTONE-002: Unexpected status code: %d

There was a problem retrieving a token from keystone that was not caused by connectivity errors. Check the Keystone
log for errors and the security configuration in the IoTAgent. This may also be caused by a wrong trust token used
by the user.

### ORION-001: Connection error creating inital entity in the Context Broker: %s

There was a connectivity error accessing Context Broker to create an initial entity (or the Context Broker was down).
Check connectivity between the machines, the status of the remote Context Broker and the configuration of the IoTAgent.

### ORION-002: Connection error sending registrations to the Context Broker: %s

There was a connectivity error accessing Context Broker to register the IoTA as a Context Provider (or the Context Broker was down).
Check connectivity between the machines, the status of the remote Context Broker and the configuration of the IoTAgent.

### VALIDATION-FATAL-001: Validation Request templates not found

Validation templates were not found. Check all the validation templates are properly located in the IoTAgent Library
folder and that the file permissions are correct.

## <a name="alarms"/> Alarms

The following table shows the alarms that can be raised in the IoTAgent library. All the alarms are signaled by a
error log starting with the prefix "Raising [%s]:" (where %s is the alarm name). All the alarms are released by an info
log with the prefix "Releasing [%s]". These texts appear in the `msg=` field of the generic log record format.

| Alarm name            | Severity     | Description            |
|:--------------------- |:-------------|:---------------------- |
| MONGO-ALARM           | **Critical** | Indicates an error in the MongoDB connectivity |
| ORION-ALARM           | **Critical** | Indicates a persistent error accesing the Context Broker |
| IOTAM-ALARM           | **Critical** | Indicates a persistent error accessing the IoTAM |

while the 'Severity' criterium is as follows:

* **Critical** - The system is not working
* **Major** - The system has a problem that degrades the service and must be addressed
* **Warning** - It is happening something that must be notified


## <a name="errorcode"/> Error naming code
Every error has a code composed of a prefix and an ID, codified with the following table:

| Prefix           | Type of operation      |
|:---------------- |:---------------------- |
| MONGODB          | Errors related with the MongoDB repository |
| IOTAM            | Errors related with the IoTA Manager |
| KEYSTONE         | Errors related with trust token retrieval |
| ORION            | Errors in Context Broker access |
| VALIDATION-FATAL | Errors related with management of the Validation templates |
