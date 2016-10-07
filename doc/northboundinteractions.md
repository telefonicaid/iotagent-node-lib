# Northbound NGSI Interactions

## Index

* [Overview](#overview)
* [Requirements](#requirements)
* [Theory](#theory)
  * [Overview](#theoryoverview)
  * [Data interaction payloads (NGSIv10)](#payloads)
  * [Scenario 1: active attributes](#scn1active)
  * [Scenario 2: lazy attributes](#scn2lazy)
  * [Scenario 3: command attributes](#scn3command)
  * [How to select an scenario](#scenarioselection)
* [Practice](#practice)
  * [Retrieving a token](#token)
  * [Scenario 1: active attributes (happy path)](#activehp)
  * [Scenario 1: active attributes (error)](#activeerror)
  * [Scenario 2: lazy attributes (happy path)](#lazyhp)
  * [Scenario 2: lazy attributes (error)](#lazyerror)
  * [Scenario 3: commands (happy path)](#commandshp)
  * [Scenario 3: commands (error)](#commandserror)

## <a name="overview"/> Overview
This document's target is to explain in detail how the IoTAgent interacts with the Context Broker in all the possible
IoT Scenarios that are supported by this library.

This document has two sections. In the first section, all the interaction models will be explained theoretically with
sequence diagrams, including the advantages and disadvantages of each one of them for different scenarios. The second
section will show examples of all those interactions, using command-line tools available in most OSs, like netcat and
curl.

All the examples have been created to work against Telefonica's IoT Platform so, along with the NGSI data, the following
information should always be sent:

* Headers for the service and subservice. A service "workshop" with subservice "/iotangsi" will be used.
* X-Auth-Token header with a valid unexpired token for a user that has admin permissions in the subservice. In this case
the user "adminiota2ngsi" will be used for all interactions

## <a name="requirements"/> Requirements
The practical part of this document has the following requirements:

* A Unix-line command line interpreter. All the workshop will take place in the command line, making use of different
command-line tools to simulate the different interactions.

* Curl command-line HTTP client should be installed.

* Netcat network utility should be installed.

* An accesible IoT Platform with the following configured components: Keystone, Steelskin PEP and Orion Context Broker.

* Basic knowledge of the NGSI model and HTTP interfaces.

## <a name="theory"/> Theory

### <a name="theoryoverview"/> Overview

#### General purpose of the IoT Agents
Inside the FIWARE Architecture, the IoT Agents work as protocol translation gateways, used to fill the gap between
South Bound protocols (typically lightweight protocols aimed to constrained devices) and the NGSI protocol used to
communicate FIWARE components. This translation process can be customized by the user with provisioning instructions,
using the Device Provisioning APIs.

So, all IoT Agents interacts with three different actors:
* **Devices**, in the South Bound
* **Users** through the Provisioning API
* and the **Context Broker**

In this document, we are going to focus on the NGSI interactions between the IoTAgents and the Context Broker, but
the three actors will appear eventually in sequence diagrams, as all of them take part at some point in the interactions.

All the interactions between the IoTAgents and the Context Broker are standard NGSI, as described in the
[Fiware Orion Context Broker manual](https://fiware-orion.readthedocs.io/en/master/user/walkthrough_apiv1/index.html#ngsi10-standard-operations).

The general purpose of the interactions between both components is:
* To map device information coming to the IoTA to NGSI entities in the Context Broker.
* To ask for device data from the Context Broker through the Context Provider mechanism.
* To send commands to devices based on modifications of the device entity in the Context Broker.

This interactions can be mapped to three different scenarios (that will be detailed in further sections).

#### Synchronous interactions

Along this document, the term "synchronous interaction" will be widely used, so we will define its specific meaning here.
Inside the scope of the IoTAgents documentation, a "synchronous scenario" will have the following definition:

```
Synchronous scenario is the one in which the actor that initiates the communication leaves its HTTP
socket open waiting for the response until all the interaction scenario ends, receiving the results
through the same socket that initiated the request
```

### <a name="payloads"/> Data interaction payloads (NGSIv10)

There are only two kinds of possible data interactions between the IoTAgents and the Context Broker: the queryContext and
updateContext interactions described in NGSIv10. Lots of examples can be found in the
[Fiware Orion Context Broker manual](https://fiware-orion.readthedocs.io/en/master/user/walkthrough_apiv1/index.html#ngsi10-standard-operations)
but this section shows some examples of each one of them.

There are six different payloads that may appear in this interactions:

* P1 - UpdateContext (request) - The payload of a request to POST /v1/updateContext
* R1 - UpdateContext (response) - Always the answer to a successful POST /v1/updateContext
* P2 - QueryContext (request) - he payload of a request to POST /v1/queryContext
* R2 - QueryContext (response) - Always the answer to a successful POST /v1/queryContext
* E1 - Error - Always the response to a request (both queryContext or updateContext)

All the interactions have been labeled with a two letter acronym for its use in the subsequent explanations.

No other type of payload can be issued in any interaction between this two components.

The following subsections will show examples of each one of them, with a brief explanation. Refer to the linked NGSI
documentation for more details.

#### P1 - UpdateContext (request)

This payload is associated to an update operation (POST /v1/updateContext).

```
{
    "contextElements": [
        {
            "type": "Room",
            "isPattern": "false",
            "id": "Room1",
            "attributes": [
                {
                    "name": "temperature",
                    "type": "float",
                    "value": "23"
                },
                {
                    "name": "pressure",
                    "type": "integer",
                    "value": "720"
                }
            ]
        }
    ],
    "updateAction": "APPEND"
}
```
As it can be seen in the example, the payload is a JSON Object with the following attributes:

* A `contextElements` attribute that contains the data that will be updated in the target entity in the `attributes`
attribute, along with the information needed to identify the target entity `id` and `type` attributes. This attribute
is an array, so a single updateContext operation can be used to update.

* An `updateAction` indicating the type of update: if this attribute has the value "APPEND" the appropriate entity and
attributes will be created if the don't exist; if the value is "UPDATE", an error will be thrown if the target resources
don't exist.

#### R1 - UpdateContext (response)

```
{
    "contextResponses": [
        {
            "contextElement": {
                "attributes": [
                    {
                        "name": "temperature",
                        "type": "float",
                        "value": ""
                    },
                    {
                        "name": "pressure",
                        "type": "integer",
                        "value": ""
                    }
                ],
                "id": "Room1",
                "isPattern": "false",
                "type": "Room"
            },
            "statusCode": {
                "code": "200",
                "reasonPhrase": "OK"
            }
        }
    ]
}
```
As the example shows, the response to an updateContext is basically an empty copy of the request payload, along with an
`statusCode` attribute indicating if the operation has succeeded (or a possible error).

Application level errors can be specified for each entity in this payload.


#### P2 - QueryContext (request)
This payload is associate to a query operation (POST /v1/queryContext).

```
{
    "entities": [
        {
            "type": "Room",
            "isPattern": "false",
            "id": "Room1"
        }
    ],
    "attributes": [
        "temperature"
    ]
}
```
The payload specifies the following information:

* The list of target entities whose information is going to be retrieved.
* The list of attributes of those entities that will be retrieved.


#### R2 - QueryContext (response)

```
{
    "contextResponses": [
        {
            "contextElement": {
                "attributes": [
                    {
                        "name": "temperature",
                        "type": "float",
                        "value": "23"
                    }
                ],
                "id": "Room1",
                "isPattern": "false",
                "type": "Room"
            },
            "statusCode": {
                "code": "200",
                "reasonPhrase": "OK"
            }
        }
    ]
}
```
In this case, the response to the QueryContext is a list of responses, one for each requested entity, indicating whether
the information has been retrieved successfully (in the `statusCode` field) and the requested Context information in the
`ContextElement` attribute.

Application level errors can be specified for each entity in this payload.

#### E1 - Error

```
{
    "errorCode": {
        "code": "404",
        "reasonPhrase": "No context element registrations found"
    }
}
```

This special payload can be used to specify general errors with the request, that are not associated to any particular
Context Element, but with the request as a whole.

### <a name="scn1active"/> Scenario 1: active attributes

![General ](../img/scenario1.png "Scenario 1: active attributes")

In this scenario, the interaction is started by the device, that is going to actively send a piece of data to the
platform. When the IoTAgent receives the data, it sends it to the Context Broker through a P1 request. The Context Broker
then stores that information locally and returns a R1 indicating the request has succeeded. This interaction is 100%
synchronous from the perspective of the device (all the interaction happens through a single HTTP request and response
in the same socket).

This scenario leaves all the data locally stored in the Context Broker, so the user can query them using the standard
NGSI APIs offered by the Context Broker (including subscriptions). This data queries are completely separate from the
updating process, and can occur at any time (they are to completely different process).

### <a name="scn2lazy"/> Scenario 2: lazy attributes

![General ](../img/scenario2.png "Scenario 2: lazy attributes")

This scenario requires that the attributes that are going to be requested are marked as provided by the IoT Agent, through
a registration process (NGSIv9). Examples of this registration process will be provided in the practical section of this
document. It's worth mentioning that Orion Context Broker **will not** store locally any data about attributes registered
as provided by a Context Provider; all the queries and updates to registered attributes will be redirected to their
Context Providers.

This interaction scenario is started by the User, that makes a query request, P2, to the Context Broker (1). The later,
detecting a Context Provider for the attribute, will forward the exact same query, P2,  to the IoTAgent (2). The IoTA
will then ask the devices for the required information (or it will retrieve it from its own database in case it stores a copy
of the data). With that information, it will answer with a R2 response payload to the Context Broker, as the HTTP answer
for the original Context Broker request (3). This R2 response payload is the one containing all the information requested by
the User in the original request. Once it has all the information, the Context Broker will return the same R2 request to
the User, as the response to the original HTTP request (and thus, in the same HTTP socket that initiated the request) (4).

This scenario is 100% synchronous from the perspective of the User (and also 100% synchronous from the perspective of
the Context Broker).

This scenario can be used for both updates and queries. The only difference between both uses would be the set of actions
to use: updateContext actions for the update (and thus, P1 and R1 payloads); and queryContext actions for the queries
(and thus P2 and R2 payloads).

### <a name="scn3command"/> Scenario 3: commands

![General ](../img/scenario3.png "Scenario 3: commands")

This scenario requires that the attributes that are going to be requested are marked as provided by the IoT Agent, through
a registration process (NGSIv9). Examples of this registration process will be provided in the practical section of this
document. It's worth mentioning that Orion Context Broker **will not** store locally any data about attributes registered
as provided by a Context Provider; all the queries and updates to registered attributes will be redirected to their
Context Providers.

This scenario is slighty different than the others in its use of the set of attributes of the entity. This scenario will
use three kinds of attributes:

* An attribute will be used as the *input attribute* (the attribute registered in the Context Provider). This input
attribute can be thought of as a command issued to the IoTAgent (from here the name of the scenario) whose value is the
set of arguments of the command. Only updateContext operations will be used to interact with this attributes.

* Another attribute will be used as the *result attribute*. This attribute will be updated from the IoTAgent, and its
value stored in the Context Broker. This attribute will contain the result of the command (this result can be information
in case the command was a "information retrieval" command or the result of an action if it was an "actuator command").
Typically, the name of this attribute will be the same of the input attribute, with an additional sufix ("_info").

* Another attribute with the same characteristics as the later will be used to indicate whether the command has ended
successfully or whether an error has been reported.

In this scenario, the interaction is also initiated by the User. The user starts the scenario by sending an update request P1
to the Context Broker, to the input attribute (1). The Context Broker redirects this same payload to the Context Provider
of the attribute (the IoTAgent) (2). The IoTA immediately answers the request by issuing an R1 (3). This response is not
the final answer to the query, and does not contain any usefull data apart from the status Code. Answering with a 200 code
to this request implies that the IoTAgent has accepted the command, but is yet to process it; once the IoTA has processed
the command, it will update the information. The Context Broker then forwards this same response to teh User who started
the interactions and all HTTP connections are closed (4). This part of the scenario is 100% synchronous for the User, but
does not provide him with the data he queried; it just initiates the asynchronous background process.

At some point in the future, the IoTAgent gets the data it needs to process the command. Then, it starts a new interaction
with the Context Broker, by sending a P1 update request to the Context Broker (5). This P1 payload is the one containing
all the information requested by the user. That information will be updated in the result attribute and no reference to
the input attribute is made in this request. The Context Broker returns a R1 answer to the IoTA, ending the HTTP interaction (6).

This scenario leaves all the data locally stored in the Context Broker, so the user can query them using the standard
NGSI APIs offered by the Context Broker (as shown in the (7) and (8) requests in the diagram). This data queries are
completely separate from the updating process, and can occur at any time (they are to completely different process).

### <a name="scenario selection"/> How to select an scenario

The three different scenarios can be used in different situations:

* **Scenario 1**: this scenario is aimed to interactions actively started by the Device.
* **Scenario 2*+: designed for interactions started by the User that are fast enough to be performed synchronously (within the time of an HTTP timeout).
* **Scenario 3**: designed for interactions started by the User that are too slow to be performed synchrounously.

## <a name="practice"/> Practice

### <a name="token"/> Retrieving a token

### <a name="activehp"/> Scenario 1: active attributes (happy path)

### <a name="activeerror"/> Scenario 1: active attributes (error)

### <a name="lazyhp"/> Scenario 2: lazy attributes (happy path)

### <a name="lazyerror"/> Scenario 2: lazy attributes (error)

### <a name="commandshp"/> Scenario 3: commands (happy path)

### <a name="commandserror"/> Scenario 3: commands (error)

