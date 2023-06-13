from pymongo import MongoClient
from bson import json_util, ObjectId
import json
from operator import itemgetter
import re

from datetime import datetime

import argparse

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt


def parse_json(data):
    return json.loads(json_util.dumps(data))

object_replaced_list = []
find_object_occurrences = []
found_legacy_expressions = []
translation_legacy_expressions = []
object_occurrences_backup = []

# Init time
now = datetime.now()
init_time = now.strftime("%y-%m-%d %H:%M:%S")

# Create the CLI argunments parser
parser = argparse.ArgumentParser(description='Tool to migrate legacy expressions in IoT Agents')
parser.add_argument('-db','--database', help='Database name', required=True)
parser.add_argument('-c','--collection', help='Collection name', required=True)
parser.add_argument('-H','--host', help='Mongodb host', required=False)
parser.add_argument('-p','--port', help='Mongodb port', required=False)
parser.add_argument('-t','--translation', help='Translation file', required=False)
parser.add_argument('-D','--debug', help='Debug mode', required=False, action='store_true')
parser.add_argument('-cm','--commit', help='Commit changes to database', required=False, action='store_true')
parser.add_argument('-el','--expressionlanguage', help='How to handle expressionLanguage values. Can be: delete, ignore or jexl', required=False)
parser.add_argument('-stat','--statistics', help='Show statistics at the end of the execution. Possible values: service subservice', required=False)
parser.add_argument('-S','--service', help='FIWARE service filter', required=False)
parser.add_argument('-P','--servicepath', help='FIWARE servicepath filter', required=False)
parser.add_argument('-i','--deviceid', help='Device ID filter', required=False)
parser.add_argument('-r','--restore', help='Restore from backup file', required=False)
args = vars(parser.parse_args())

# Process args
host = 'localhost'
if args['host']:
    host = args['host']

port = '27017'
if args['port']:
    port = args['port']

debug = False
if args['debug']:
    debug = True

commit = False
if args['commit'] == True:
    print('INFO: Running the script in commit mode, this will update the database')
    commit = True

fiware_service = {'$regex': '.*'}
if args['service']:
    fiware_service = args['service']
    if debug==True:
        print('Filtering by service: ' + fiware_service)

fiware_servicepath = {'$regex': '.*'}
if args['servicepath']:
    fiware_servicepath = args['servicepath']
    if debug==True:
        print('Filtering by servicepath: ' + fiware_servicepath)

filter_device_id = ''
if args['filterdevices']:
    filter_device_id = args['filterdevices']
    print('Filtering by device ID: ' + filter_device_id)

if filter_device_id != '':
    filter['$and'].append({'id': {'$regex': filter_device_id}})

args['translation'] = 'translation.json'
if args['translation'] != None:
    with open(args['translation']) as f:
        translation_legacy_expressions = json.load(f)

mongodb_db = args['database']
mongodb_collection = args['collection']

_regex_legacy_expression = '\\${.*(@)'

# Create a client instance of the MongoClient class
client = MongoClient('mongodb://'+host+':'+port+'/') # Create a client instance of the MongoClient class
if debug==True:
    print('Connected to mongodb://'+host+':'+port+'/')

# Create a filter for the query
filter = {
    '$and':[
        {'$or':[
            {'active': {'$elemMatch': {'expression': {'$regex': _regex_legacy_expression}}}},
            {'active': {'$elemMatch': {'entity_name': {'$regex': _regex_legacy_expression}}}},
            {'active': {'$elemMatch': {'reverse': {'$elemMatch': {'expression':{'$regex': _regex_legacy_expression}}}}}},
            {'attributes': {'$elemMatch': {'expression': {'$regex': _regex_legacy_expression}}}},                                # grups
            {'attributes': {'$elemMatch': {'entity_name': {'$regex': _regex_legacy_expression}}}},                               # grups
            {'attributes': {'$elemMatch': {'reverse': {'$elemMatch': {'expression':{'$regex': _regex_legacy_expression}}}}}},    # grups
            {'commands': {'$elemMatch': {'expression': {'$regex': _regex_legacy_expression}}}},
            {'endpoint': {'$regex': _regex_legacy_expression}},
            {'entityNameExp': {'$regex': _regex_legacy_expression}},
            {'explicitAttrs': {'$regex': _regex_legacy_expression}},
            ]
        },
        {'service': fiware_service},
        {'subservice': fiware_servicepath},
        # {'id': {'$regex': '.*'}},
        ]
}

expressionlanguage = 'ignore'
if args['expressionlanguage'] == 'delete':
    filter['$and'][0]['$or'].append({'expressionLanguage':{'$exists': True}})
    expressionlanguage = 'delete'
