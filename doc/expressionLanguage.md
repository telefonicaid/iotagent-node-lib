# Measurement Transformation Expression Language

-   [Overview](#overview)
-   [Comparison between expression languages](#comparison-between-expression-languages)
-   [Configuring expression language used](#configuring-expression-language-used)
-   [Measurement transformation](#measurement-transformation)
    -   [Expression definition](#expression-definition)
    -   [Expression execution](#expression-execution)
    -   [Multientity plugin support (`object_id`)](#multientity-plugin-support-object_id)
-   [JEXL Based Transformations](#jexl-based-transformations)
    -   [Examples of JEXL expressions](#examples-of-jexl-expressions)
    -   [Available functions](#available-functions)
-   [Legacy Expression Language Transformations](#legacy-expression-language-transformations)
    -   [Expressions](#expressions)
    -   [Types](#types)
    -   [Values](#values)
        -   [Variables](#variables)
        -   [Constants](#constants)
    -   [Allowed operations](#allowed-operations)
        -   [Number operations](#number-operations)
        -   [String operations](#string-operations)
        -   [Other available operators](#other-available-operators)
    -   [Examples of expressions](#examples-of-expressions)
    -   [NGSI v2 support](#ngsi-v2-support)

## Overview

The IoTAgent Library provides an expression language for measurement transformation, that can be used to adapt the
information coming from the South Bound APIs to the information reported to the Context Broker. This is really useful
when you need to adapt measure.

There are available two differen expression languages `jexl` and `legacy`. The recommended language to use is `jexl`,
which is newer and most powerful.

## Comparison between expression languages

JEXL overpasses the legacy language in several aspects:

-   JEXL supports multiples types: Boolean, String, Number, Object, Array, NULL.
-   JEXL also supports the management and creation of JSON structures (including GeoJSON Objects)
-   JEXL allows to navigate and [filter](https://github.com/TomFrost/jexl#collections) objects and arrays.
-   JEXL supports if..then...else... via [ternary operator](https://github.com/TomFrost/jexl#ternary-operator).
-   JEXL additionally supports the following operations: Divide and floor `//`, Modulus `%`, Logical AND `&&` and
    Logical OR `||`. Negation operator is `!`
-   JEXL supports [comparisons](https://github.com/TomFrost/jexl#comparisons).
-   JEXL supports defining custom transformations (JEXL functions are not currently supported in Perseo).

For more details, check JEXL language details [here](https://github.com/TomFrost/jexl#all-the-details).

## Configuring expression language used

By default, in order to maintain backward compatibility, `legacy` language is applied. There are different levels to
configure the expression language used:

-   At global level.
-   At service group level.
-   At device level.

**Setting the expression language at global level**

It is possible to set the default language at global level by setting the
[global configuration parameter](installationguide.md#global-configuration) `defaultExpressionLanguage` or the
[environment variable](installationguide.md#configuration-using-environment-variables)
`IOTA_DEFAULT_EXPRESSION_LANGUAGE`. This option configures the default expression language used to compute expressions,
possible values are: `legacy` or `jexl`. When not set or wrongly set, `legacy` is used as default value.

**Setting the expression language at service group level**

It is possible to define the expression language at service group by adding the `expressionLanguage` parameter. It is
optional and the possible values are: `legacy` or `jexl`. When not set or wrongly set, `legacy` is used as default. You
can check the following example:

```json
{
    "services": [
        {
            "apikey": "801230BJKL23Y9090DSFL123HJK09H324HV8732",
            "cbroker": "http://orion:1026",
            "entity_type": "Thing",
            "resource":    "/iot/d"
            "expressionLanguage": "jexl",
            "attributes": [...]
        }
    ]
}
```

**Setting the expression language at device level**

Expression language can be configured at device level by adding the `expressionLanguage` parameter to the device
provisioning payload. It is optional and the possible values are: `legacy` or `jexl`. When not set or wrongly set,
`legacy` is used as default. The following example shows how to provision a device using `jexl` language.

```json
{
   "devices":[
      {
         "device_id":"45",
         "protocol":"GENERIC_PROTO",
         "entity_name":"WasteContainer:WC45",
         "entity_type":"WasteContainer",
         "expressionLanguage": "jexl",
         "attributes":[...]
      }
   ]
}
```

## Measurement transformation

### Expression definition

Expressions can be defined for Active attributes, either in the Device provisioning or in the Configuration
provisioning. The following example shows a device provisioning payload with defined expressions (using the
[JEXL Expression language](#jexl-based-transformations)):

```json
{
    "devices": [
        {
            "device_id": "45",
            "protocol": "GENERIC_PROTO",
            "entity_name": "WasteContainer:WC45",
            "entity_type": "WasteContainer",
            "expressionLanguage": "jexl",
            "attributes": [
                {
                    "name": "location",
                    "type": "geo:json",
                    "expression": "{coordinates: [longitude,latitude], type: 'Point'}"
                },
                {
                    "name": "fillingLevel",
                    "type": "Number",
                    "expression": "level / 100"
                },
                {
                    "name": "level",
                    "type": "Number"
                },
                {
                    "name": "latitude",
                    "type": "Number"
                },
                {
                    "name": "longitude",
                    "type": "Number"
                }
            ]
        }
    ]
}
```

[Interactive expression `{coordinates: [longitude,latitude], type: 'Point'}`][1]

[Interactive expression `level / 100`][2]

The value of the `expression` attribute is a string that can contain any number of expression patterns. In order to
complete expression to be evaluated, all the expression patterns must be evaluable (there must be a value in the
measurement for all the variables of all the expression patterns).

Note that you need to include in the provision operation all the attributes required as inputs for the expressions. In
this example, they are `level`, `latitude` and `longitude`. Otherwise the device sending the measures will get
`{"name":"ATTRIBUTE_NOT_FOUND","message":"Some of the attributes does not exist"}` when it sends some of these and the
expression will not be calculated.

The exact same syntax works for Configuration and Device provisioning.

### Expression execution

Whenever a new measurement arrives to the IoT Agent for a device with declared expressions, all of the expressions for
the device will be checked for execution: for all the defined active attributes containing expressions, the IoT Agent
will check which ones contain expressions whose variables are present in the received measurement. For all of those
whose variables are covered, their expressions will be executed with the received values, and their values updated in
the Context Broker.

E.g.: if a device with the following provisioning information is provisioned in the IoT Agent:

```json
{
   "name":"location",
   "type":"geo:point",
   "expression": "longitude+', '+latitude"
},
{
   "name":"fillingLevel",
   "type":"Number",
   "expression": "level / 100",
},
```

[Interactive expression `longitude+', '+latitude`][3]

[Interactive expression `level / 100`][4]

and a measurement with the following values arrive to the IoT Agent:

```text
latitude: 1.9
level: 85.3
```

The only expression rule that will be executed will be that of the `fillingLevel` attribute. It will produce the value
`0.853` that will be sent to the Context Broker.

Note that expressions are only applied if the attribute name (as received by the IoT Agent in the southbound interface)
matches the expression variable. Otherwise, the southbound value is used directly. Let's illustrate with the following
example:

```json
"consumption": {
   "type": "String",
   "value": "spaces | trim"
}
```

-   Case 1: the following measure is received at the southbound interface:

```text
consumption: "0.44"
```

As `spaces` attribute is not included, then the expression is not applied and the `consumption` measure value is
directly used, so the following is sent to CB:

```json
"consumption": {
   "type": "String",
   "value": "0.44"
}
```

-   Case 2: the following measure is received at the southbound interface:

```text
consumption: "0.44"
spaces: "  foobar  "
```

As `spaces` attribute is included, then the expression is evaluated, so overriding the 0.44 value and sending the
following to CB:

```json
"consumption": {
    "type": "String",
    "value": "foobar"
}
```

[Interactive expression `spaces | trim`][5]

### Multientity plugin support (`object_id`)

To allow support for expressions in combination with multi entity plugin, where the same attribute is generated for
different entities out of different incoming attribute values (i.e. `object_id`), we introduced support for `object_id`
in the expression context.

For example, the following device:

```json
"WeatherStation": {
    "commands": [],
    "type": "WeatherStation",
    "lazy": [],
    "active": [
        {
            "object_id": "v1",
            "name": "vol",
            "expression" : "v1*100",
            "type": "Number",
            "entity_name": "WeatherStation1"
        },
        {
            "object_id": "v2",
            "name": "vol",
            "expression" : "v2*100",
            "type": "Number",
            "entity_name": "WeatherStation2"
        },
        {
            "object_id": "v",
            "name": "vol",
            "expression" : "v*100",
            "type": "Number"
        }
    ]
}
```

When receiving the attributes `v`, `v1` and `v2` in a payload from a message received in the southbound:

```json
({
    "name": "v",
    "type": "Number",
    "value": 0
},
{
    "name": "v1",
    "type": "Number",
    "value": 1
},
{
    "name": "v2",
    "type": "Number",
    "value": 2
})
```

Will now generate the following NGSI v2 payload:

```json
{
    "actionType": "append",
    "entities": [
        {
            "id": "ws9",
            "type": "WeatherStation",
            "vol": {
                "type": "Number",
                "value": 0
            }
        },
        {
            "vol": {
                "type": "Number",
                "value": 100
            },
            "type": "WeatherStation",
            "id": "WeatherStation1"
        },
        {
            "vol": {
                "type": "Number",
                "value": 200
            },
            "type": "WeatherStation",
            "id": "WeatherStation2"
        }
    ]
}
```

## JEXL Based Transformations

The recommended expression language for the IoTAgent Library is [JEXL](https://github.com/TomFrost/jexl). To use JEXL,
you will need to either configure it as default language using the `defaultExpressionLanguage` field to `jexl` (see
[configuration documentation](installationguide.md)) or configuring the usage of JEXL as expression language for a given
group or device (as shown above).

```json
{
    "devices": [
        {
            "device_id": "45",
            "protocol": "GENERIC_PROTO",
            "entity_name": "WasteContainer:WC45",
            "entity_type": "WasteContainer",
            "expressionLanguage": "jexl",
            "attributes": [
                {
                    "name": "location",
                    "type": "geo:json",
                    "expression": "{coordinates: [longitude,latitude], type: 'Point'}"
                },
                {
                    "name": "fillingLevel",
                    "type": "Number",
                    "expression": "level / 100"
                },
                {
                    "name": "level",
                    "type": "Number"
                },
                {
                    "name": "latitude",
                    "type": "Number"
                },
                {
                    "name": "longitude",
                    "type": "Number"
                }
            ]
        }
    ]
}
```

In the following we provide examples of using JEXL to apply transformations.

### Examples of JEXL expressions

The following table shows expressions and their expected outcomes taking into account the following measures at
southbound interface:

-   `value` with value 6 (number)
-   `ts` with value 1637245214901 (unix timestamp)
-   `name` with value `"DevId629"` (string)
-   `object` with value `{name: "John", surname: "Doe"}` (JSON object)
-   `array` with value `[1, 3]` (JSON Array)

| Expression                                    | Expected outcome                          | Format              | Playground    |
| :-------------------------------------------- | :---------------------------------------- | ------------------- | ------------- |
| `5 * value`                                   | `30`                                      | Integer             | [Example][6]  |
| `(6 + value) * 3`                             | `36`                                      | Integer             | [Example][7]  |
| `value / 12 + 1`                              | `1.5`                                     | Float               | [Example][8]  |
| `(5 + 2) * (value + 7)`                       | `91`                                      | Integer             | [Example][9]  |
| `value * 5.2`                                 | `31.2`                                    | Float               | [Example][10] |
| `"Pruebas " + "De Strings"`                   | `"Pruebas De Strings"`                    | String              | [Example][11] |
| `name + "value is " +value`                   | `"DevId629 value is 6"`                   | String              | [Example][12] |
| `{coordinates: [value,value], type: 'Point'}` | `{"coordinates": [6,6], "type": "Point"}` | GeoJSON `Object`    | [Example][13] |
| <code>ts&vert;toisodate</code>                | `2021-11-18T14:20:14.901Z`                | ISO 8601 `DateTime` | [Example][14] |

Support for `trim`, `length`, `substr` and `indexOf` transformations was added.

| Expression                                                | Expected outcome | Playground    |
| :-------------------------------------------------------- | :--------------- | ------------- |
| <code>" a "&vert; trim</code>                             | `a`              | [Example][15] |
| <code>name&vert;length</code>                             | `8`              | [Example][16] |
| <code>name&vert;indexOf("e")</code>                       | `1`              | [Example][17] |
| <code>name&vert;substr(0,name&vert;indexOf("e")+1)</code> | `"De"`           | [Example][18] |

The following are some examples of **JEXL** expressions not supported by the **legacy** expression language:

| Expression                                          | Expected outcome                    | Format      | Playground    |
| :-------------------------------------------------- | :---------------------------------- | ----------- | ------------- |
| `value == 6? true : false`                          | `true`                              | Boolean     | [Example][19] |
| <code>value == 6 && name&vert;indexOf("e")>0</code> | `true`                              | Boolean     | [Example][20] |
| `array[1]+1`                                        | `3`                                 | Number      | [Example][21] |
| `object.name`                                       | `"John"`                            | String      | [Example][22] |
| `{type:"Point",coordinates: [value,value]}`         | `{type:"Point",coordinates: [6,6]}` | JSON Object | [Example][23] |

### Available functions

There are several predefined JEXL transformations available to be used at any JEXL expression. The definition of those
transformations and their JavaScript implementation can be found at jexlTransformsMap.js.

The library module also exports a method `iotAgentLib.dataPlugins.expressionTransformation.setJEXLTransforms(Map)` to be
used by specific IoT Agent implementations in order to incorporate extra transformations to this set. It is important to
remark that the lib `jexlTransformsMap` cannot be overwritten by the API additions. The idea behind this is to be able
to incorporate new transformations from the IoT Agent configuration file in a fast and tactical way.

Current common transformation set:

| JEXL Transformation              | Equivalent JavaScript Function                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| jsonparse: (str)                 | `JSON.parse(str);`                                                                                                      |
| jsonstringify: (obj)             | `JSON.stringify(obj);`                                                                                                  |
| indexOf: (val, char)             | `String(val).indexOf(char);`                                                                                            |
| length: (val)                    | `String(val).length;`                                                                                                   |
| trim: (val)                      | `String(val).trim();`                                                                                                   |
| substr: (val, int1, int2)        | `String(val).substr(int1, int2);`                                                                                       |
| addreduce: (arr)                 | <code>arr.reduce((i, v) &vert; i + v));</code>                                                                          |
| lengtharray: (arr)               | `arr.length;`                                                                                                           |
| typeof: (val)                    | `typeof val;`                                                                                                           |
| isarray: (arr)                   | `Array.isArray(arr);`                                                                                                   |
| isnan: (val)                     | `isNaN(val);`                                                                                                           |
| parseint: (val)                  | `parseInt(val);`                                                                                                        |
| parsefloat: (val)                | `parseFloat(val);`                                                                                                      |
| toisodate: (val)                 | `new Date(val).toISOString();`                                                                                          |
| timeoffset:(isostr)              | `new Date(isostr).getTimezoneOffset();`                                                                                 |
| tostring: (val)                  | `val.toString();`                                                                                                       |
| urlencode: (val)                 | `encodeURI(val);`                                                                                                       |
| urldecode: (val)                 | `decodeURI(val);`                                                                                                       |
| replacestr: (str, from, to)      | `str.replace(from, to);`                                                                                                |
| replaceregexp: (str, reg, to)    | `str.replace(new RegExp(reg), to);`                                                                                     |
| replaceallstr: (str, from, to)   | `str.replaceAll(from, to);`                                                                                             |
| replaceallregexp: (str, reg, to) | `str.replaceAll(new RegExp(reg,"g"), to);`                                                                              |
| split: (str, ch)                 | `str.split(ch);`                                                                                                        |
| mapper: (val, values, choices)   | <code>choices[values.findIndex((target) &vert; target == val)]);</code>                                                 |
| thmapper: (val, values, choices) | <code>choices[values.reduce((acc,curr,i,arr) &vert; (acc==0)&vert;&vert;acc?acc:val<=curr?acc=i:acc=null,null)];</code> |
| bitwisemask: (i,mask,op,shf)     | <code>(op==="&"?parseInt(i)&mask: op==="&vert;"?parseInt(i)&vert;mask: op==="^"?parseInt(i)^mask:i)>>shf;</code>        |
| slice: (arr, init, end)          | `arr.slice(init,end);`                                                                                                  |
| addset: (arr, x)                 | <code>{ return Array.from((new Set(arr)).add(x)) }</code>                                                               |
| removeset: (arr, x)              | <code>{ let s = new Set(arr); s.delete(x); return Array.from(s) }</code>                                                |

You have available this [JEXL interactive playground][99] with all the transformations already loaded, in which you can
test all the functions described above.

## Legacy Expression Language Transformations

As described in previous sections, this is the default language just for backward compatibility reasons, but **we
strongly encourage you not to use this language** for defining expression in order to transform measures, since it is
not capable to handle JSON native types, it is not extensible and many other reasons as described on the section
[Comparison between expression languages](#comparison-between-expression-languages). The following example shows a
device provisioning payload with defined expressions using the Legacy Expression Language:

```json
{
    "devices": [
        {
            "device_id": "45",
            "protocol": "GENERIC_PROTO",
            "entity_name": "WasteContainer:WC45",
            "entity_type": "WasteContainer",
            "attributes": [
                {
                    "name": "location",
                    "type": "geo:point",
                    "expression": "${@latitude}, ${@longitude}"
                },
                {
                    "name": "fillingLevel",
                    "type": "Number",
                    "expression": "${@level / 100}"
                },
                {
                    "name": "level",
                    "type": "Number"
                },
                {
                    "name": "latitude",
                    "type": "Number"
                },
                {
                    "name": "longitude",
                    "type": "Number"
                }
            ]
        }
    ]
}
```

### Expressions

Each expression pattern is marked with the following secuence: `${<expression>}` where `<expression>` is a construction
with a valid syntax.

### Types

The way the `parse()` function works (at `expressionParser.js`) is as follows:

-   Expressions can have two return types: `String` or `Number`. This return type must be configured for each attribute
    that is going to be converted. Default value type is `String`.
-   Whenever an expression is executed without error, its result will be cast to the configured type. If the conversion
    fails (e.g.: if the expression is null or a String and is cast to Number), the measurement update will fail, and an
    error will be reported to the device.

However, the usage that the Expression Translation plugin does of that function is using always `String` type. That
means that at the end, the result of the expression will be always cast to `String`. However, in NGSI v2 that `String`
result could be re-cast to the right type (i.e. the one defined for the attribute in the provision operation). Have a
look at the [NGSI v2 support](#ngsiv2) for more information on this.

### Values

#### Variables

All the information reported in the measurement received by the IoT Agent is available for the expression to use. For
every attribute coming from the South Bound, a variable with the syntax `@<object_id>` will be created for its use in
the expression language.

Attribute expressions can contain values taken from the value of other attributes. Those values have, by default, the
String type. For most arithmetic operations (`*`, `/`, etc...) if a variable is involved, its value will be cast to
Number, regardless of the original type. For, example, if a variable `@humidity` has the value `'50'` (a String value),
the following expression:

```
${@humidity * 10}
```

will give `500` as the result (i.e.: the value `'50'` is cast to number, to get `50`, that is then multiplied by 10). If
this cast fails (because the value of the variable is not a number, e.g.: `'Fifty'`), the overall result will be `NaN`.

#### Constants

The expression language allows for two kinds of constants:

-   Numbers (integer or float)
-   Strings (marked with double quotes)

Current allowed characters are:

-   All the alphanumerical characters
-   Whitespaces

### Allowed operations

The following operations are currently available, divided by attribute type

#### Number operations

-   multiplication ('\*')
-   division ('/')
-   addition ('+')
-   subtraction ('-' binary)
-   negation ('-' unary)
-   power ('^')

#### String operations

-   concatenation ('#'): returns the concatenation of the two values separated by `#`.
-   substring location (`indexOf(<variable>, <substring>)`): returns the index where the first occurrence of the
    substring `<substring>` can be found in the string value of `<variable>`.
-   substring (`substr(<variable>, <start> <end>)`): returns a substring of the string variable passed as a parameter,
    starting at posisiton `start` and ending at position `<end>`.
-   whitespace removal (`trim(<string>)`): removes all the spaces surrounding the string passed as a parameter.

#### Other available operators

Parenthesis can be used to define precedence in the operations. Whitespaces between tokens are generally ignored.

### Examples of expressions

The following table shows expressions and their expected outcomes for a measure with two attributes: `@value` with value
`6` and `@name` with value `DevId629`.

| Expression                  | Expected outcome      | Format |
| :-------------------------- | :-------------------- | ------ |
| `5 \* @value`               | `30`                  | Number |
| `(6 + @value) \* 3`         | `36`                  | Number |
| `@value / 12 + 1`           | `1.5`                 | Number |
| `(5 + 2) \* (@value + 7)`   | `91`                  | Number |
| `@value \* 5.2`             | `31.2`                | Number |
| `"Pruebas " + "De Strings"` | `Pruebas De Strings`  | String |
| `@name value is @value`     | `DevId629 value is 6` | String |

### NGSI v2 support

As it is explained in previous sections, expressions can have two return types: `String` or `Number`, being the former
one the default. Whenever an expression is executed without error, its result will be cast to the configured type.

NGSI v2 and NGSI-LD fully supports all the types described in the JSON specification (`string`, `number`, `boolean`,
`object`, `array` and `null`). Therefore, the result of an expression must be cast to the appropriate type (the type
used to define the attribute) in order to avoid inconsistencies between the type field for an attribute and the type of
the value that is being sent.

The expression parser for legacy does not support JSON Arrays and JSON document. For the rest of types the workflow will
be the following:

1. Variables will be cast to String no matter the expression type (see [comments above](#types) regarding this)
2. The expression will be applied
3. The output type will be cast again to the original attribute type.

-   If attribute type is `Number` and the value is an `Integer`, then the value is casted to integer (JSON number)
-   If attribute type is `Number` and the value is a `Float`, then the value is casted to float (JSON number)
-   If attribute type is `Boolean` then the value is cast to boolean (JSON boolean). In order to do this conversion,
    only `true` or `1` are cast to true.
-   If attribute type is `None` then the value is cast to `null` (JSON null)

> **Note**. All the operations and castings described above are not performed using JELX, because the user has full
> control on the final value of the attributes, so there is no need of adding a layer of autocast that would interfere
> and makes things more complicated.

E.g.: if a device with the following provisioning information is provisioned in the IoT Agent:

```json
{
    "name": "status",
    "type": "Boolean",
    "expression": "${@status *  20}"
}
```

and a measurement with the following values arrive to the IoT Agent:

```
status: true
```

1. The expression `*` is a multiplication, so the expression type makes `status` to be casted to Number. The cast of
   `true` to number is 1.
2. Expression is evaluated, resulting in 20
3. 20 is cast to `20` since Expression Plugin always use String as Expression type.
4. The attribute type is `Boolean` so the result is casted to Boolean before sending it to CB. The cast of `20` to
   boolean is false (only `true` or `1` are cast to true).

More examples of this workflow are presented below for the different types of attributes supported in NGSI v2 and the
two possible types of expressions: Integer (arithmetic operations) or Strings.

-   `pressure` with value 52 (integer)
-   `consumption` with value 0.44 (float)
-   `active` with value `null` (None type)

| Expression              | Expected outcome | Format  |
| :---------------------- | :--------------- | ------- |
| `${@pressure * 20}`     | `1040`           | Integer |
| `${trim(@pressure)}`    | `52`             | Integer |
| `${@consumption * 20}`  | `8.8`            | Float   |
| `${trim(@consumption)}` | `0.44`           | Float   |
| `${@pressure * 20}`     | `1040`           | Integer |
| `${@active * 20}`       | `null`           | None    |
| `${trim(@active)`       | `null`           | None    |
| `${trim(@consumption)}` | `0.44`           | Float   |

### External examples in jexl online

[1](https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22longitude%22%3A%205%2C%0A%20%20%22latitude%22%3A%2037%2C%0A%20%20%22level%22%3A223%0A%7D&input=%7Bcoordinates%3A%20%5Blongitude%2Clatitude%5D%2C%20type%3A%20'Point'%7D&transforms=%7B%0A%7D)
[2](https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22longitude%22%3A%205%2C%0A%20%20%22latitude%22%3A%2037%2C%0A%20%20%22level%22%3A223%0A%7D&input=level%2F100&transforms=%7B%0A%7D)
[3](https://czosel.github.io/jexl-playground/#/?context=%7B%20%0A%20%20%22latitude%22%3A%201.9%2C%0A%20%20%22level%22%3A85.3%0A%7D&input=longitude%2B%22%2C%20%22%2Blatitude&transforms=%7B%0A%7D)
[4](https://czosel.github.io/jexl-playground/#/?context=%7B%20%0A%20%20%22latitude%22%3A%201.9%2C%0A%20%20%22level%22%3A85.3%0A%7D&input=level%2F100&transforms=%7B%0A%7D)
[5](<https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22spaces%22%20%3A%20%22%20%20foobar%20%20%22%0A%7D&input=spaces%20%7C%20trim&transforms=%7B%0A%20%20trim%3A%20(val)%20%3D%3E%20String(val).trim()%0A%7D>)
[6](https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=5%20*%20value&transforms=%7B%0A%7D)
[7](<https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=(6%20%2B%20value)%20*%203&transforms=%7B%0A%7D>)
[8](https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=value%20%2F%2012%20%2B%201&transforms=%7B%0A%7D)
[9](<https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=(5%20%2B%202)%20*%20(value%20%2B%207)&transforms=%7B%0A%7D>)
[10](https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=value%20*%205.2&transforms=%7B%0A%7D)
[11](https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=%22Pruebas%20%22%20%2B%20%22De%20Strings%22&transforms=%7B%0A%7D)
[12](https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=name%20%2B%20%22value%20is%20%22%20%2Bvalue&transforms=%7B%0A%7D)
[13](https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=%7Bcoordinates%3A%20%5Bvalue%2Cvalue%5D%2C%20type%3A%20'Point'%7D&transforms=%7B%0A%7D)
[14](<https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=ts%7Ctoisodate&transforms=%7B%0A%20%20%20%20jsonparse%3A%20(str)%20%3D%3E%20JSON.parse(str)%2C%0A%20%20%20%20jsonstringify%3A%20(obj)%20%3D%3E%20JSON.stringify(obj)%2C%0A%20%20%20%20indexOf%3A%20(val%2C%20char)%20%3D%3E%20String(val).indexOf(char)%2C%0A%20%20%20%20length%3A%20(val)%20%3D%3E%20String(val).length%2C%0A%20%20%20%20trim%3A%20(val)%20%3D%3E%20String(val).trim()%2C%0A%20%20%20%20substr%3A%20(val%2C%20int1%2C%20int2)%20%3D%3E%20String(val).substr(int1%2C%20int2)%2C%0A%20%20%20%20addreduce%3A%20(arr)%20%3D%3E%20arr.reduce((i%2C%20v)%20%3D%3E%20i%20%2B%20v)%2C%0A%20%20%20%20lengtharray%3A%20(arr)%20%3D%3E%20arr.length%2C%0A%20%20%20%20typeof%3A%20(val)%20%3D%3E%20typeof%20val%2C%0A%20%20%20%20isarray%3A%20(arr)%20%3D%3E%20Array.isArray(arr)%2C%0A%20%20%20%20isnan%3A%20(val)%20%3D%3E%20isNaN(val)%2C%0A%20%20%20%20parseint%3A%20(val)%20%3D%3E%20parseInt(val)%2C%0A%20%20%20%20parsefloat%3A%20(val)%20%3D%3E%20parseFloat(val)%2C%0A%20%20%20%20toisodate%3A%20(val)%20%3D%3E%20new%20Date(val).toISOString()%2C%0A%20%20%20%20timeoffset%3A%20(isostr)%20%3D%3E%20new%20Date(isostr).getTimezoneOffset()%2C%0A%20%20%20%20tostring%3A%20(val)%20%3D%3E%20val.toString()%2C%0A%20%20%20%20urlencode%3A%20(val)%20%3D%3E%20encodeURI(val)%2C%0A%20%20%20%20urldecode%3A%20(val)%20%3D%3E%20decodeURI(val)%2C%0A%20%20%20%20replacestr%3A%20(str%2C%20from%2C%20to)%20%3D%3E%20str.replace(from%2C%20to)%2C%0A%20%20%20%20replaceregexp%3A%20(str%2C%20reg%2C%20to)%20%3D%3E%20str.replace(new%20RegExp(reg)%2C%20to)%2C%0A%20%20%20%20replaceallstr%3A%20(str%2C%20from%2C%20to)%20%3D%3E%20str.replaceAll(from%2C%20to)%2C%0A%20%20%20%20replaceallregexp%3A%20(str%2C%20reg%2C%20to)%20%3D%3E%20str.replaceAll(new%20RegExp(reg%2C%20'g')%2C%20to)%2C%0A%20%20%20%20split%3A%20(str%2C%20ch)%20%3D%3E%20str.split(ch)%2C%0A%20%20%20%20mapper%3A%20(val%2C%20values%2C%20choices)%20%3D%3E%20choices%5Bvalues.findIndex((target)%20%3D%3E%20target%20%3D%3D%3D%20val)%5D%2C%0A%20%20%20%20thmapper%3A%20(val%2C%20values%2C%20choices)%20%3D%3E%0A%20%20%20%20%20%20%20%20choices%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20values.reduce((acc%2C%20curr%2C%20i)%20%3D%3E%20(acc%20%3D%3D%3D%200%20%7C%7C%20acc%20%3F%20acc%20%3A%20val%20%3C%3D%20curr%20%3F%20(acc%20%3D%20i)%20%3A%20(acc%20%3D%20null))%2C%20null)%0A%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20bitwisemask%3A%20(i%2C%20mask%2C%20op%2C%20shf)%20%3D%3E%0A%20%20%20%20%20%20%20%20(op%20%3D%3D%3D%20'%26'%20%3F%20parseInt(i)%20%26%20mask%20%3A%20op%20%3D%3D%3D%20'%7C'%20%3F%20parseInt(i)%20%7C%20mask%20%3A%20op%20%3D%3D%3D%20'%5E'%20%3F%20parseInt(i)%20%5E%20mask%20%3A%20i)%20%3E%3E%0A%20%20%20%20%20%20%20%20shf%2C%0A%20%20%20%20slice%3A%20(arr%2C%20init%2C%20end)%20%3D%3E%20arr.slice(init%2C%20end)%0A%7D>)
[15](<https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=%22%20a%20%22%7Ctrim&transforms=%7B%0A%20%20%20%20jsonparse%3A%20(str)%20%3D%3E%20JSON.parse(str)%2C%0A%20%20%20%20jsonstringify%3A%20(obj)%20%3D%3E%20JSON.stringify(obj)%2C%0A%20%20%20%20indexOf%3A%20(val%2C%20char)%20%3D%3E%20String(val).indexOf(char)%2C%0A%20%20%20%20length%3A%20(val)%20%3D%3E%20String(val).length%2C%0A%20%20%20%20trim%3A%20(val)%20%3D%3E%20String(val).trim()%2C%0A%20%20%20%20substr%3A%20(val%2C%20int1%2C%20int2)%20%3D%3E%20String(val).substr(int1%2C%20int2)%2C%0A%20%20%20%20addreduce%3A%20(arr)%20%3D%3E%20arr.reduce((i%2C%20v)%20%3D%3E%20i%20%2B%20v)%2C%0A%20%20%20%20lengtharray%3A%20(arr)%20%3D%3E%20arr.length%2C%0A%20%20%20%20typeof%3A%20(val)%20%3D%3E%20typeof%20val%2C%0A%20%20%20%20isarray%3A%20(arr)%20%3D%3E%20Array.isArray(arr)%2C%0A%20%20%20%20isnan%3A%20(val)%20%3D%3E%20isNaN(val)%2C%0A%20%20%20%20parseint%3A%20(val)%20%3D%3E%20parseInt(val)%2C%0A%20%20%20%20parsefloat%3A%20(val)%20%3D%3E%20parseFloat(val)%2C%0A%20%20%20%20toisodate%3A%20(val)%20%3D%3E%20new%20Date(val).toISOString()%2C%0A%20%20%20%20timeoffset%3A%20(isostr)%20%3D%3E%20new%20Date(isostr).getTimezoneOffset()%2C%0A%20%20%20%20tostring%3A%20(val)%20%3D%3E%20val.toString()%2C%0A%20%20%20%20urlencode%3A%20(val)%20%3D%3E%20encodeURI(val)%2C%0A%20%20%20%20urldecode%3A%20(val)%20%3D%3E%20decodeURI(val)%2C%0A%20%20%20%20replacestr%3A%20(str%2C%20from%2C%20to)%20%3D%3E%20str.replace(from%2C%20to)%2C%0A%20%20%20%20replaceregexp%3A%20(str%2C%20reg%2C%20to)%20%3D%3E%20str.replace(new%20RegExp(reg)%2C%20to)%2C%0A%20%20%20%20replaceallstr%3A%20(str%2C%20from%2C%20to)%20%3D%3E%20str.replaceAll(from%2C%20to)%2C%0A%20%20%20%20replaceallregexp%3A%20(str%2C%20reg%2C%20to)%20%3D%3E%20str.replaceAll(new%20RegExp(reg%2C%20'g')%2C%20to)%2C%0A%20%20%20%20split%3A%20(str%2C%20ch)%20%3D%3E%20str.split(ch)%2C%0A%20%20%20%20mapper%3A%20(val%2C%20values%2C%20choices)%20%3D%3E%20choices%5Bvalues.findIndex((target)%20%3D%3E%20target%20%3D%3D%3D%20val)%5D%2C%0A%20%20%20%20thmapper%3A%20(val%2C%20values%2C%20choices)%20%3D%3E%0A%20%20%20%20%20%20%20%20choices%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20values.reduce((acc%2C%20curr%2C%20i)%20%3D%3E%20(acc%20%3D%3D%3D%200%20%7C%7C%20acc%20%3F%20acc%20%3A%20val%20%3C%3D%20curr%20%3F%20(acc%20%3D%20i)%20%3A%20(acc%20%3D%20null))%2C%20null)%0A%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20bitwisemask%3A%20(i%2C%20mask%2C%20op%2C%20shf)%20%3D%3E%0A%20%20%20%20%20%20%20%20(op%20%3D%3D%3D%20'%26'%20%3F%20parseInt(i)%20%26%20mask%20%3A%20op%20%3D%3D%3D%20'%7C'%20%3F%20parseInt(i)%20%7C%20mask%20%3A%20op%20%3D%3D%3D%20'%5E'%20%3F%20parseInt(i)%20%5E%20mask%20%3A%20i)%20%3E%3E%0A%20%20%20%20%20%20%20%20shf%2C%0A%20%20%20%20slice%3A%20(arr%2C%20init%2C%20end)%20%3D%3E%20arr.slice(init%2C%20end)%0A%7D>)
[16](<https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=name%7Clength&transforms=%7B%0A%20%20%20%20jsonparse%3A%20(str)%20%3D%3E%20JSON.parse(str)%2C%0A%20%20%20%20jsonstringify%3A%20(obj)%20%3D%3E%20JSON.stringify(obj)%2C%0A%20%20%20%20indexOf%3A%20(val%2C%20char)%20%3D%3E%20String(val).indexOf(char)%2C%0A%20%20%20%20length%3A%20(val)%20%3D%3E%20String(val).length%2C%0A%20%20%20%20trim%3A%20(val)%20%3D%3E%20String(val).trim()%2C%0A%20%20%20%20substr%3A%20(val%2C%20int1%2C%20int2)%20%3D%3E%20String(val).substr(int1%2C%20int2)%2C%0A%20%20%20%20addreduce%3A%20(arr)%20%3D%3E%20arr.reduce((i%2C%20v)%20%3D%3E%20i%20%2B%20v)%2C%0A%20%20%20%20lengtharray%3A%20(arr)%20%3D%3E%20arr.length%2C%0A%20%20%20%20typeof%3A%20(val)%20%3D%3E%20typeof%20val%2C%0A%20%20%20%20isarray%3A%20(arr)%20%3D%3E%20Array.isArray(arr)%2C%0A%20%20%20%20isnan%3A%20(val)%20%3D%3E%20isNaN(val)%2C%0A%20%20%20%20parseint%3A%20(val)%20%3D%3E%20parseInt(val)%2C%0A%20%20%20%20parsefloat%3A%20(val)%20%3D%3E%20parseFloat(val)%2C%0A%20%20%20%20toisodate%3A%20(val)%20%3D%3E%20new%20Date(val).toISOString()%2C%0A%20%20%20%20timeoffset%3A%20(isostr)%20%3D%3E%20new%20Date(isostr).getTimezoneOffset()%2C%0A%20%20%20%20tostring%3A%20(val)%20%3D%3E%20val.toString()%2C%0A%20%20%20%20urlencode%3A%20(val)%20%3D%3E%20encodeURI(val)%2C%0A%20%20%20%20urldecode%3A%20(val)%20%3D%3E%20decodeURI(val)%2C%0A%20%20%20%20replacestr%3A%20(str%2C%20from%2C%20to)%20%3D%3E%20str.replace(from%2C%20to)%2C%0A%20%20%20%20replaceregexp%3A%20(str%2C%20reg%2C%20to)%20%3D%3E%20str.replace(new%20RegExp(reg)%2C%20to)%2C%0A%20%20%20%20replaceallstr%3A%20(str%2C%20from%2C%20to)%20%3D%3E%20str.replaceAll(from%2C%20to)%2C%0A%20%20%20%20replaceallregexp%3A%20(str%2C%20reg%2C%20to)%20%3D%3E%20str.replaceAll(new%20RegExp(reg%2C%20'g')%2C%20to)%2C%0A%20%20%20%20split%3A%20(str%2C%20ch)%20%3D%3E%20str.split(ch)%2C%0A%20%20%20%20mapper%3A%20(val%2C%20values%2C%20choices)%20%3D%3E%20choices%5Bvalues.findIndex((target)%20%3D%3E%20target%20%3D%3D%3D%20val)%5D%2C%0A%20%20%20%20thmapper%3A%20(val%2C%20values%2C%20choices)%20%3D%3E%0A%20%20%20%20%20%20%20%20choices%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20values.reduce((acc%2C%20curr%2C%20i)%20%3D%3E%20(acc%20%3D%3D%3D%200%20%7C%7C%20acc%20%3F%20acc%20%3A%20val%20%3C%3D%20curr%20%3F%20(acc%20%3D%20i)%20%3A%20(acc%20%3D%20null))%2C%20null)%0A%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20bitwisemask%3A%20(i%2C%20mask%2C%20op%2C%20shf)%20%3D%3E%0A%20%20%20%20%20%20%20%20(op%20%3D%3D%3D%20'%26'%20%3F%20parseInt(i)%20%26%20mask%20%3A%20op%20%3D%3D%3D%20'%7C'%20%3F%20parseInt(i)%20%7C%20mask%20%3A%20op%20%3D%3D%3D%20'%5E'%20%3F%20parseInt(i)%20%5E%20mask%20%3A%20i)%20%3E%3E%0A%20%20%20%20%20%20%20%20shf%2C%0A%20%20%20%20slice%3A%20(arr%2C%20init%2C%20end)%20%3D%3E%20arr.slice(init%2C%20end)%0A%7D>)
[17](<https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=name%7CindexOf(%22e%22)&transforms=%7B%0A%20%20%20%20jsonparse%3A%20(str)%20%3D%3E%20JSON.parse(str)%2C%0A%20%20%20%20jsonstringify%3A%20(obj)%20%3D%3E%20JSON.stringify(obj)%2C%0A%20%20%20%20indexOf%3A%20(val%2C%20char)%20%3D%3E%20String(val).indexOf(char)%2C%0A%20%20%20%20length%3A%20(val)%20%3D%3E%20String(val).length%2C%0A%20%20%20%20trim%3A%20(val)%20%3D%3E%20String(val).trim()%2C%0A%20%20%20%20substr%3A%20(val%2C%20int1%2C%20int2)%20%3D%3E%20String(val).substr(int1%2C%20int2)%2C%0A%20%20%20%20addreduce%3A%20(arr)%20%3D%3E%20arr.reduce((i%2C%20v)%20%3D%3E%20i%20%2B%20v)%2C%0A%20%20%20%20lengtharray%3A%20(arr)%20%3D%3E%20arr.length%2C%0A%20%20%20%20typeof%3A%20(val)%20%3D%3E%20typeof%20val%2C%0A%20%20%20%20isarray%3A%20(arr)%20%3D%3E%20Array.isArray(arr)%2C%0A%20%20%20%20isnan%3A%20(val)%20%3D%3E%20isNaN(val)%2C%0A%20%20%20%20parseint%3A%20(val)%20%3D%3E%20parseInt(val)%2C%0A%20%20%20%20parsefloat%3A%20(val)%20%3D%3E%20parseFloat(val)%2C%0A%20%20%20%20toisodate%3A%20(val)%20%3D%3E%20new%20Date(val).toISOString()%2C%0A%20%20%20%20timeoffset%3A%20(isostr)%20%3D%3E%20new%20Date(isostr).getTimezoneOffset()%2C%0A%20%20%20%20tostring%3A%20(val)%20%3D%3E%20val.toString()%2C%0A%20%20%20%20urlencode%3A%20(val)%20%3D%3E%20encodeURI(val)%2C%0A%20%20%20%20urldecode%3A%20(val)%20%3D%3E%20decodeURI(val)%2C%0A%20%20%20%20replacestr%3A%20(str%2C%20from%2C%20to)%20%3D%3E%20str.replace(from%2C%20to)%2C%0A%20%20%20%20replaceregexp%3A%20(str%2C%20reg%2C%20to)%20%3D%3E%20str.replace(new%20RegExp(reg)%2C%20to)%2C%0A%20%20%20%20replaceallstr%3A%20(str%2C%20from%2C%20to)%20%3D%3E%20str.replaceAll(from%2C%20to)%2C%0A%20%20%20%20replaceallregexp%3A%20(str%2C%20reg%2C%20to)%20%3D%3E%20str.replaceAll(new%20RegExp(reg%2C%20'g')%2C%20to)%2C%0A%20%20%20%20split%3A%20(str%2C%20ch)%20%3D%3E%20str.split(ch)%2C%0A%20%20%20%20mapper%3A%20(val%2C%20values%2C%20choices)%20%3D%3E%20choices%5Bvalues.findIndex((target)%20%3D%3E%20target%20%3D%3D%3D%20val)%5D%2C%0A%20%20%20%20thmapper%3A%20(val%2C%20values%2C%20choices)%20%3D%3E%0A%20%20%20%20%20%20%20%20choices%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20values.reduce((acc%2C%20curr%2C%20i)%20%3D%3E%20(acc%20%3D%3D%3D%200%20%7C%7C%20acc%20%3F%20acc%20%3A%20val%20%3C%3D%20curr%20%3F%20(acc%20%3D%20i)%20%3A%20(acc%20%3D%20null))%2C%20null)%0A%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20bitwisemask%3A%20(i%2C%20mask%2C%20op%2C%20shf)%20%3D%3E%0A%20%20%20%20%20%20%20%20(op%20%3D%3D%3D%20'%26'%20%3F%20parseInt(i)%20%26%20mask%20%3A%20op%20%3D%3D%3D%20'%7C'%20%3F%20parseInt(i)%20%7C%20mask%20%3A%20op%20%3D%3D%3D%20'%5E'%20%3F%20parseInt(i)%20%5E%20mask%20%3A%20i)%20%3E%3E%0A%20%20%20%20%20%20%20%20shf%2C%0A%20%20%20%20slice%3A%20(arr%2C%20init%2C%20end)%20%3D%3E%20arr.slice(init%2C%20end)%0A%7D>)
[18](<https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=name%7Csubstr(0%2Cname%7CindexOf(%22e%22)%2B1)&transforms=%7B%0A%20%20%20%20jsonparse%3A%20(str)%20%3D%3E%20JSON.parse(str)%2C%0A%20%20%20%20jsonstringify%3A%20(obj)%20%3D%3E%20JSON.stringify(obj)%2C%0A%20%20%20%20indexOf%3A%20(val%2C%20char)%20%3D%3E%20String(val).indexOf(char)%2C%0A%20%20%20%20length%3A%20(val)%20%3D%3E%20String(val).length%2C%0A%20%20%20%20trim%3A%20(val)%20%3D%3E%20String(val).trim()%2C%0A%20%20%20%20substr%3A%20(val%2C%20int1%2C%20int2)%20%3D%3E%20String(val).substr(int1%2C%20int2)%2C%0A%20%20%20%20addreduce%3A%20(arr)%20%3D%3E%20arr.reduce((i%2C%20v)%20%3D%3E%20i%20%2B%20v)%2C%0A%20%20%20%20lengtharray%3A%20(arr)%20%3D%3E%20arr.length%2C%0A%20%20%20%20typeof%3A%20(val)%20%3D%3E%20typeof%20val%2C%0A%20%20%20%20isarray%3A%20(arr)%20%3D%3E%20Array.isArray(arr)%2C%0A%20%20%20%20isnan%3A%20(val)%20%3D%3E%20isNaN(val)%2C%0A%20%20%20%20parseint%3A%20(val)%20%3D%3E%20parseInt(val)%2C%0A%20%20%20%20parsefloat%3A%20(val)%20%3D%3E%20parseFloat(val)%2C%0A%20%20%20%20toisodate%3A%20(val)%20%3D%3E%20new%20Date(val).toISOString()%2C%0A%20%20%20%20timeoffset%3A%20(isostr)%20%3D%3E%20new%20Date(isostr).getTimezoneOffset()%2C%0A%20%20%20%20tostring%3A%20(val)%20%3D%3E%20val.toString()%2C%0A%20%20%20%20urlencode%3A%20(val)%20%3D%3E%20encodeURI(val)%2C%0A%20%20%20%20urldecode%3A%20(val)%20%3D%3E%20decodeURI(val)%2C%0A%20%20%20%20replacestr%3A%20(str%2C%20from%2C%20to)%20%3D%3E%20str.replace(from%2C%20to)%2C%0A%20%20%20%20replaceregexp%3A%20(str%2C%20reg%2C%20to)%20%3D%3E%20str.replace(new%20RegExp(reg)%2C%20to)%2C%0A%20%20%20%20replaceallstr%3A%20(str%2C%20from%2C%20to)%20%3D%3E%20str.replaceAll(from%2C%20to)%2C%0A%20%20%20%20replaceallregexp%3A%20(str%2C%20reg%2C%20to)%20%3D%3E%20str.replaceAll(new%20RegExp(reg%2C%20'g')%2C%20to)%2C%0A%20%20%20%20split%3A%20(str%2C%20ch)%20%3D%3E%20str.split(ch)%2C%0A%20%20%20%20mapper%3A%20(val%2C%20values%2C%20choices)%20%3D%3E%20choices%5Bvalues.findIndex((target)%20%3D%3E%20target%20%3D%3D%3D%20val)%5D%2C%0A%20%20%20%20thmapper%3A%20(val%2C%20values%2C%20choices)%20%3D%3E%0A%20%20%20%20%20%20%20%20choices%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20values.reduce((acc%2C%20curr%2C%20i)%20%3D%3E%20(acc%20%3D%3D%3D%200%20%7C%7C%20acc%20%3F%20acc%20%3A%20val%20%3C%3D%20curr%20%3F%20(acc%20%3D%20i)%20%3A%20(acc%20%3D%20null))%2C%20null)%0A%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20bitwisemask%3A%20(i%2C%20mask%2C%20op%2C%20shf)%20%3D%3E%0A%20%20%20%20%20%20%20%20(op%20%3D%3D%3D%20'%26'%20%3F%20parseInt(i)%20%26%20mask%20%3A%20op%20%3D%3D%3D%20'%7C'%20%3F%20parseInt(i)%20%7C%20mask%20%3A%20op%20%3D%3D%3D%20'%5E'%20%3F%20parseInt(i)%20%5E%20mask%20%3A%20i)%20%3E%3E%0A%20%20%20%20%20%20%20%20shf%2C%0A%20%20%20%20slice%3A%20(arr%2C%20init%2C%20end)%20%3D%3E%20arr.slice(init%2C%20end)%0A%7D>)
[19](https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=value%20%3D%3D%206%3F%20true%20%3A%20false&transforms=%7B%7D)
[20](<https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=value%20%3D%3D%206%20%26%26%20name%7CindexOf(%22e%22)%3E0&transforms=%7B%0A%20%20%20%20jsonparse%3A%20(str)%20%3D%3E%20JSON.parse(str)%2C%0A%20%20%20%20jsonstringify%3A%20(obj)%20%3D%3E%20JSON.stringify(obj)%2C%0A%20%20%20%20indexOf%3A%20(val%2C%20char)%20%3D%3E%20String(val).indexOf(char)%2C%0A%20%20%20%20length%3A%20(val)%20%3D%3E%20String(val).length%2C%0A%20%20%20%20trim%3A%20(val)%20%3D%3E%20String(val).trim()%2C%0A%20%20%20%20substr%3A%20(val%2C%20int1%2C%20int2)%20%3D%3E%20String(val).substr(int1%2C%20int2)%2C%0A%20%20%20%20addreduce%3A%20(arr)%20%3D%3E%20arr.reduce((i%2C%20v)%20%3D%3E%20i%20%2B%20v)%2C%0A%20%20%20%20lengtharray%3A%20(arr)%20%3D%3E%20arr.length%2C%0A%20%20%20%20typeof%3A%20(val)%20%3D%3E%20typeof%20val%2C%0A%20%20%20%20isarray%3A%20(arr)%20%3D%3E%20Array.isArray(arr)%2C%0A%20%20%20%20isnan%3A%20(val)%20%3D%3E%20isNaN(val)%2C%0A%20%20%20%20parseint%3A%20(val)%20%3D%3E%20parseInt(val)%2C%0A%20%20%20%20parsefloat%3A%20(val)%20%3D%3E%20parseFloat(val)%2C%0A%20%20%20%20toisodate%3A%20(val)%20%3D%3E%20new%20Date(val).toISOString()%2C%0A%20%20%20%20timeoffset%3A%20(isostr)%20%3D%3E%20new%20Date(isostr).getTimezoneOffset()%2C%0A%20%20%20%20tostring%3A%20(val)%20%3D%3E%20val.toString()%2C%0A%20%20%20%20urlencode%3A%20(val)%20%3D%3E%20encodeURI(val)%2C%0A%20%20%20%20urldecode%3A%20(val)%20%3D%3E%20decodeURI(val)%2C%0A%20%20%20%20replacestr%3A%20(str%2C%20from%2C%20to)%20%3D%3E%20str.replace(from%2C%20to)%2C%0A%20%20%20%20replaceregexp%3A%20(str%2C%20reg%2C%20to)%20%3D%3E%20str.replace(new%20RegExp(reg)%2C%20to)%2C%0A%20%20%20%20replaceallstr%3A%20(str%2C%20from%2C%20to)%20%3D%3E%20str.replaceAll(from%2C%20to)%2C%0A%20%20%20%20replaceallregexp%3A%20(str%2C%20reg%2C%20to)%20%3D%3E%20str.replaceAll(new%20RegExp(reg%2C%20'g')%2C%20to)%2C%0A%20%20%20%20split%3A%20(str%2C%20ch)%20%3D%3E%20str.split(ch)%2C%0A%20%20%20%20mapper%3A%20(val%2C%20values%2C%20choices)%20%3D%3E%20choices%5Bvalues.findIndex((target)%20%3D%3E%20target%20%3D%3D%3D%20val)%5D%2C%0A%20%20%20%20thmapper%3A%20(val%2C%20values%2C%20choices)%20%3D%3E%0A%20%20%20%20%20%20%20%20choices%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20values.reduce((acc%2C%20curr%2C%20i)%20%3D%3E%20(acc%20%3D%3D%3D%200%20%7C%7C%20acc%20%3F%20acc%20%3A%20val%20%3C%3D%20curr%20%3F%20(acc%20%3D%20i)%20%3A%20(acc%20%3D%20null))%2C%20null)%0A%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20bitwisemask%3A%20(i%2C%20mask%2C%20op%2C%20shf)%20%3D%3E%0A%20%20%20%20%20%20%20%20(op%20%3D%3D%3D%20'%26'%20%3F%20parseInt(i)%20%26%20mask%20%3A%20op%20%3D%3D%3D%20'%7C'%20%3F%20parseInt(i)%20%7C%20mask%20%3A%20op%20%3D%3D%3D%20'%5E'%20%3F%20parseInt(i)%20%5E%20mask%20%3A%20i)%20%3E%3E%0A%20%20%20%20%20%20%20%20shf%2C%0A%20%20%20%20slice%3A%20(arr%2C%20init%2C%20end)%20%3D%3E%20arr.slice(init%2C%20end)%0A%7D>)
[21](https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=array%5B1%5D%2B1&transforms=%7B%7D)
[22](https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=object.name&transforms=%7B%7D)
[23](https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22value%22%20%3A%206%2C%0A%20%20%22ts%22%3A%201637245214901%2C%0A%20%22name%22%3A%20%22DevId629%22%2C%0A%20%22object%22%3A%7Bname%3A%20%22John%22%2C%20surname%3A%20%22Doe%22%7D%2C%0A%20%20%22array%22%3A%5B1%2C3%5D%0A%7D&input=%7Btype%3A%22Point%22%2Ccoordinates%3A%20%5Bvalue%2Cvalue%5D%7D&transforms=%7B%7D)
[99](<https://czosel.github.io/jexl-playground/#/?context=%7B%0A%20%20%22text%22%20%3A%20%22%20%20foobar%7B%7D%20%20%22%0A%7D&input=text%20%7C%20replacestr(%22foo%22%2C%22FOO%22)%7Ctrim%7Curlencode&transforms=%7B%0A%20%20%20%20jsonparse%3A%20(str)%20%3D%3E%20JSON.parse(str)%2C%0A%20%20%20%20jsonstringify%3A%20(obj)%20%3D%3E%20JSON.stringify(obj)%2C%0A%20%20%20%20indexOf%3A%20(val%2C%20char)%20%3D%3E%20String(val).indexOf(char)%2C%0A%20%20%20%20length%3A%20(val)%20%3D%3E%20String(val).length%2C%0A%20%20%20%20trim%3A%20(val)%20%3D%3E%20String(val).trim()%2C%0A%20%20%20%20substr%3A%20(val%2C%20int1%2C%20int2)%20%3D%3E%20String(val).substr(int1%2C%20int2)%2C%0A%20%20%20%20addreduce%3A%20(arr)%20%3D%3E%20arr.reduce((i%2C%20v)%20%3D%3E%20i%20%2B%20v)%2C%0A%20%20%20%20lengtharray%3A%20(arr)%20%3D%3E%20arr.length%2C%0A%20%20%20%20typeof%3A%20(val)%20%3D%3E%20typeof%20val%2C%0A%20%20%20%20isarray%3A%20(arr)%20%3D%3E%20Array.isArray(arr)%2C%0A%20%20%20%20isnan%3A%20(val)%20%3D%3E%20isNaN(val)%2C%0A%20%20%20%20parseint%3A%20(val)%20%3D%3E%20parseInt(val)%2C%0A%20%20%20%20parsefloat%3A%20(val)%20%3D%3E%20parseFloat(val)%2C%0A%20%20%20%20toisodate%3A%20(val)%20%3D%3E%20new%20Date(val).toISOString()%2C%0A%20%20%20%20timeoffset%3A%20(isostr)%20%3D%3E%20new%20Date(isostr).getTimezoneOffset()%2C%0A%20%20%20%20tostring%3A%20(val)%20%3D%3E%20val.toString()%2C%0A%20%20%20%20urlencode%3A%20(val)%20%3D%3E%20encodeURI(val)%2C%0A%20%20%20%20urldecode%3A%20(val)%20%3D%3E%20decodeURI(val)%2C%0A%20%20%20%20replacestr%3A%20(str%2C%20from%2C%20to)%20%3D%3E%20str.replace(from%2C%20to)%2C%0A%20%20%20%20replaceregexp%3A%20(str%2C%20reg%2C%20to)%20%3D%3E%20str.replace(new%20RegExp(reg)%2C%20to)%2C%0A%20%20%20%20replaceallstr%3A%20(str%2C%20from%2C%20to)%20%3D%3E%20str.replaceAll(from%2C%20to)%2C%0A%20%20%20%20replaceallregexp%3A%20(str%2C%20reg%2C%20to)%20%3D%3E%20str.replaceAll(new%20RegExp(reg%2C%20'g')%2C%20to)%2C%0A%20%20%20%20split%3A%20(str%2C%20ch)%20%3D%3E%20str.split(ch)%2C%0A%20%20%20%20mapper%3A%20(val%2C%20values%2C%20choices)%20%3D%3E%20choices%5Bvalues.findIndex((target)%20%3D%3E%20target%20%3D%3D%3D%20val)%5D%2C%0A%20%20%20%20thmapper%3A%20(val%2C%20values%2C%20choices)%20%3D%3E%0A%20%20%20%20%20%20%20%20choices%5B%0A%20%20%20%20%20%20%20%20%20%20%20%20values.reduce((acc%2C%20curr%2C%20i)%20%3D%3E%20(acc%20%3D%3D%3D%200%20%7C%7C%20acc%20%3F%20acc%20%3A%20val%20%3C%3D%20curr%20%3F%20(acc%20%3D%20i)%20%3A%20(acc%20%3D%20null))%2C%20null)%0A%20%20%20%20%20%20%20%20%5D%2C%0A%20%20%20%20bitwisemask%3A%20(i%2C%20mask%2C%20op%2C%20shf)%20%3D%3E%0A%20%20%20%20%20%20%20%20(op%20%3D%3D%3D%20'%26'%20%3F%20parseInt(i)%20%26%20mask%20%3A%20op%20%3D%3D%3D%20'%7C'%20%3F%20parseInt(i)%20%7C%20mask%20%3A%20op%20%3D%3D%3D%20'%5E'%20%3F%20parseInt(i)%20%5E%20mask%20%3A%20i)%20%3E%3E%0A%20%20%20%20%20%20%20%20shf%2C%0A%20%20%20%20slice%3A%20(arr%2C%20init%2C%20end)%20%3D%3E%20arr.slice(init%2C%20end)%0A%7D>)
