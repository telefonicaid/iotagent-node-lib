# Measurement Transformation Expression Language

## Index

* [Overview](#overview)
* [Expression execution](#execution)
* [Description](#description)
  * [Types](#types)
  * [Values](#values)
  * [Allowed operations](#operations)
* [Examples of expressions](#examples)

## <a name="overview"/> Overview
The IoTAgent Library provides an expression language for measurement transformation, that can be used to adapt the
information coming from the South Bound APIs to the information reported to the Context Broker. Expressions in this
language can be configured for provisioned attributes as explained in the Device Provisioning API section in the
main README.md.

## <a name="execution"/> Expression execution

Whenever a new measurement arrives to the IoTAgent for a device with declared expressions, all of the expressions for
the device will be checked for execution: for all the defined active attributes containing expressions, the IoTAgent
will check which ones contain expressions whose variables are present in the received measurement. For all of those
whose variables are covered, their expressions will be executed with the received values, and their values updated in
the Context Broker.

E.g.: if a device with the following provisioning information is provisioned in the IoTAgent:
```
{
   "name":"location",
   "type":"geo:point",
   "expression": "${latitude}, ${longitude}"
},
{
   "name":"fillingLevel",
   "type":"Number",
   "expression": "${@level / 100}",
   "cast": "Number"
},
```
and a measurement with the following values arrive to the IoTAgent:
```
latitude: 1.9
level: 85.3
```
The only expression rule that will be executed will be that of the 'fillingLevel' attribute. It will produce the value
'0.853' that will be sent to the Context Broker.

## <a name="description"/>Description

### <a name="types"/> Types

Expressions can have two return types: String or Number. This return type must be configured for each attribute that
is going to be converted. Default value type is String.

Whenever a expression is executed without error, its result will be cast to the configured type. If the conversion fails
(e.g.: if the expression is null or a String and is casted to Number), the measurement update will fail, and an error
will be reported to the device.

### <a name="values"/> Values

#### Variables

All the information reported in the measurement received by the IoT Agent is available for the expression to use. For
every attribute coming from the South Bound, a variable with the syntax '@<object_id>' will be created for its use in
the expression language.

#### Constants

The expression language allows for two kinds of constants:
- Numbers (integer or real)
- Strings (marked with double quotes)

Current allowed characters are:
- All the alphanumerical characters
- Whitespaces

### <a name="operations"/> Allowed operations

The following operations are currently available, divided by attribute type

#### Number operations

- multiplication ('*')
- division ('/')
- addition ('+')
- substraction ('-' binary)
- negation ('-' unary)
- power ('^')

#### String operations

- concatenation ('+')

#### Other available operators

Parenthesis can be used to define precedence in the operations. Whitespaces between tokens are generally ignored.

## <a name="examples"/> Examples of expressions

The following table shows expressions and their expected outcomes for a measure with two attributes: "@value" with value
6 and "@name" with value "DevId629".

| Expression                  | Expected outcome      |
|:--------------------------- |:--------------------- |
| '5 * @value'                | 30                    |
| '(6 + @value) * 3'          | 36                    |
| '@value / 12 + 1'           | 1.5                   |
| '(5 + 2) * (@value + 7)'    | 91                    |
| '@value * 5.2'              | 31.2                  |
| '"Pruebas " + "De Strings"' | 'Pruebas De Strings'  |
| '@name value is @value'     | 'DevId629 value is 6' |
