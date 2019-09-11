import { Injectable } from '@angular/core';

export class EmptyTree {
  public toString() {
    return '';
  }

  public valueOf() {
    return null;
  }
}

@Injectable({providedIn: 'root'})
export class JxonService {

  private opts = {
    valueKey:            '_',
    attrKey:             '$',
    attrPrefix:          '$',
    lowerCaseTags:       false,
    trueIsEmpty:         false,
    autoDate:            false,
    ignorePrefixedNodes: false,
    parseValues:         false
  };
  private aCache = [];
  private DOMParser;

  public config(opts) {
    this.opts = opts;
  }

  public stringToJs(str: string): any {
    const xmlObj = this.stringToXml(str);
    return this.xmlToJs(xmlObj);
  }

  public stringify(oObjTree, sNamespaceURI /* optional */, sQualifiedName /* optional */, oDocumentType /* optional */): string {
    return this.jsToString(oObjTree, sNamespaceURI /* optional */, sQualifiedName /* optional */, oDocumentType /* optional */)
  }

  public jsToString(oObjTree, sNamespaceURI /* optional */, sQualifiedName /* optional */, oDocumentType /* optional */): string {
    return this.xmlToString(
      this.jsToXml(oObjTree, sNamespaceURI, sQualifiedName, oDocumentType)
    );
  }

  public each(arr, func, thisArg) {
    if (arr instanceof Array) {
      arr.forEach(func, thisArg);
    } else {
      [arr].forEach(func, thisArg);
    }
  }

  private parseText(sValue) {

    const rIsNull = /^\s*$/;
    const rIsBool = /^(?:true|false)$/i;

    if (!this.opts.parseValues) {
      return sValue;
    }

    if (rIsNull.test(sValue)) {
      return null;
    }

    if (rIsBool.test(sValue)) {
      return sValue.toLowerCase() === 'true';
    }

    if (isFinite(sValue)) {
      return parseFloat(sValue);
    }

    if (this.opts.autoDate && isFinite(Date.parse(sValue))) {
      return new Date(sValue);
    }

    return sValue;
  }

  private objectify(vValue) {
    return vValue === null ? new EmptyTree() : vValue instanceof Object ? vValue : new vValue.constructor(vValue);
  }

  private createObjTree(oParentNode, nVerb, bFreeze, bNesteAttr) {
    const CDATA = 4;
    const TEXT = 3;
    const ELEMENT = 1;
    const nLevelStart = this.aCache.length;
    const bChildren = oParentNode.hasChildNodes();
    const bAttributes = oParentNode.nodeType === oParentNode.ELEMENT_NODE && oParentNode.hasAttributes();
    const bHighVerb = Boolean(nVerb & 2);
    let nLength = 0;
    let sCollectedTxt = '';
    let vResult = bHighVerb ? {} : /* put here the default value for empty nodes: */ (this.opts.trueIsEmpty ? true : '');
    let sProp;
    let vContent;

    if (bChildren) {
      for (let oNode, nItem = 0; nItem < oParentNode.childNodes.length; nItem++) {

        oNode = oParentNode.childNodes.item(nItem);
        if (oNode.nodeType === CDATA) {
          sCollectedTxt += oNode.nodeValue;
        } /* nodeType is "CDATASection" (4) */
        else if (oNode.nodeType === TEXT) {
          sCollectedTxt += oNode.nodeValue.trim();
        } /* nodeType is "Text" (3) */
        else if (oNode.nodeType === ELEMENT && !(this.opts.ignorePrefixedNodes && oNode.prefix)) {
          this.aCache.push(oNode);
        }
        /* nodeType is "Element" (1) */
      }
    }

    const nLevelEnd = this.aCache.length;
    const vBuiltVal = this.parseText(sCollectedTxt);

    if (!bHighVerb && (bChildren || bAttributes)) {
      vResult = nVerb === 0 ? this.objectify(vBuiltVal) : {};
    }

    for (let nElId = nLevelStart; nElId < nLevelEnd; nElId++) {

      sProp = this.aCache[nElId].nodeName;
      if (this.opts.lowerCaseTags) {
        sProp = sProp.toLowerCase();
      }

      vContent = this.createObjTree(this.aCache[nElId], nVerb, bFreeze, bNesteAttr);
      if (vResult.hasOwnProperty(sProp)) {
        if (vResult[sProp].constructor !== Array) {
          vResult[sProp] = [vResult[sProp]];
        }

        vResult[sProp].push(vContent);
      } else {
        vResult[sProp] = vContent;

        nLength++;
      }
    }

    if (bAttributes) {
      const nAttrLen = oParentNode.attributes.length;
      const sAPrefix = bNesteAttr ? '' : this.opts.attrPrefix;
      const oAttrParent = bNesteAttr ? {} : vResult;

      for (let oAttrib, oAttribName, nAttrib = 0; nAttrib < nAttrLen; nLength++, nAttrib++) {

        oAttrib = oParentNode.attributes.item(nAttrib);

        oAttribName = oAttrib.name;
        if (this.opts.lowerCaseTags) {
          oAttribName = oAttribName.toLowerCase();
        }

        oAttrParent[sAPrefix + oAttribName] = this.parseText(oAttrib.value.trim());
      }

      if (bNesteAttr) {
        if (bFreeze) {
          Object.freeze(oAttrParent);
        }

        vResult[this.opts.attrKey] = oAttrParent;

        nLength -= nAttrLen - 1;
      }

    }

    if (nVerb === 3 || (nVerb === 2 || nVerb === 1 && nLength > 0) && sCollectedTxt) {
      vResult[this.opts.valueKey] = vBuiltVal;
    } else if (!bHighVerb && nLength === 0 && sCollectedTxt) {
      vResult = vBuiltVal;
    }
    if (bFreeze && (bHighVerb || nLength > 0)) {
      Object.freeze(vResult);
    }

    this.aCache.length = nLevelStart;

    return vResult;
  }

