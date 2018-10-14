// ==UserScript==
// @name        Solarized Webpages
// @namespace   tyost
// @description Adjusts websites to fit the Solarized color palette.
// @include     *
// @include     about:blank#solarized-config
// @version     0.2.0
// @grant       GM.setValue
// @grant       GM.getValue
// @run-at      document-start
// ==/UserScript==
/**
  Interprets CSS color values.
*/
var CssColorValues = /** @class */ (function () {
    function CssColorValues() {
        this.colorGradientRegex = new RegExp('^(-(moz|ms|o|webkit)-)?' +
            '(linear-gradient|repeating-linear-gradient|radial-gradient|repeating-radial-gradient)');
    }
    /** Returns true if the specified CSS value is a color gradient. */
    CssColorValues.prototype.isColorGradient = function (cssValue) {
        return this.colorGradientRegex.test(cssValue);
    };
    ;
    return CssColorValues;
}());
/// <reference path="./CssColorValues.ts"/>
/**
  Interprets CSS style declarations.
*/
var CssStyleDeclarations = /** @class */ (function () {
    function CssStyleDeclarations() {
        this.cssColorValues = new CssColorValues();
    }
    /**
      Return true if the style declaration has a background image set that is
        not a color gradient.
    */
    CssStyleDeclarations.prototype.hasNonColorBackgroundImage = function (computedStyle) {
        var backgroundImage = computedStyle.getPropertyValue('background-image');
        return backgroundImage &&
            backgroundImage !== 'none' &&
            !this.cssColorValues.isColorGradient(backgroundImage);
    };
    /**
      Return true if the style declaration has a background color set that is
        not transparent.
    */
    CssStyleDeclarations.prototype.hasVisibleBackgroundColor = function (computedStyle) {
        var backgroundColor = computedStyle.getPropertyValue('background-color');
        return backgroundColor && backgroundColor !== 'transparent';
    };
    return CssStyleDeclarations;
}());
/**
  Provides operations to simplify working with an element's attributes.
*/
var ElementAttributes = /** @class */ (function () {
    function ElementAttributes() {
    }
    /**
      Set a DOM element's attribute to a new value only if the new value is
        different than the old value. This function avoids unnecessary DOM
        changes which can be expensive.
    */
    ElementAttributes.prototype.setAttributeLazy = function (element, attribute, value) {
        if (element.getAttribute(attribute) != value) {
            element.setAttribute(attribute, value);
        }
    };
    ;
    return ElementAttributes;
}());
/// <reference path="./CssStyleDeclarations.ts"/>
/// <reference path="./ElementAttributes.ts"/>
/// <reference path="./ElementMarker.ts"/>
/**
  Marks an element for CSS to indicate an element had a background color set
    prior to recoloring.
*/
var BackgroundColorMarker = /** @class */ (function () {
    function BackgroundColorMarker() {
        this.cssStyleDeclarations = new CssStyleDeclarations();
        this.elementAttributes = new ElementAttributes();
    }
    /** Return the attribute name used to mark DOM elements. */
    BackgroundColorMarker.prototype.getAttributeName = function () {
        return 'data-has-background-color-before-solarized';
    };
    /** Mark a DOM element with this mark. */
    BackgroundColorMarker.prototype.mark = function (element) {
        this.elementAttributes.setAttributeLazy(element, this.getAttributeName(), '');
    };
    BackgroundColorMarker.prototype.requestMark = function (element, computedStyle) {
        if (this.cssStyleDeclarations.hasNonColorBackgroundImage(computedStyle) ||
            !this.cssStyleDeclarations.hasVisibleBackgroundColor(computedStyle)) {
            return;
        }
        this.mark(element);
    };
    return BackgroundColorMarker;
}());
/// <reference path="./BackgroundColorMarker.ts"/>
/** Marks certain elements that cannot be selected by CSS alone. */
var AllElementMarkers = /** @class */ (function () {
    function AllElementMarkers() {
        this.backgroundColorMarker = new BackgroundColorMarker();
    }
    AllElementMarkers.prototype.markElement = function (element) {
        var computedStyle = window.getComputedStyle(element, undefined);
        if (computedStyle) {
            this.backgroundColorMarker.requestMark(element, computedStyle);
        }
    };
    AllElementMarkers.prototype.markAllElements = function () {
        var allElements = document.getElementsByTagName('*');
        for (var i = allElements.length; i--;) {
            this.markElement(allElements[i]);
        }
    };
    ;
    return AllElementMarkers;
}());
/** Wraps global Greasemonkey functions to expose them to TypeScript. */
var Greasemonkey = /** @class */ (function () {
    function Greasemonkey() {
    }
    Greasemonkey.prototype.getValue = function (name, defaultValue) {
        if (defaultValue === void 0) { defaultValue = undefined; }
        return GM.getValue(name, defaultValue);
    };
    Greasemonkey.prototype.setValue = function (name, value) {
        GM.setValue(name, value);
    };
    ;
    return Greasemonkey;
}());
/**
 *  Creates DOM elements.
 */