elif args['expressionlanguage'] == 'jexl':
    filter['$and'][0]['$or'].append({'expressionLanguage':{'$exists': True}})
    expressionlanguage = 'jexl'
elif args['expressionlanguage'] == 'ignore':
    expressionlanguage = 'ignore'


if debug==True:
    print('Filter: ' + str(filter))

# Execute find query
result_cursor = client[str(mongodb_db)][str(mongodb_collection)].find(
    filter=filter
)

# Loop through the results
for occurrence in result_cursor:

    # Append the expression to the backup list
    object_occurrences_backup.append(parse_json(occurrence))

    # Find the legacy expressions and replace them
    if 'active' in occurrence:
        for active in occurrence['active']:
            if 'expression' in active:
                if re.search(_regex_legacy_expression, active['expression']):
                                                            
                    if active['expression'] not in found_legacy_expressions:
                        found_legacy_expressions.append(active['expression'])
                    find_object_occurrences.append({'_id':str(occurrence['_id']), 'expression':active['expression'], 'type':'active.expression', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(active['expression'])})
                    if debug==True:
                        print ('ocurrence: ' + str(occurrence['_id']) + ' active: ' + str(active['expression']))
                    if translation_legacy_expressions!=[]:
                        # Do the replacement of the legacy expression
                        if active['expression'] in translation_legacy_expressions[0]:
                            active['expression'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(active['expression'])]
                            if debug==True:
                                print(' Replaced expression: "' + active['expression'] + '" in object: ' + str(occurrence['_id']))
                        else:
                            print('ERROR: Expression not found in translation file: ' + active['expression'] + ' in object: ' + str(occurrence['_id']))
                        
            if 'entity_name' in active:
                if re.search(_regex_legacy_expression, active['entity_name']):
                    if active['entity_name'] not in found_legacy_expressions:
                        found_legacy_expressions.append(active['entity_name'])
                    find_object_occurrences.append({'_id':str(occurrence['_id']), 'expression':active['entity_name'], 'type':'active.entity_name', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(active['entity_name'])})
                    if debug==True:
                        print ('ocurrence: ' + str(occurrence['_id']) + ' active: ' + str(active['entity_name']))
                    if translation_legacy_expressions!=[]:
                        # Do the replacement of the legacy expression
                        if active['entity_name'] in translation_legacy_expressions[0]:
                            active['entity_name'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(active['entity_name'])]
                            if debug==True:
                                print(' Replaced expression: "' + active['entity_name'] + '" in object: ' + str(occurrence['_id']))
                        else:
                            print('ERROR: Expression not found in translation file: ' + active['entity_name'] + ' in object: ' + str(occurrence['_id']))

            if 'reverse' in active:
                    if 'expression' in active['reverse']:
                        if re.search(_regex_legacy_expression, active['reverse']['expression']):
                            if active['reverse']['expression'] not in found_legacy_expressions:
                                found_legacy_expressions.append(active['reverse']['expression'])
                            find_object_occurrences.append({'_id':str(occurrence['_id']), 'expression':active['reverse']['expression'], 'type':'active.reverse.expression', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(active['reverse']['expression'])})
                            if debug==True:
                                print ('ocurrence: ' + str(occurrence['_id']) + ' active: ' + str(active['reverse']['expression']))
                            if translation_legacy_expressions!=[]:
                                # Do the replacement of the legacy expression
                                if active['reverse']['expression'] in translation_legacy_expressions[0]:
                                    active['reverse']['expression'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(active['reverse']['expression'])]
                                    if debug==True:
                                        print(' Replaced expression: "' + active['reverse']['expression'] + '" in object: ' + str(occurrence['_id']))
                                else:
                                    print('ERROR: Expression not found in translation file: ' + active['reverse']['expression'] + ' in object: ' + str(occurrence['_id']))

    if 'attributes' in occurrence:
        for attribute in occurrence['attributes']:
            if 'expression' in attribute:
                if re.search(_regex_legacy_expression, attribute['expression']):
                    if attribute['expression'] not in found_legacy_expressions:
                        found_legacy_expressions.append(attribute['expression'])
                    find_object_occurrences.append({'_id':str(occurrence['_id']), 'expression':attribute['expression'], 'type':'attribute.expression', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(attribute['expression'])})
                    if debug==True:
                        print ('ocurrence: ' + str(occurrence['_id']) + ' attribute: ' + str(attribute['expression']))
                    if translation_legacy_expressions!=[]:
                        # Do the replacement of the legacy expression
                        if attribute['expression'] in translation_legacy_expressions[0]:
                            attribute['expression'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(attribute['expression'])]
                            if debug==True:
                                print(' Replaced expression: "' + attribute['expression'] + '" in object: ' + str(occurrence['_id']))
                        else:
                            print('ERROR: Expression not found in translation file: ' + attribute['expression'] + ' in object: ' + str(occurrence['_id']))

            if 'entity_name' in attribute:
                if re.search(_regex_legacy_expression, attribute['entity_name']):
                    if attribute['entity_name'] not in found_legacy_expressions:
                        found_legacy_expressions.append(attribute['entity_name'])
                    find_object_occurrences.append({'_id':str(occurrence['_id']), 'expression':attribute['entity_name'], 'type':'attribute.entity_name', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(attribute['entity_name'])})
                    if debug==True:
                        print ('ocurrence: ' + str(occurrence['_id']) + ' attribute: ' + str(attribute['entity_name']))
                    if translation_legacy_expressions!=[]:
                        # Do the replacement of the legacy expression
                        if attribute['entity_name'] in translation_legacy_expressions[0]:
                            attribute['entity_name'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(attribute['entity_name'])]
                            if debug==True:
                                print(' Replaced expression: "' + attribute['entity_name'] + '" in object: ' + str(occurrence['_id']))
                        else:
                            print('ERROR: Expression not found in translation file: ' + attribute['entity_name'] + ' in object: ' + str(occurrence['_id']))

            if 'reverse' in attribute:  
                if 'expression' in attribute['reverse']:
                    if re.search(_regex_legacy_expression, attribute['reverse']['expression']):
                        if attribute['reverse']['expression'] not in found_legacy_expressions:
                            found_legacy_expressions.append(attribute['reverse']['expression'])
                        find_object_occurrences.append({'_id':str(occurrence['_id']), 'expression':attribute['reverse']['expression'], 'type':'attribute.reverse.expression', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(attribute['reverse']['expression'])})
                        if debug==True:
                            print ('ocurrence: ' + str(occurrence['_id']) + ' attribute: ' + str(attribute['reverse']['expression']))
                        if translation_legacy_expressions!=[]:
                            # Do the replacement of the legacy expression
                            if attribute['reverse']['expression'] in translation_legacy_expressions[0]:
                                attribute['reverse']['expression'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(attribute['reverse']['expression'])]
                                if debug==True:
                                    print(' Replaced expression: "' + attribute['reverse']['expression'] + '" in object: ' + str(occurrence['_id']))
                            else:
                                print('ERROR: Expression not found in translation file: ' + attribute['reverse']['expression'] + ' in object: ' + str(occurrence['_id']))
    
    if 'commands' in occurrence:
        for command in occurrence['commands']:
            if 'expression' in command:
                if re.search(_regex_legacy_expression, command['expression']):
                    if command['expression'] not in found_legacy_expressions:
                        found_legacy_expressions.append(command['expression'])
                    find_object_occurrences.append({'_id':str(occurrence['_id']), 'expression':command['expression'], 'type':'command.expression', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(command['expression'])})
                    if debug==True:
                        print ('ocurrence: ' + str(occurrence['_id']) + ' command: ' + str(command['expression']))
                    if translation_legacy_expressions!=[]:
                        # Do the replacement of the legacy expression
                        if command['expression'] in translation_legacy_expressions[0]:
                            command['expression'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(command['expression'])]
                            if debug==True:
                                print(' Replaced expression: "' + command['expression'] + '" in object: ' + str(occurrence['_id']))
                        else:
                            print('ERROR: Expression not found in translation file: ' + command['expression'] + ' in object: ' + str(occurrence['_id']))
            
    if 'endpoint' in occurrence:
        if re.search(_regex_legacy_expression, occurrence['endpoint']):
            if occurrence['endpoint'] not in found_legacy_expressions:
                found_legacy_expressions.append(occurrence['endpoint'])
            find_object_occurrences.append({'_id':str(occurrence['_id']), 'expression':occurrence['endpoint'], 'type':'endpoint', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(occurrence['endpoint'])})
            if debug==True:
                print ('ocurrence: ' + str(occurrence['_id']) + ' endpoint: ' + str(occurrence['endpoint']))
            if translation_legacy_expressions!=[]:
                # Do the replacement of the legacy expression
                if occurrence['endpoint'] in translation_legacy_expressions[0]:
                    occurrence['endpoint'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(occurrence['endpoint'])]
                    if debug==True:
                        print(' Replaced expression: "' + occurrence['endpoint'] + '" in object: ' + str(occurrence['_id']))
                else:
                    print('ERROR: Expression not found in translation file: ' + occurrence['endpoint'] + ' in object: ' + str(occurrence['_id']))

    if 'entityNameExp' in occurrence:
        if re.search(_regex_legacy_expression, occurrence['entityNameExp']):
            if occurrence['entityNameExp'] not in found_legacy_expressions:
                found_legacy_expressions.append(occurrence['entityNameExp'])
            find_object_occurrences.append({'_id':str(occurrence['_id']), 'expression':occurrence['entityNameExp'], 'type':'entityNameExp', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(occurrence['entityNameExp'])})
            if debug==True:
                print ('ocurrence: ' + str(occurrence['_id']) + ' entityNameExp: ' + str(occurrence['entityNameExp']))
            if translation_legacy_expressions!=[]:
                # Do the replacement of the legacy expression
                if occurrence['entityNameExp'] in translation_legacy_expressions[0]:
                    occurrence['entityNameExp'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(occurrence['entityNameExp'])]
                    if debug==True:
                        print(' Replaced expression: "' + occurrence['entityNameExp'] + '" in object: ' + str(occurrence['_id']))
                else:
                    print('ERROR: Expression not found in translation file: ' + occurrence['entityNameExp'] + ' in object: ' + str(occurrence['_id']))

    if 'explicitAttrs' in occurrence:
        if re.search(_regex_legacy_expression, str(occurrence['explicitAttrs'])):       # Note that explicitAttrs can be a boolean value. For that reason, we convert ocurrence['explicitAttrs'] to string, otherwise "TypeError: expected string or bytes-like object" will be raised
            if occurrence['explicitAttrs'] not in found_legacy_expressions:
                found_legacy_expressions.append(occurrence['explicitAttrs'])
            find_object_occurrences.append({'_id':str(occurrence['_id']), 'expression':occurrence['explicitAttrs'], 'type':'explicitAttrs', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(occurrence['explicitAttrs'])})
            if debug==True:
                print ('ocurrence: ' + str(occurrence['_id']) + ' explicitAttrs: ' + str(occurrence['explicitAttrs']))
            if translation_legacy_expressions!=[]:
                # Do the replacement of the legacy expression
                # occurrence['explicitAttrs'] = translation_legacy_expressions[found_legacy_expressions.index(occurrence['explicitAttrs'])]
                if occurrence['explicitAttrs'] in translation_legacy_expressions[0]:
                    occurrence['explicitAttrs'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(occurrence['explicitAttrs'])]
                    if debug==True:
                        print(' Replaced expression: "' + occurrence['explicitAttrs'] + '" in object: ' + str(occurrence['_id']))
                else:
                    print('ERROR: Expression not found in translation file: ' + occurrence['explicitAttrs'] + ' in object: ' + str(occurrence['_id']))
    
    if 'expressionLanguage' in occurrence:
        if expressionlanguage == 'delete':
            if debug==True:
                print ('ocurrence: ' + str(occurrence['_id']) + ' expressionLanguage: ' + str(occurrence['expressionLanguage']))
            del occurrence['expressionLanguage']
        elif expressionlanguage == 'jelx':
            if debug==True:
                print ('ocurrence: ' + str(occurrence['_id']) + ' expressionLanguage: ' + str(occurrence['expressionLanguage']))
            occurrence['expressionLanguage'] = 'jexl'


    # Update element in the database
    if commit and translation_legacy_expressions!=[]:
        client[mongodb_db][mongodb_collection].replace_one(
            {'_id': occurrence['_id']},
            occurrence
        )

    # Update element in the list of objects with 
    object_replaced_list.append(parse_json(occurrence))

    