  private loadObjTree(oXMLDoc, oParentEl, oParentObj) {
    let vValue;
    let oChild;
    let elementNS;

    if (oParentObj.constructor === String || oParentObj.constructor === Number || oParentObj.constructor === Boolean) {
      oParentEl.appendChild(oXMLDoc.createTextNode(oParentObj.toString())); /* verbosity level is 0 or 1 */
      if (oParentObj === oParentObj.valueOf()) {
        return;
      }

    } else if (oParentObj.constructor === Date) {
      oParentEl.appendChild(oXMLDoc.createTextNode(oParentObj.toISOString()));
    }
    for (const sName in oParentObj) {

      vValue = oParentObj[sName];
      if (vValue === undefined) {
        continue;
      }
      if (vValue === null) {
        vValue = {};
      }

      if (isFinite(sName) || vValue instanceof Function) {
        continue;
      }

      /* verbosity level is 0 */
      if (sName === this.opts.valueKey) {
        if (vValue !== null && vValue !== true) {
          oParentEl.appendChild(oXMLDoc.createTextNode(vValue.constructor === Date ? vValue.toISOString() : String(vValue)));
        }

      } else if (sName === this.opts.attrKey) { /* verbosity level is 3 */
        for (const sAttrib in vValue) {
          oParentEl.setAttribute(sAttrib, vValue[sAttrib]);
        }
      } else if (sName === this.opts.attrPrefix + 'xmlns') {
        if (isNodeJs) {
          oParentEl.setAttribute(sName.slice(1), vValue);
        }
        // do nothing: special handling of xml namespaces is done via createElementNS()
      } else if (sName.charAt(0) === this.opts.attrPrefix) {
        oParentEl.setAttribute(sName.slice(1), vValue);
      } else if (vValue.constructor === Array) {
        for (const nItem in vValue) {
          if (!vValue.hasOwnProperty(nItem)) {
            continue;
          }
          elementNS = (vValue[nItem] && vValue[nItem][this.opts.attrPrefix + 'xmlns']) || oParentEl.namespaceURI;
          if (elementNS) {
            oChild = oXMLDoc.createElementNS(elementNS, sName);
          } else {
            oChild = oXMLDoc.createElement(sName);
          }

          this.loadObjTree(oXMLDoc, oChild, vValue[nItem] || {});
          oParentEl.appendChild(oChild);
        }
      } else {
        elementNS = (vValue || {})[this.opts.attrPrefix + 'xmlns'] || oParentEl.namespaceURI;
        if (elementNS) {
          oChild = oXMLDoc.createElementNS(elementNS, sName);
        } else {
          oChild = oXMLDoc.createElement(sName);
        }
        if (vValue instanceof Object) {
          this.loadObjTree(oXMLDoc, oChild, vValue);
        } else if (vValue !== null && (vValue !== true || !this.opts.trueIsEmpty)) {
          oChild.appendChild(oXMLDoc.createTextNode(vValue.toString()));
        }
        oParentEl.appendChild(oChild);
      }
    }
  }

  private build(oXMLParent, nVerbosity?, bFreeze ?, bNesteAttributes ?) {
    return this.xmlToJs(oXMLParent, nVerbosity , bFreeze, bNesteAttributes );
  }

  private xmlToJs(oXMLParent, nVerbosity?, bFreeze ?, bNesteAttributes ?) {
    const _nVerb = arguments.length > 1 && typeof nVerbosity === 'number' ? nVerbosity & 3 : /* put here the default verbosity level: */ 1;
    return this.createObjTree(oXMLParent, _nVerb, bFreeze || false, arguments.length > 3 ? bNesteAttributes : _nVerb === 3);
  }

  private unbuild(oObjTree, sNamespaceURI ?, sQualifiedName ?, oDocumentType ?) {
    return this.jsToXml(oObjTree, sNamespaceURI , sQualifiedName , oDocumentType );
  }

  private jsToXml(oObjTree, sNamespaceURI?, sQualifiedName?, oDocumentType ?) {
    const documentImplementation = xmlDom.document && xmlDom.document.implementation || new xmlDom.DOMImplementation();
    const oNewDoc = documentImplementation.createDocument(sNamespaceURI || null, sQualifiedName || '', oDocumentType || null);
    this.loadObjTree(oNewDoc, oNewDoc.documentElement || oNewDoc, oObjTree);
    return oNewDoc;
  }

  private stringToXml(xmlStr) {
    if (!DOMParser) {
      DOMParser = new xmlDom.DOMParser();
    }
    return DOMParser.parseFromString(xmlStr, 'application/xml');
  }

  private xmlToString(xmlObj) {
    if (typeof xmlObj.xml !== 'undefined') {
      return xmlObj.xml;
    } else {
      return (new xmlDom.XMLSerializer()).serializeToString(xmlObj);
    }
  }

}