var ElementFactory = /** @class */ (function () {
    function ElementFactory() {
    }
    ElementFactory.prototype.createH1 = function (text) {
        var h1 = document.createElement('h1');
        h1.innerHTML = text;
        return h1;
    };
    ElementFactory.prototype.createLabel = function (forId, text) {
        var label = document.createElement('label');
        label.setAttribute('for', forId);
        label.innerHTML = text;
        return label;
    };
    ElementFactory.prototype.createSelect = function (id, defaultValue, options) {
        var select = document.createElement('select');
        select.id = id;
        for (var value in options) {
            var text = options[value];
            var option = document.createElement('option');
            option.value = value;
            option.text = text;
            if (value === defaultValue) {
                option.selected = true;
            }
            select.appendChild(option);
        }
        return select;
    };
    return ElementFactory;
}());
/// <reference path="./Greasemonkey.ts" />
/// <reference path="./ElementFactory.ts" />
/**
 *  Creates the Configuration Page.
 */
var ConfigurationPage = /** @class */ (function () {
    function ConfigurationPage(data) {
        this.bodyFinder = new SingleElementFinder();
        this.elementFactory = new ElementFactory();
        this.greasemonkey = new Greasemonkey();
        this.data = data;
    }
    ConfigurationPage.prototype.getConfigurationOptions = function () {
        return [
            {
                data: 'colorTheme',
                label: '<b>Color Theme</b>',
                options: {
                    light: 'Light',
                    dark: 'Dark'
                }
            },
            {
                data: 'domWatch',
                label: '<b>DOM Watch</b><br>Recolor the page as it changes.'
                    + ' Disable to improve performance.',
                options: {
                    enabled: 'Enabled',
                    disabled: 'Disabled'
                }
            },
        ];
    };
    ConfigurationPage.prototype.appendToForm = function (elem) {
        this.bodyFinder.getBody().appendChild(elem);
    };
    ;
    ConfigurationPage.prototype.createOptionElements = function () {
        var _this = this;
        this.getConfigurationOptions().forEach(function (option) {
            var div = document.createElement('div');
            div.style.marginBottom = '20px';
            var label = _this.elementFactory.createLabel(option.data, option.label);
            label.style.display = 'block';
            label.style.maxWidth = '500px';
            div.appendChild(label);
            var select = _this.elementFactory.createSelect(option.data, _this.data.getValue(option.data), option.options);
            select.style.marginLeft = '10px';
            div.appendChild(select);
            _this.appendToForm(div);
            select.addEventListener('change', function () {
                _this.greasemonkey.setValue(option.data, select.value);
            });
        });
    };
    ;
    ConfigurationPage.prototype.clearBody = function () {
        this.bodyFinder.getBody().innerHTML = '';
    };
    ConfigurationPage.prototype.setupForm = function () {
        this.clearBody();
        this.appendToForm(this.elementFactory.createH1('Solarized Webpages Configuration'));
        this.createOptionElements();
    };
    ;
    return ConfigurationPage;
}());
/**
 *  Decides when to show the configuration page.
 */
