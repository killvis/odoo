(function () {
'use strict';

var customArchNodes = we3.customArchNodes;
var FragmentNode = we3.ArchNodeFragment;
var ArchNode = we3.ArchNode;
var RootNode = we3.ArchNodeRoot;
var ArchNodeText = we3.ArchNodeText;
var VirtualText = we3.ArchNodeVirtualText;
var tags = we3.tags;
var reEscaped = /(&[a-z0-9]+;)/gi;
var technicalSpan = document.createElement('span');

var BaseArch = class extends we3.AbstractPlugin {
    constructor () {
        super(...arguments);
        this.dependencies = ['BaseRules', 'BaseRenderer', 'BaseRange'];
    }

    setEditorValue (value) {
        var self = this;
        return this.bypassUpdateConstraints(function () {
            self._reset(value || '');
            return self._arch.toString({});
        });
    }
    start () {
        var self = this;
        var promise = super.start();
        var Rules = this.dependencies.BaseRules;
        this.parserRuleList = Rules.parserRuleList.slice();
        Object.values(customArchNodes).forEach(function (Constructor) {
            if (Constructor.parse !== ArchNode.parse) {
                self.parserRuleList.push(Constructor.parse);
            }
        });

        this._changes = [];
        this._arch = new RootNode({
            options: this.options,
            parentedRules: Rules.parentedRulesList,
            parserRules: self.parserRuleList,
            orderRules: Rules.orderRulesList,
            isVoidoid: Rules.isVoidoid.bind(Rules),
            isEditableNode: Rules.isEditableNode.bind(Rules),
            isUnbreakableNode: Rules.isUnbreakableNode.bind(Rules),
            bypassUpdateConstraints: this.bypassUpdateConstraints.bind(this),
            isBypassUpdateConstraintsActive: function () {
                return self.bypassUpdateConstraintsActive;
            },
            get currentRuleID () {
                return Rules.currentRuleID;
            },
            add: this._addToArch.bind(this),
            create: function (nodeName, attributes, nodeValue, type) {
                return self._importJSON({
                    nodeName: nodeName,
                    attributes: attributes,
                    nodeValue: nodeValue,
                    type: type,
                });
            },
            change: this._changeArch.bind(this),
            remove: this._removeFromArch.bind(this),
            import: this._importJSON.bind(this),
        });
        this._reset();

        return promise;
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------
    /**
     * @param {object} [options]
     * @param {boolean} options.keepVirtual
     * @param {boolean} options.architecturalSpace
     * @param {boolean} options.showIDs
     * @returns {string}
     **/
    getValue (options) {
        var value = this._arch.toString(options || {}).trim();
        return value
    }
    /**
     * @param {string|number|ArchNode|JSON} DOM
     * @returns {ArchNode}
     **/
    parse (DOM) {
        var self = this;
        var fragment;
        if (typeof DOM === 'string') {
            fragment = this._parse(DOM);
        } else if (typeof DOM === 'number') {
            var archNode = this.getArchNode(DOM);
            if (archNode !== this._arch && !archNode.isFragment()) {
                fragment = new FragmentNode(this._arch.params);
                fragment.append(archNode);
            } else {
                fragment = archNode;
            }
        } else if (DOM instanceof ArchNode) {
            var archNode = DOM.isClone() ? this._importJSON(DOM.toJSON({keepVirtual: true})) : DOM;
            fragment = new FragmentNode(this._arch.params);
            fragment.append(archNode);
        } else if (DOM.ATTRIBUTE_NODE && DOM.DOCUMENT_NODE) {
            fragment = new FragmentNode(this._arch.params);
            if (DOM.nodeType !== DOM.DOCUMENT_FRAGMENT_NODE) {
                var dom = document.createDocumentFragment();
                dom.append(DOM);
                DOM = dom;
            }
            DOM.childNodes.forEach(function (node) {
                fragment.append(self._parseElement(node));
            });
        } else {
            var archNode = this._importJSON(DOM);
            if (archNode.isFragment()) {
                fragment = archNode;
            } else {
                fragment = new FragmentNode(this._arch.params);
                fragment.append(archNode);
            }
        }
        return fragment;
    }
    bypassUpdateConstraints (callback) {
        this.bypassUpdateConstraintsActive = true;
        var res = callback();
        this.bypassUpdateConstraintsActive = false;
        return res;
    }

    //--------------------------------------------------------------------------
    // Public GETTER
    //--------------------------------------------------------------------------

    /**
     * @param {Int} id
     * @param {boolean} options.keepVirtual
     * @param {boolean} options.architecturalSpace
     * @returns {JSON}
     **/
    toJSON (id, options) {
        var archNode;
        if (typeof id === 'object') {
            options = id;
            id = null;
        }
        if (id) {
            archNode = this.getArchNode(id);
        } else {
            archNode = this._arch;
        }
        var value = archNode ? archNode.toJSON(options) : {};
        return value;
    }
    getArchNode (idOrElement) {
        var archNodeId = typeof idOrElement === 'number' ? idOrElement : this.dependencies.BaseRenderer.getID(idOrElement);
        return this._archNodeList[archNodeId];
    }
    getClonedArchNode (idOrElement) {
        var archNodeId = typeof idOrElement === 'number' ? idOrElement : this.dependencies.BaseRenderer.getID(idOrElement);
        return this._archClone.getNode(archNodeId);
    }

    //--------------------------------------------------------------------------
    // Public SETTER
    //--------------------------------------------------------------------------

    wrap (id) {

        console.warn('todo');
    }
    unwrap (id) {
        var archNode = this.getArchNode(id);
        var parent = archNode.parent;
        var offset = archNode.index();
        var scArch = archNode.firstChild();
        var ecArch = archNode.lastChild();
        var range;
        if (scArch) {
            range = {
                scID: scArch.id,
                so: 0,
                ecID: ecArch.id,
                eo: ecArch.length(),
            };
        }
        this._resetChange();
        archNode.childNodes.slice().forEach(function (archNode) {
            parent.insert(archNode, offset);
        });
        archNode.remove();
        this._updateRendererFromChanges(range);
    }
    /**
     * @param {DOM|null} element (by default, use the range)
     **/
    remove (element) {
        this._resetChange();
        var id = typeof element === 'number' ? element : element && this.dependencies.BaseRenderer.getID(element);
        if (id) {
            this.getArchNode(id).remove();
        } else {
            this._removeFromRange();
        }
        this._changes[0].isRange = true;
        this._updateRendererFromChanges();
    }
    indent () {
        this._indent(false);
    }
    insert (DOM, element, offset) {
        this._resetChange();
        if (typeof DOM !== 'string' && this.dependencies.BaseRenderer.getID(DOM)) {
            DOM = this.dependencies.BaseRenderer.getID(DOM);
        }
        var id = typeof element === 'number' ? element : element && this.dependencies.BaseRenderer.getID(element);
        if (!id) {
            var range = this.dependencies.BaseRange.getRange();
            if (range.isCollapsed()) {
                id = range.scID;
                offset = range.so;
            } else {
                id = this._removeFromRange({
                    doNotRemoveEmpty: true,
                }).id;
                offset = 0;
            }
        }
        var index = this._changes.length;
        this._insert(DOM, id, offset);
        if (this._changes.length > index) {
            this._changes[index].isRange = true;
        }
        this._updateRendererFromChanges();
    }
    insertAfter (DOM, id) {
        var archNode = this.getArchNode(id);
        this.insert(DOM, archNode.parent.id, archNode.index() + 1);
    }
    insertBefore (DOM, id) {
        var archNode = this.getArchNode(id);
        this.insert(DOM, archNode.parent.id, archNode.index());
    }
    outdent () {
        this._indent(true);
    }
    addLine () {
        this._resetChange();
        var range = this.dependencies.BaseRange.getRange();
        var id, offset;
        if (range.isCollapsed()) {
            id = range.scID;
            offset = range.so;
        } else {
            id = this._removeFromRange().id;
            offset = 0;
        }
        var index = this._changes.length;
        this.getArchNode(id).addLine(offset);
        if (this._changes.length > index) {
            this._changes[index].isRange = true;
        }
        this._updateRendererFromChanges();
    }
    createArchNode (nodeName, attributes, nodeValue, type) {
        var Constructor;
        if (type) {
            Constructor = customArchNodes[type];
        } else if (nodeName) {
            Constructor = customArchNodes[nodeName] || ArchNode;
        } else if (typeof nodeValue === 'string') {
            Constructor = ArchNodeText;
        } else {
            Constructor = VirtualText;
        }
        return new Constructor(this._arch.params, nodeName, nodeName ? attributes || [] : null, nodeValue);
    }
    removeLeft () {
        this._removeSide(true);
    }
    removeRight () {
        this._removeSide(false);
    }
    importUpdate (changes, range) {
        var self = this;

        range = range && Object.assign({}, range);

        if (changes && !('length' in changes)) {
            changes = [changes];
        }
        if (!changes.length && range) {
            this.dependencies.BaseRange.setRange(range);
            return;
        }

        var nodes = {};
        this._resetChange();

        console.warn('todo: generate a diff, from changes or json import => make changes');

        changes.forEach(function (change) {
            var archNode = self.getArchNode(change.id);
            if (archNode) {
                if (change.attributes) {
                    archNode.attributes.forEach(function (attribute) {
                        for (var k = 0, len = change.attributes.length; k < len; k++) {
                            if (change.attributes[k] === attribute[0]) {
                                return;
                            }
                        }
                        change.attributes.push([attribute[0], null]);
                    });
                    change.attributes.forEach(function (attribute) {
                        archNode.attributes.add(attribute[0], attribute[1]);
                    });
                }
                if ('nodeValue' in change) {
                    archNode.nodeValue = change.nodeValue;
                }
                if (change.childNodes) {
                    change.childNodes.forEach(function (id) {
                        if (typeof id === 'object' && id.id && self.getArchNode(id.id) || nodes[id.id]) {
                            id = id.id;
                        }
                        nodes[id] = self.getArchNode(id) || nodes[id];
                    });
                }
            } else {
                var archNode = self._importJSON(change);
            }
            nodes[archNode.id] = archNode;

            self._changeArch(archNode, 0);
        });

        changes.forEach(function (change) {
            if (!change.childNodes) {
                return;
            }
            var archNode = self.getArchNode(change.id);
            var childNodes = archNode.childNodes.slice();
            archNode.empty();
            change.childNodes.forEach(function (id) {
                if (nodes[id]) {
                    archNode.append(nodes[id]);
                } else if (typeof id === 'object') {
                    archNode.append(self._importJSON(id));
                } else {
                    throw new Error('Imported node "' + id + '" is missing');
                }
            });
        });

        this._updateRendererFromChanges(range);
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    _updateRendererFromChanges (range) {
        var self = this;

        var result = this._getChanges();
        if (!result.changes.length) {
            return;
        }

        var json = result.changes.map(function (change) {
            return self.getArchNode(change.id).toJSON({
                keepVirtual: true,
            });
        });
        this.dependencies.BaseRenderer.update(json);

        this._archClone = this._arch.clone({keepVirtual: true});

        if (range) {
            this.dependencies.BaseRange.setRange(range);
        } else {
            range = result.range;
            if (this.dependencies.BaseRenderer.getElement(range.id)) {
                this.dependencies.BaseRange.setRange({
                    scID: range.id,
                    so: range.offset,
                });
            }
        }

        this.trigger('update', json);
        this.triggerUp('change');
    }

    _addToArch (archNode) {
        var self = this;
        if (!archNode.__removed && archNode.parent && archNode.parent.id && !archNode.parent.isClone()) {
            if (!archNode.id) {
                archNode.id = ++this._id;
            }
            this._archNodeList[archNode.id] = archNode;
            if (archNode.childNodes) {
                archNode.childNodes.forEach(function (archNode) {
                    self._addToArch(archNode);
                });
            }
        }
    }
    /**
     * Return a className if param contains it.
     *
     * @param {String [][]|String} param as passed to createArchNode
     * @returns {String}
     */
    _classNameFromParam (param) {
        var className = '';
        if (!param || !Array.isArray(param)) {
            return className;
        }
        param.forEach(function (p) {
            if (p.length && p[0] === 'class') {
                className = p[1];
                return;
            }
        });
        return className;
    }
    _changeArch (archNode, offset) {
        if (archNode.isClone()) {
            return;
        }
        this._changes.push({
            archNode: archNode,
            offset: offset || 0,
        });
    }
    _getChanges () {
        var self = this;
        this.dependencies.BaseRules.applyRules(this._changes);

        var range;
        var changes = [];
        this._changes.forEach(function (c, i) {
            if (!c.archNode.id || !self.getArchNode(c.archNode.id)) {
                return;
            }
            var toAdd = true;
            changes.forEach(function (change) {
                if (change.id === c.archNode.id) {
                    toAdd = false;
                    change.offset = c.offset;
                    if (c.isRange) {
                        range = change;
                    }
                }
            });
            if (toAdd) {
                var change = {
                    id: c.archNode.id,
                    offset: c.offset,
                };
                changes.push(change);
                if (!range || c.isRange) {
                    range = change;
                }
            }
        });

        return {
            changes: changes,
            range: range,
        };
    }
    /**
     * Return true if the given `classString` contains the `classToFind`.
     *
     * @param {String} classString
     * @param {String} classToFind
     * @returns {Boolean}
     */
    _hasStringClass (classString, classToFind) {
        return new RegExp('(^| )' + classToFind + '(-| |$)').test(classString);
    }
    /**
     * Indent or outdent a format node.
     *
     * @private
     * @param {bool} outdent true to outdent, false to indent
     */
    _indent (outdent) {
        this._resetChange();
        var range = this.dependencies.BaseRange.getRange();
        var archNode = this.getArchNode(range.scID);
        if (!archNode.isAllowUpdate()) {
            return;
        }
        if (archNode.isInList()) {
            this[outdent ? '_outdentList' : '_indentList'](archNode, range.so);
        } else {
            this._indentText(archNode, outdent);
        }
        this._updateRendererFromChanges();
    }
    _indentList (archNode) {
        var listType = archNode.ancestor('isList').nodeName;
        var liAncestor = archNode.ancestor('isLi') || archNode;
        liAncestor.wrap(listType);
    }
    _indentText (archNode, outdent) {
        var block = archNode.ancestor('isBlock');
        var currentMargin = block.attributes.style['margin-left'];
        var currentFloat = currentMargin ? parseFloat(currentMargin.match(/[\d\.]*/) || 0) : 0;
        var newMargin = outdent ? currentFloat - this.options.indentMargin : currentFloat + this.options.indentMargin;
        if (newMargin <= 0) {
            block.attributes.style.remove('margin-left');
        } else {
            block.attributes.style.add('margin-left', newMargin + 'em');
        }
    }
    /**
     * Insert a node in the Arch.
     *
     * @param {string|DOM|FragmentDOM} DOM
     * @param {DOM} [element]
     * @param {Number} [offset]
     * @returns {Number}
     */
    _insert (DOM, id, offset) {
        var targetArchNode = id ? this.getArchNode(id) : this._arch;
        if (!targetArchNode) {
            console.warn('The node ' + id + ' is no longer in the ach.');
            targetArchNode = this._arch;
            offset = 0;
        }
        var fragment = this.parse(DOM);

        this._resetChange();

        offset = offset || 0;
        var childNodes = fragment.childNodes.slice();
        childNodes.forEach(function (child, index) {
            targetArchNode.insert(child, offset + index);
        });
    }
    _importJSON (json) {
        var self = this;
        var stringJSON = JSON.stringify(json);
        self.parserRuleList.forEach(function (parser) {
            var newJSON = parser(json, self.options);
            if (newJSON && stringJSON !== JSON.stringify(newJSON)) {
                json = newJSON;
            }
        });

        var archNode = this.createArchNode(json.nodeName, json.attributes, json.nodeValue, json.type);
        if (json.childNodes) {
            json.childNodes.forEach(function (json) {
                archNode.append(self._importJSON(json));
            });
        }
        archNode.id = json.id;
        return archNode;
    }
    _outdentList (archNode, offset) {
        var listAncestor = archNode.ancestor('isList');
        listAncestor = listAncestor.parent.isLi() ? listAncestor.parent : listAncestor;
        var liAncestor = archNode.ancestor('isLi') || archNode;
        var lastChild = liAncestor.lastChild();
        if (archNode.length()) {
            archNode.params.change(archNode, offset);
        } else if (lastChild && !lastChild.isDeepEmpty()) {
            lastChild.params.change(lastChild, lastChild.length());
        } else {
            if (lastChild) {
                liAncestor.empty();
            }
            liAncestor.insert(this.createArchNode());
        }
        var next;
        var hasOneChild = liAncestor.childNodes.length === 1;
        if (hasOneChild) {
            next = liAncestor.firstChild();
        } else {
            next = this.createArchNode('TEMP', []);
            next.append(liAncestor.childNodes);
        }
        listAncestor[liAncestor.index() ? 'after' : 'before'](next);
        next.nodeName = hasOneChild ? next.nodeName : (next.isInList() ? 'li' : 'p');
        var toRemove = !liAncestor.previousSibling() && !liAncestor.nextSibling() ? listAncestor : liAncestor;
        toRemove.remove();
        if (!next.isEmpty() && next.nodeName !== 'li') {
            next.deleteEdge(true, {
                doNotBreakBlocks: true,
            });
        }
    }
    /**
     * @param {string} xml
     * @returns {ArchNode}
     **/
    _parse (html) {
        var self = this;
        var fragment = new FragmentNode(this._arch.params);

        var reTags = '(' + tags.void.join('|') + ')';
        var reAttribute = '(\\s[^>/]+((=\'[^\']*\')|(=\"[^\"]*\"))?)*';
        var reVoidNodes = new RegExp('<(' + reTags + reAttribute + ')>', 'g');
        var xml = html.replace(reVoidNodes, '<\$1/>').replace(/&/g, '&amp;');
        var parser = new DOMParser();
        var element = parser.parseFromString("<root>" + xml + "</root>","text/xml");

        var root;
        if (element.querySelector('parsererror')) {
            console.error(element.firstChild);
            console.warn('XML parsing fail, fallback on HTML parsing');
            root = document.createElement('root');
            root.innerHTML = xml;
        } else {
            root = element.querySelector('root');
        }

        root.childNodes.forEach(function (element) {
            fragment.append(self._parseElement(element));
        });

        return fragment;
    }
    _parseElement (element) {
        var self = this;
        var archNode;
        if (element.tagName) {
            var attributes = Object.values(element.attributes).map(function (attribute) {
                return [attribute.name, attribute.value];
            });
            archNode = this._importJSON({
                nodeName: element.nodeName.toLowerCase(),
                attributes: attributes,
            });
            element.childNodes.forEach(function (child) {
                archNode.append(self._parseElement(child));
            });
        } else {
            archNode = this._importJSON({
                nodeValue: this._unescapeText(element.nodeValue),
            });
        }
        return archNode;
    }
    /**
     * Delete everything between the start and end points of the range
     *
     * @param {Object} [options]
     * @param {Object} [options.doNotRemoveEmpty] true to prevent the removal of empty nodes
     */
    _removeFromRange (options) {
        var range = this.dependencies.BaseRange.getRange();
        if (range.isCollapsed()) {
            return;
        }

        options = options || {};
        var virtualTextNodeBegin = this.createArchNode(); // the next range
        var virtualTextNodeEnd = this.createArchNode();

        var endNode = this.getArchNode(range.ecID);
        var commonAncestor = endNode.commonAncestor(this.getArchNode(range.scID));
        endNode.insert(virtualTextNodeEnd, range.eo);

        if (!endNode.__removed) {
            endNode.splitUntil(commonAncestor, endNode.length());
        }

        var fromNode = this.getArchNode(range.scID);
        fromNode.insert(virtualTextNodeBegin, range.so);

        var toRemove = [];
        virtualTextNodeBegin.nextUntil(function (next) {
            if (next === virtualTextNodeEnd) {
                return true;
            }
            if (next.parent && !next.isAllowUpdate() && next.parent.isAllowUpdate()) {
                toRemove.push(next);
                return false;
            }
            if (next.isAllowUpdate() && (!next.childNodes || !next.childNodes.length)) {
                toRemove.push(next);
            }
            return false;
        });

        toRemove.forEach(function (archNode) {
            var parent = archNode.parent;
            archNode.remove();
            while (parent && parent.isEmpty() && !parent.contains(virtualTextNodeBegin) &&
                (!parent.parent || parent.parent.isAllowUpdate())) {
                var newParent = parent.parent;
                parent.remove();
                parent = newParent;
            }
        });

        options.keepRight = true;
        virtualTextNodeBegin.parent.deleteEdge(false, options);

        this._removeAllVirtualText([virtualTextNodeBegin.id]);

        return virtualTextNodeBegin;
    }
    /**
     * Remove all virtual text nodes from the Arch, except the optional
     * list passed in argument
     *
     * @param {Number []} [except] id's to ignore
     */
    _removeAllVirtualText (except) {
        var self = this;
        Object.keys(this._archNodeList).forEach(function (id) {
            id = parseInt(id);
            if (except && except.indexOf(id) !== -1) {
                return;
            }
            var archNode = self.getArchNode(id);
            if (archNode.isText() && archNode.isVirtual()) {
                archNode.remove();
            }
        });
    }
    _removeFromArch (archNode) {
        var self = this;
        if (this._archNodeList[archNode.id] && !archNode.isClone()) {
            if (this._archNodeList[archNode.id] === archNode) {
                delete this._archNodeList[archNode.id];
            }
            if (archNode.childNodes) {
                archNode.childNodes.forEach(function (archNode) {
                    self._removeFromArch(archNode);
                });
            }
        }
    }
    _removeSide (isLeft) {
        this._resetChange();
        var range = this.dependencies.BaseRange.getRange();
        if (range.isCollapsed()) {
            var offset = range.so;
            var node = this.getArchNode(range.scID);
            var next = node[isLeft ? 'removeLeft' : 'removeRight'](offset);
            if (next) {
                next.lastLeaf().deleteEdge(true, {
                    doNotBreakBlocks: true,
                });
            }
         } else {
            var virtualText = this._removeFromRange();
            virtualText.parent.deleteEdge(false,  {
                keepRight: true,
            });
        }
        this._updateRendererFromChanges();
    }
    _reset (value) {
        this._id = 1;
        this._arch.id = 1;
        this._arch.parent = null;
        this._archNodeList = {'1':  this._arch};
        this._arch.childNodes = [];

        if (value) {
            this._insert(value, 1, 0);
            this.dependencies.BaseRules.applyRules(this._changes);
        }

        this.dependencies.BaseRenderer.reset(this._arch.toJSON({keepVirtual: true}));

        this._changes = [];

        this._archClone = this._arch.clone({keepVirtual: true});
    }
    _resetChange () {
        this._changes = [];
    }
    _unescapeText (text) {
        return text.replace(reEscaped, function (a, r) {
            technicalSpan.innerHTML = r;
            return technicalSpan.textContent;
        });
    }
};

var Arch = class extends we3.AbstractPlugin {
    constructor () {
        super(...arguments);
        this.dependencies = ['BaseArch'];
    }
    getValue (options) {
        return this.dependencies.BaseArch.getValue(options);
    }
    parse (DOM) {
        return this.dependencies.BaseArch.parse(DOM);
    }
    bypassUpdateConstraints (callback) {
        return this.dependencies.BaseArch.bypassUpdateConstraints(callback);
    }
    setEditorValue (value) {
        return this.dependencies.BaseArch.setEditorValue(value);
    }
    toJSON (id, options) {
        return this.dependencies.BaseArch.toJSON(id, options);
    }
    getNode (idOrElement) {
        return this.dependencies.BaseArch.getClonedArchNode(idOrElement);
    }

    //--------------------------------------------------------------------------
    // Public SETTER
    //--------------------------------------------------------------------------

    wrap (id) {
        return this.dependencies.BaseArch.wrap(id);
    }
    unwrap (id) {
        return this.dependencies.BaseArch.unwrap(id);
    }
    remove (element) {
        return this.dependencies.BaseArch.remove(element);
    }
    indent () {
        return this.dependencies.BaseArch.indent();
    }
    insert (DOM, element, offset) {
        return this.dependencies.BaseArch.insert(DOM, element, offset);
    }
    insertAfter (DOM, id) {
        return this.dependencies.BaseArch.insertAfter(DOM, id);
    }
    insertBefore (DOM, id) {
        return this.dependencies.BaseArch.insertBefore(DOM, id);
    }
    outdent () {
        return this.dependencies.BaseArch.outdent();
    }
    addLine () {
        return this.dependencies.BaseArch.addLine();
    }
    removeLeft () {
        return this.dependencies.BaseArch.removeLeft();
    }
    removeRight () {
        return this.dependencies.BaseArch.removeRight();
    }
    importUpdate (changes, range) {
        return this.dependencies.BaseArch.importUpdate(changes, range);
    }
};

we3.pluginsRegistry.BaseArch = BaseArch;
we3.pluginsRegistry.Arch = Arch;

})();