# write the results to files
f1 = open(init_time+"legacy_expression_occurrences.json", "w")
f1.write(json.dumps(find_object_occurrences,indent=4))
f1.close()
f2 = open(init_time+"legacy_expressions_list.json", "w")
f2.write(json.dumps(found_legacy_expressions,indent=4))
f2.close()
f3 = open(init_time+"objects_replaced.json", "w")
f3.write(json.dumps(object_replaced_list,indent=4))
f3.close()
f4 = open(init_time+"objects_backup.json", "w")
f4.write(json.dumps(object_occurrences_backup,indent=4))
f4.close()

if args['statistics']:
    
    # Load data into pandas dataframe
    df = pd.DataFrame(find_object_occurrences, columns=['_id', 'expression', 'type', 'service', 'subservice', 'expressionIndex'])

    # Configure pandas to display all data
    pd.set_option('expand_frame_repr', False)
    pd.set_option('display.max_rows', None)  # more options can be specified also
    pd.set_option('display.max_columns', None)  # more options can be specified also

    table_collums = ['service']

    if args['statistics'] == 'subservice':
        table_collums.append('subservice')

    new = df.pivot_table(index='expression', columns=table_collums, values=['_id'], aggfunc='count', fill_value=0)
    
    # Display all data
    print(new)
    # df.to_csv('out.csv', index=False,delimiter=';')  