var ConfigurationPageRouter = /** @class */ (function () {
    function ConfigurationPageRouter(data) {
        this.data = data;
    }
    ConfigurationPageRouter.prototype.getConfigurationUrls = function () {
        return [
            'https://github.com/tyost/solarized-webpages/blob/master/config.html',
            'https://github.com/tyost/solarized-webpages/blob/develop/config.html',
            'https://github.com/tyost/solarized-webpages/blob/private-chrome-config-page/config.html'
        ];
    };
    ConfigurationPageRouter.prototype.isConfigurationPage = function (location) {
        return this.getConfigurationUrls().indexOf(location.href) !== -1;
    };
    ConfigurationPageRouter.prototype.route = function (location) {
        if (this.isConfigurationPage(location)) {
            new ConfigurationPage(this.data).setupForm();
        }
    };
    return ConfigurationPageRouter;
}());
/**
  Enumeration of the CSS colors making up the Solarized palette.
  See: http://ethanschoonover.com/solarized
*/
var SolarizedColor;
(function (SolarizedColor) {
    SolarizedColor["Base03"] = "#002b36";
    SolarizedColor["Base02"] = "#073642";
    SolarizedColor["Base01"] = "#586e75";
    SolarizedColor["Base00"] = "#657b83";
    SolarizedColor["Base0"] = "#839496";
    SolarizedColor["Base1"] = "#93a1a1";
    SolarizedColor["Base2"] = "#eee8d5";
    SolarizedColor["Base3"] = "#fdf6e3";
    SolarizedColor["Blue"] = "#268bd2";
    SolarizedColor["Cyan"] = "#2aa198";
    SolarizedColor["Green"] = "#859900";
    SolarizedColor["Magenta"] = "#d33682";
    SolarizedColor["Orange"] = "#cb4b16";
    SolarizedColor["Red"] = "#dc322f";
    SolarizedColor["Violet"] = "#6c71c4";
    SolarizedColor["Yellow"] = "#b58900";
})(SolarizedColor || (SolarizedColor = {}));
/// <reference path="./SolarizedColor.ts"/>
/** Finds the CSS colors that should be used by the script. */
var CssColorThemes = /** @class */ (function () {
    function CssColorThemes(data) {
        // Base colors varying between light and dark.
        var colorThemes = {
            light: {
                background: SolarizedColor.Base3,
                backgroundHighlight: SolarizedColor.Base2,
                bodyText: SolarizedColor.Base00
            },
            dark: {
                background: SolarizedColor.Base03,
                backgroundHighlight: SolarizedColor.Base02,
                bodyText: SolarizedColor.Base0
            }
        };
        // Choose colors based on the user's theme setting.
        var colorTheme = colorThemes[data.getValue('colorTheme')];
        this.colors = Object.assign({}, colorTheme);
    }
    CssColorThemes.prototype.getBackground = function () {
        return this.colors.background;
    };
    CssColorThemes.prototype.getBackgroundHighlight = function () {
        return this.colors.backgroundHighlight;
    };
    CssColorThemes.prototype.getBodyText = function () {
        return this.colors.bodyText;
    };
    CssColorThemes.prototype.getHeading = function () {
        return SolarizedColor.Yellow;
    };
    CssColorThemes.prototype.getHyperlink = function () {
        return SolarizedColor.Blue;
    };
    CssColorThemes.prototype.getInteractiveElementBorder = function () {
        return SolarizedColor.Cyan;
    };
    return CssColorThemes;
}());
/** Represents common amounts of added CSS specificity to use. */
var CssSpecificity;
(function (CssSpecificity) {
    CssSpecificity[CssSpecificity["Base"] = 15] = "Base";
    CssSpecificity[CssSpecificity["Highlight"] = 16] = "Highlight";
})(CssSpecificity || (CssSpecificity = {}));
/**
 * Finds types of elements that usually exist once within a document.
 * For example, the body element usually exists once.
 */
