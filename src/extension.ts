/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import { listItems, SrcItem } from './ps';
import { TreeDataProvider, TreeItem, EventEmitter, Event, ProviderResult } from 'vscode';


let mlViewer: vscode.TreeView<MLTreeItem>;

export function activate(context: vscode.ExtensionContext) {


	context.subscriptions.push(vscode.commands.registerCommand('extension.ml-tree.showmlView', () => {
		if (!mlViewer) {
			const provider = new SrcProvider();
			mlViewer = vscode.window.createTreeView('extension.ml-tree.mlViewer', { treeDataProvider: provider });
			mlViewer.onDidChangeVisibility(e => {
				if (e.visible) {
					provider.LoadTree("AST");
				}
			});
		}
		vscode.commands.executeCommand('setContext', 'extension.ml-tree.mlViewerContext', true)
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.ml-tree.startDebug', (item: MLTreeItem) => attachTo(item)));

	context.subscriptions.push(vscode.commands.registerCommand('extension.ml-tree.startDebugAll', (item: MLTreeItem) => {
		for (let child of item._children) {
			attachTo(child);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.ml-tree.kill', (item: MLTreeItem) => {
		/* if (item._pid) {
			mlnode.kill(item._pid, 'SIGTERM');
		}
		*/
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.ml-tree.forceKill', (item: MLTreeItem) => {
		/*if (item._pid) {
			mlnode.kill(item._pid, 'SIGKILL');
		}
		*/
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function attachTo(item: MLTreeItem) {

	/* const config: vscode.DebugConfiguration = {
		type: 'node',
		request: 'attach',
		name: `mlnode ${item._pid}`
	};

	let matches = DEBUG_FLAGS_PATTERN.exec(item._cmd);
	if (matches && matches.length >= 2) {
		// attach via port
		if (matches.length === 5 && matches[4]) {
			config.port = parseInt(matches[4]);
		}
		config.protocol = matches[1] === 'debug' ? 'legacy' : 'inspector';
	} else {
		// no port -> try to attach via pid (send SIGUSR1)
		config.processId = String(item._pid);
	}

	// a debug-port=n or inspect-port=n overrides the port
	matches = DEBUG_PORT_PATTERN.exec(item._cmd);
	if (matches && matches.length === 3) {
		// override port
		config.port = parseInt(matches[2]);
	}

	vscode.debug.startDebugging(undefined, config);
	*/
}

class MLTreeItem extends TreeItem {

	_parent: MLTreeItem;
	_children: MLTreeItem[];
	path:string;
	name: string;
	type: string;
	value: string;

	constructor(parent: MLTreeItem, mlnode: SrcItem) {
		super('', vscode.TreeItemCollapsibleState.None);
		this._parent = parent;
		if(mlnode){
			this.path =mlnode.id;
			this.name = mlnode.name;
			this.type = mlnode.type;
			if(this.type != "object")
				this.tooltip = mlnode.name +" [" +this.type +"]";
			else
				this.tooltip = mlnode.name;
			this.value = mlnode.value;
			if(mlnode.value ===null || mlnode.value ==="")
				this.label =  mlnode.name;
			else{
				this.label =  mlnode.name + " --> " + mlnode.value;
			}
			
		}

	}


	getChildren(): MLTreeItem[] {
		return this._children || [];
	}

	get id(): string {
		return this.path;
	}

	clear(){
		this._children =[];
	}
	/*
	 * Update this item with the information from the given SrcItem.
	 * Returns the elementId of the subtree that needs to be refreshed or undefined if nothing has changed.
	 */
	merge(mlnode: SrcItem, newItems?: MLTreeItem[]): MLTreeItem {

		if (!mlnode) {
			return undefined;
		}
		

		// update item's name
		const oldLabel = this.label;
		const oldTooltip = this.tooltip;
		if (mlnode != null) {
	
			this.name = mlnode.name;
			this.type = mlnode.type;
			if(this.type != "object")
				this.tooltip = mlnode.name +" [" +this.type +"]";
			else
				this.tooltip = mlnode.name;
			this.value = mlnode.value;
			if(mlnode.value ===null || mlnode.value ==="")
				this.label =  mlnode.name;
			else{
				this.label =  mlnode.name + " --> " + mlnode.value;
			}
			this.path =mlnode.id;
			
		}
		this.clear();

		let changed = this.label !== oldLabel || this.tooltip !== oldTooltip;

		// enable item's context (for debug actions)
		//const oldContextValue = this.contextValue;
		//this.contextValue = this.getContextValue();
		//changed = changed || this.contextValue !== oldContextValue;

		// update children
		const childChanges: MLTreeItem[] = [];
		const nextChildren: MLTreeItem[] = [];
		
		if (mlnode) {
			mlnode.children = mlnode.children || [];

			for (const child of mlnode.children) {
				let found = this._children ? this._children.find(c => child.id === c.id) : undefined;
				if (!found) {
					found = new MLTreeItem(this, child);
					if (newItems) {
						newItems.push(found);
					}
					changed = true;
				}
				const changedChild = found.merge(child, newItems);
				if (changedChild) {
					childChanges.push(changedChild);
				}
				nextChildren.push(found);
			}

			
		}
		this._children = nextChildren;

		// update collapsible state
		const oldCollapsibleState = this.collapsibleState;
		// custom explorer bug: https://github.com/Microsoft/vscode/issues/40179
		this.collapsibleState = this._children.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None;
		if (this.collapsibleState !== oldCollapsibleState) {
			changed = true;
		}

		// attribute changes or changes in more than one child
		if (changed || childChanges.length > 1) {
			return this;
		}

		// changes only in one child -> propagate that child for refresh
		if (childChanges.length === 1) {
			return childChanges[0];
		}

		// no changes
		return undefined;
	}

	/* getContextValue(): string {

		const myselfDebuggable = this.isDebuggable();

		let anyChildDebuggable = false;
		if (this._children) {
			for (let child of this._children) {
				if (child.isDebuggable()) {
					anyChildDebuggable = true;
					break;
				}
			}
		}

		if (myselfDebuggable || anyChildDebuggable) {
			let contextValue = '';
			if (myselfDebuggable) {
				contextValue += 'node';
			}
			if (myselfDebuggable && anyChildDebuggable) {
				contextValue += '-';
			}
			if (anyChildDebuggable) {
				contextValue += 'subs';
			}
			return contextValue;
		}

		return undefined;
	}

	isDebuggable(): boolean {
		const matches = DEBUG_FLAGS_PATTERN.exec(this._cmd);
		if ((matches && matches.length >= 2) || this._cmd.indexOf('node ') >= 0 || this._cmd.indexOf('node.exe') >= 0) {
			return true;
		}
		return false;
	}
	*/
}

export class SrcProvider implements TreeDataProvider<MLTreeItem> {

	private _root: MLTreeItem;

	private _onDidChangeTreeData: EventEmitter<MLTreeItem> = new EventEmitter<MLTreeItem>();
	readonly onDidChangeTreeData: Event<MLTreeItem> = this._onDidChangeTreeData.event;

	constructor() {
	}

	getTreeItem(mlTerrItem: MLTreeItem): MLTreeItem | Thenable<MLTreeItem> {
		return mlTerrItem;
	}

	getParent(element: MLTreeItem): MLTreeItem {
		return element._parent;
	}

	getChildren(element?: MLTreeItem): vscode.ProviderResult<MLTreeItem[]> {

		if (!element) {
			if (!this._root) {
				this._root = new MLTreeItem(undefined, undefined);

				return listItems("AST").then(root => {
					
					this._root.merge(root);
					return this._root.getChildren();
				}).catch(err => {
					return this._root.getChildren();
				});
			}
			element = this._root;
		}
		return element.getChildren();
	}

	LoadTree(x:string){
		const start = Date.now();
			listItems(x).then(root => {
				 console.log(`duration: ${Date.now() - start}`);
				//if (mlViewer.visible) {
					// schedule next poll only if still visible
					//this.scheduleNextPoll(cnt+1);
				//}
				const newItems: MLTreeItem[] = [];
				let mlTerrItem = this._root.merge(root, newItems);
				if (mlTerrItem) {
					// workaround for https://github.com/Microsoft/vscode/issues/40185
					if (mlTerrItem === this._root) {
						mlTerrItem = undefined;
					}
					this._onDidChangeTreeData.fire(mlTerrItem);
					if (newItems.length > 0 && mlViewer.visible) {
						for (const newItem of newItems) {
							mlViewer.reveal(newItem, { select: false } ).then(() => {
								// ok
							}, error => {
								console.log(error + ': ' + newItem.label);
							});
						}
					}
				}
			}).catch(err => {
				console.log(err);
			});
	}

	/* scheduleNextPoll(cnt: number = 1) {
		setTimeout(_ => {
			const start = Date.now();
			listItems(this._pid, cnt % 4 === 0).then(root => {
				// console.log(`duration: ${Date.now() - start}`);
				if (mlViewer.visible) {
					// schedule next poll only if still visible
					this.scheduleNextPoll(cnt+1);
				}
				const newItems: MLTreeItem[] = [];
				let mlTerrItem = this._root.merge(root, newItems);
				if (mlTerrItem) {
					// workaround for https://github.com/Microsoft/vscode/issues/40185
					if (mlTerrItem === this._root) {
						mlTerrItem = undefined;
					}
					this._onDidChangeTreeData.fire(mlTerrItem);
					if (newItems.length > 0 && mlViewer.visible) {
						for (const newItem of newItems) {
							mlViewer.reveal(newItem, { select: false } ).then(() => {
								// ok
							}, error => {
								//console.log(error + ': ' + newItem.label);
							});
						}
					}
				}
			}).catch(err => {
				// if we do not call 'scheduleNextPoll', polling stops
			});
		}, POLL_INTERVAL);
	}
	*/
}