/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { spawn, ChildProcess } from 'child_process';
import { totalmem } from 'os';
import { exists } from 'fs';
import * as xml2js from 'xml2js';

export class SrcItem {
	id: string;
	type: string;
	value: any;
	name: string
	children?: SrcItem[];
	
}




export function listItems(rootId: string): Promise<SrcItem> {


	let rootItem:  SrcItem = {
		id: rootId,
		name:"AST",
		type:"root",
		value:null
	};
	const map = new Map<string, SrcItem>();

	map.set(rootId, rootItem);

	return new Promise((resolve, reject) => {

		function iterate(obj, stack) {
			for (var property in obj) {
				if (obj.hasOwnProperty(property)) {
					var prop = obj[property];
					if (typeof obj[property] == "object") {
						console.log(stack + '.' + property  );
						 // add object property
						addToTree(
							stack,
							stack + '.' + property,
							property,
							typeof obj[property],
							""
						);

						iterate(prop, stack + '.' + property);
					} else {
						console.log(stack + '.' + property + " = " + prop +  " type= (" +typeof obj[property] +")" );
						
						addToTree(
							stack,
							stack + '.' + property,
							property,
							typeof obj[property],
							prop
						);
						
		
					}
				}
			}
		}

		function addToTree(parentId: string, id:string, name: string, type: string, value: string) {

			   console.log("add 2 tree: " + id +" to " + parentId);
			   const parent = map.get(parentId);

				const item: SrcItem = {
					id,
					name,
					type,
					value
				};
				map.set(item.id, item);

				if (item.id === rootId) {
					rootItem = item;
				}

				if (parent) {
					if (!parent.children) {
						parent.children = [];
					}
					parent.children.push(item);
					console.log("link: " + item.id +" to " + parent.id);
				}else{
					console.log("Not found in map " + parentId);
				}
			
		}


		let proc: ChildProcess;

		console.log( "createing process");
		//proc = spawn('c:/Program Files/srcML/srcml.exe',[ "--position", "-text='int v=12345;'" ,"--language=C++"] );
		//proc = spawn('c:/Program Files/srcML/srcml.exe', ["--position", "-text='int v=12345;'", "--language=C++"]);
		proc = spawn('srcml.exe', [ "-text={ int v=12345; }", "--language=C"]);
	
		
		proc.stdout.setEncoding('utf8');
		proc.stdout.on('data', (lines => {
			console.log("\nsrcML Raw output:" + lines +"\n");
			var parser = new xml2js.Parser(/* options */);
				
			parser.parseStringPromise(lines).then(function (result) {
				  // console.dir(result);
				  // console.dir( result);
				  iterate(result,"AST");
				  console.log('\nDone');
				  
				}).catch( err =>{
					console.log('Parsing error:' +err);    
				});	 
				
				
			}));
			
			
		
		proc.on('error', (err) => {
			reject(err.message);
		});

		proc.stderr.setEncoding('utf8');
		proc.stderr.on('data', data => {
			reject(data.toString());
		});

		proc.on('close', (n) => {
			//resolve(rootItem);
		});

		proc.on('exit', (code, signal) => {
			if (code === 0) {
				resolve(rootItem);
			} else if (code > 0) {
				reject(`process terminated with exit code: ${code}`);
			}
			if (signal) {
				reject(`process terminated with signal: ${signal}`);
			}
		});

	});
}