var SingleElementFinder = /** @class */ (function () {
    function SingleElementFinder() {
    }
    SingleElementFinder.prototype.getBody = function () {
        return document.getElementsByTagName('body')[0];
    };
    ;
    SingleElementFinder.prototype.getHead = function () {
        return document.getElementsByTagName('head')[0];
    };
    ;
    SingleElementFinder.prototype.getHtmlElement = function () {
        return document.getElementsByTagName('html')[0];
    };
    ;
    SingleElementFinder.prototype.getHtmlId = function () {
        return this.getHtmlElement().getAttribute('id');
    };
    ;
    return SingleElementFinder;
}());
/// <reference path="./SingleElementFinder.ts"/>
/**
  Ensures the html element of the page has an id attribute.
*/
var HtmlIdPreparer = /** @class */ (function () {
    function HtmlIdPreparer() {
    }
    HtmlIdPreparer.prototype.isOnlyWhitespace = function (s) {
        return /^\s*$/.test(s);
    };
    ;
    HtmlIdPreparer.prototype.getDefaultHtmlId = function () {
        return 'solarizedHtml54321';
    };
    /** Assign an id to the html element if one is missing. */
    HtmlIdPreparer.prototype.setHtmlIdIfMissing = function () {
        var htmlFinder = new SingleElementFinder();
        var htmlId = htmlFinder.getHtmlId();
        if (!htmlId || this.isOnlyWhitespace(htmlId)) {
            htmlFinder.getHtmlElement().setAttribute('id', this.getDefaultHtmlId());
        }
    };
    ;
    return HtmlIdPreparer;
}());
/// <reference path="./HtmlIdPreparer.ts"/>
/// <reference path="./SingleElementFinder.ts" />
/**
 *  Increases the specificity (priority) of fragments of CSS code.
 */
var CssSpecificityRaiser = /** @class */ (function () {
    function CssSpecificityRaiser() {
    }
    CssSpecificityRaiser.prototype.buildIdSelector = function (id) {
        return '#' + id;
    };
    ;
    CssSpecificityRaiser.prototype.buildIdSelectorWithSpecificity = function (id, amount) {
        return this.buildIdSelector(id).repeat(amount);
    };
    ;
    CssSpecificityRaiser.prototype.getSubstringBefore = function (s, character) {
        return s.substring(0, s.indexOf(character));
    };
    ;
    CssSpecificityRaiser.prototype.insertBeforeAllSelectors = function (css, extraSelector) {
        var selectorCss = this.getSubstringBefore(css, '{');
        var newSelectorCss = selectorCss.replace(/([^,]+)(,|$)/g, extraSelector + ' $1$2');
        return css.replace(selectorCss, newSelectorCss);
    };
    ;
    CssSpecificityRaiser.prototype.raise = function (css, amount) {
        // An id attribute is needed on the html element to make raising specificity
        // possible.
        new HtmlIdPreparer().setHtmlIdIfMissing();
        // Insert a repeated ID before each CSS selector to artificially raise
        // its specificity by the specified amount.
        // For example, #solarizedHtml54321#solarizedHtml54321 p
        // raises the id specificity by two.
        var elementFinder = new SingleElementFinder();
        var extraSelector = this.buildIdSelectorWithSpecificity(elementFinder.getHtmlId(), amount);
        return this.insertBeforeAllSelectors(css, extraSelector);
    };
    ;
    return CssSpecificityRaiser;
}());
/// <reference path="./CssSpecificity.ts"/>
/// <reference path="./CssSpecificityRaiser.ts"/>
/**
  Represents a single rule set of CSS code.
*/
var CssRuleSet = /** @class */ (function () {
    function CssRuleSet(css, specificity) {
        this.originalCss = css;
        this.specificity = specificity;
        this.cssSpecificityRaiser = new CssSpecificityRaiser();
    }
    CssRuleSet.prototype.getFinalCss = function () {
        return this.cssSpecificityRaiser.raise(this.originalCss, this.specificity);
    };
    return CssRuleSet;
}());
/// <reference path="./BackgroundColorMarker.ts"/>
/// <reference path="./CssColorThemes.ts"/>
/// <reference path="./CssRuleSet.ts"/>
/// <reference path="./SingleElementFinder.ts"/>
/** Generates the CSS code to the page. */
var CssCode = /** @class */ (function () {
    function CssCode(cssColorThemes) {
        this.backgroundColorMarker = new BackgroundColorMarker();
        this.colorThemes = cssColorThemes;
        this.elementFinder = new SingleElementFinder();
    }
    CssCode.prototype.getGenericCss = function () {
        return new CssRuleSet("\n      * {\n        border-color: " + this.colorThemes.getBackgroundHighlight() + " !important;\n        color: " + this.colorThemes.getBodyText() + " !important;\n        text-shadow: none !important;\n      }\n    ", CssSpecificity.Base);
    };
    ;
    CssCode.prototype.getColoredBackgroundCss = function () {
        return new CssRuleSet("\n      body,\n      [" + this.backgroundColorMarker.getAttributeName() + "] {\n        background-color: " + this.colorThemes.getBackground() + " !important;\n        background-image: none !important;\n      }\n    ", CssSpecificity.Base);
    };
    ;
    CssCode.prototype.getHeadingCss = function () {
        return new CssRuleSet("\n      h1, h2, h3, h4, h5, h6, header, hgroup, thead,\n      h1 *, h2 *, h3 *, h4 *, h5 *, h6 *, header *, hgroup *, thead * {\n        color: " + this.colorThemes.getHeading() + " !important;\n      }\n    ", CssSpecificity.Base);
    };
    ;
    CssCode.prototype.getHyperlinkCss = function () {
        return new CssRuleSet("\n      a {\n        color: " + this.colorThemes.getHyperlink() + " !important;\n      }\n    ", CssSpecificity.Base);
    };
    ;
    CssCode.prototype.getHorizontalRuleCss = function () {
        return new CssRuleSet("\n      hr {\n        background-color: " + this.colorThemes.getBodyText() + " !important;\n        border-color: " + this.colorThemes.getBodyText() + " !important;\n        opacity: 1 !important;\n      }\n    ", CssSpecificity.Highlight);
    };
    ;
    CssCode.prototype.getHighlightCss = function () {
        return new CssRuleSet("\n      a[" + this.backgroundColorMarker.getAttributeName() + "],\n      applet, button, code, command, datalist, details,\n      dialog, dir, frame, frameset, input, isindex, keygen, legend,\n      listing, menu, menuitem, meter, optgroup, option, output, pre, progress,\n      select, summary, textarea {\n        background-color: " + this.colorThemes.getBackgroundHighlight() + " !important;\n        opacity: 1 !important;\n      }\n    ", CssSpecificity.Highlight);
    };
    ;
    CssCode.prototype.getInteractiveElementCss = function () {
        return new CssRuleSet("\n      a[" + this.backgroundColorMarker.getAttributeName() + "],\n      applet, button, command, datalist, details,\n      dialog, dir, input, isindex, keygen,\n      listing, menu, menuitem, meter, optgroup, option, output,\n      select, summary, textarea,\n      [role=\"button\"], [role=\"checkbox\"], [role=\"radio\"],\n      [role=\"scrollbar\"], [role=\"slider\"], [role=\"spinbutton\"],\n      [role=\"switch\"], [role=\"textbox\"] {\n        border: 1px dotted " + this.colorThemes.getInteractiveElementBorder() + " !important;\n      }\n    ", CssSpecificity.Highlight);
    };
    ;
    /** Output CSS code to the browser. */
    CssCode.prototype.addStyle = function (cssCode) {
        var head = this.elementFinder.getHead();
        if (head) {
            var styleElement = document.createElement('style');
            var styleText = document.createTextNode(cssCode);
            styleElement.appendChild(styleText);
            head.appendChild(styleElement);
        }
    };
    /** Output all of the CSS to the page. */
    CssCode.prototype.outputCss = function () {
        var cssRuleSets = [
            this.getGenericCss(),
            this.getColoredBackgroundCss(),
            this.getHeadingCss(),
            this.getHyperlinkCss(),
            this.getHorizontalRuleCss(),
            this.getHighlightCss(),
            this.getInteractiveElementCss()
        ];
        var finalCssStrings = cssRuleSets.map(function (ruleSet) {
            return ruleSet.getFinalCss();
        });
        this.addStyle(finalCssStrings.join(''));
    };
    ;
    return CssCode;
}());
/// <reference path="./SingleElementFinder.ts"/>
/** Calls other functions when an element changes in the DOM. */
var DomWatch = /** @class */ (function () {
    function DomWatch() {
        this.htmlFinder = new SingleElementFinder();
    }
    /**
      Insert all the elements from nodeList, and their children, into
      the elements array.
    */
    DomWatch.prototype.addElementNodesAndChildren = function (elements, nodeList) {
        for (var i = 0; i < nodeList.length; i++) {
            var node = nodeList.item(i);
            if (node.nodeType == Node.ELEMENT_NODE) {
                elements.push(node);
                this.addElementNodesAndChildren(elements, node.childNodes);
            }
        }
    };
    DomWatch.prototype.getChangedElements = function (records) {
        var elements = [];
        for (var i = 0; i < records.length; i++) {
            var record = records[i];
            this.addElementNodesAndChildren(elements, record.addedNodes);
            var nodeTarget = record.target;
            if (nodeTarget.nodeType == Node.ELEMENT_NODE) {
                elements.push(nodeTarget);
                this.addElementNodesAndChildren(elements, nodeTarget.childNodes);
            }
        }
        return elements;
    };
    DomWatch.prototype.createAllElementObserver = function (callback) {
        var observer = new MutationObserver(callback);
        var observerSettings = {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true,
        };
        observer.observe(this.htmlFinder.getHtmlElement(), observerSettings);
    };
    DomWatch.prototype.callForAnyChange = function (callback) {
        var _this = this;
        this.createAllElementObserver(function (records) {
            var changedElements = _this.getChangedElements(records);
            changedElements.forEach(function (element) {
                callback(element);
            });
        });
    };
    return DomWatch;
}());
/// <reference path="../lib/es6-shim.d.ts"/>
/// <reference path="./Greasemonkey.ts"/>
/** Represents the configuration options set by the user. */
var ConfigurationData = /** @class */ (function () {
    function ConfigurationData(optionMap) {
        this.optionMap = optionMap;
    }
    ConfigurationData.getDefaultOptionMap = function () {
        var optionMap = new Map();
        optionMap.set('colorTheme', 'dark');
        optionMap.set('domWatch', 'enabled');
        return optionMap;
    };
    /** Return an instance loaded from the user's settings. */
    ConfigurationData.createFromDatabase = function () {
        return new Promise(function (resolve) {
            var greasemonkey = new Greasemonkey();
            var optionMap = new Map();
            var optionPromises = [];
            ConfigurationData
                .getDefaultOptionMap()
                .forEach(function (defaultValue, optionName) {
                var getValuePromise = greasemonkey.getValue(optionName, defaultValue);
                getValuePromise.then(function (value) {
                    optionMap[optionName] = value;
                });
                optionPromises.push(getValuePromise);
            });
            Promise.all(optionPromises).then(function () {
                resolve(new ConfigurationData(optionMap));
            });
        });
    };
    /** Return the value of an option. */
    ConfigurationData.prototype.getValue = function (optionName) {
        return this.optionMap[optionName];
    };
    return ConfigurationData;
}());
/// <reference path="../lib/es6-shim.d.ts" />
/// <reference path="./AllElementMarkers.ts"/>
/// <reference path="./ConfigurationData.ts" />
/// <reference path="./ConfigurationPageRouter.ts" />
/// <reference path="./CssCode.ts"/>
/// <reference path="./CssColorThemes.ts"/>
/// <reference path="./DomWatch.ts"/>
/// <reference path="./SingleElementFinder.ts"/>
var onLoad = function () {
    'use strict';
    // Obtain the configuration options or defaults from the database.
    ConfigurationData.createFromDatabase().then(function (data) {
        // Mark elements on the page that cannot be selected by CSS alone.
        var markers = new AllElementMarkers();
        markers.markAllElements();
        // After the page loads, start rescanning and marking elements that change.
        if (data.getValue('domWatch') === 'enabled') {
            new DomWatch().callForAnyChange(function (element) {
                markers.markElement(element);
            });
        }
        // Recolor the page with CSS based on the user's configuration.
        var cssColorThemes = new CssColorThemes(data);
        new CssCode(cssColorThemes).outputCss();
        // Show the configuration page when needed.
        new ConfigurationPageRouter(data).route(window.location);
    });
};
window.addEventListener("load", onLoad);
/// <reference path="Greasemonkey.ts"/>
/** Initializes default configuration settings for the user. */
var ConfigurationDefaults = /** @class */ (function () {
    function ConfigurationDefaults() {
        this.greasemonkey = new Greasemonkey();
    }
    /** Initializes a setting to a default value if it does not exist. */
    ConfigurationDefaults.prototype.initializeSetting = function (setting, defaultValue) {
        this.greasemonkey.setValue(setting, this.greasemonkey.getValue(setting, defaultValue));
    };
    ;
    /** Sets defaults for user settings that do not exist. */
    ConfigurationDefaults.prototype.initialize = function () {
        this.initializeSetting('colorTheme', 'dark');
    };
    ;
    return ConfigurationDefaults;
}());
