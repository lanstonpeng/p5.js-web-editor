import React, { PropTypes } from 'react';
import CodeMirror from 'codemirror';
import beautifyJS from 'js-beautify';
import 'codemirror/mode/css/css';
import 'codemirror/addon/selection/active-line';
import 'codemirror/addon/lint/lint';
import 'codemirror/addon/lint/javascript-lint';
import 'codemirror/addon/lint/css-lint';
import 'codemirror/addon/lint/html-lint';
import 'codemirror/addon/comment/comment';
import 'codemirror/keymap/sublime';
import 'codemirror/addon/search/jump-to-line';
import { JSHINT } from 'jshint';
import { CSSLint } from 'csslint';
import { HTMLHint } from 'htmlhint';
import InlineSVG from 'react-inlinesvg';
import classNames from 'classnames';
import { debounce } from 'lodash';
import '../../../utils/htmlmixed';
import '../../../utils/p5-javascript';
import Timer from '../components/Timer';
import EditorAccessibility from '../components/EditorAccessibility';

const beautifyCSS = beautifyJS.css;
const beautifyHTML = beautifyJS.html;

window.JSHINT = JSHINT;
window.CSSLint = CSSLint;
window.HTMLHint = HTMLHint;

const beepUrl = require('../../../sounds/audioAlert.mp3');
const downArrowUrl = require('../../../images/down-arrow.svg');
const unsavedChangesDotUrl = require('../../../images/unsaved-changes-dot.svg');
const rightArrowUrl = require('../../../images/right-arrow.svg');
const leftArrowUrl = require('../../../images/left-arrow.svg');

class Editor extends React.Component {
  constructor(props) {
    super(props);
    this.tidyCode = this.tidyCode.bind(this);
  }
  componentDidMount() {
    this.beep = new Audio(beepUrl);
    this.widgets = [];
    this._cm = CodeMirror(this.codemirrorContainer, { // eslint-disable-line
      theme: `p5-${this.props.theme}`,
      lineNumbers: true,
      styleActiveLine: true,
      inputStyle: 'contenteditable',
      lineWrapping: false,
      fixedGutter: false,
      gutters: ['CodeMirror-lint-markers'],
      keyMap: 'sublime',
      lint: {
        onUpdateLinting: debounce((annotations) => {
          this.props.clearLintMessage();
          annotations.forEach((x) => {
            if (x.from.line > -1) {
              this.props.updateLintMessage(x.severity, (x.from.line + 1), x.message);
            }
          });
          if (this.props.lintMessages.length > 0 && this.props.lintWarning) {
            this.beep.play();
          }
        }, 2000),
        options: {
          'asi': true,
          'eqeqeq': false,
          '-W041': false
        }
      }
    });

    this._cm.setOption('extraKeys', {
      'Cmd-Enter': () => null,
      'Shift-Cmd-Enter': () => null,
      'Ctrl-Enter': () => null,
      'Shift-Ctrl-Enter': () => null
    });

    this.initializeDocuments(this.props.files);
    this._cm.swapDoc(this._docs[this.props.file.id]);

    this._cm.on('change', debounce(() => {
      this.props.setUnsavedChanges(true);
      this.props.updateFileContent(this.props.file.name, this._cm.getValue());
      if (this.props.autorefresh && this.props.isPlaying) {
        this.props.startRefreshSketch();
        this.props.clearConsole();
      }
    }, 400));

    this._cm.on('keyup', () => {
      const temp = `line ${parseInt((this._cm.getCursor().line) + 1, 10)}`;
      document.getElementById('current-line').innerHTML = temp;
    });

    this._cm.on('keydown', (_cm, e) => {
      // 9 === Tab
      if (e.keyCode === 9 && e.shiftKey) {
        this.tidyCode();
      }
    });

    this._cm.getWrapperElement().style['font-size'] = `${this.props.fontSize}px`;
    this._cm.setOption('indentWithTabs', this.props.isTabIndent);
    this._cm.setOption('tabSize', this.props.indentationAmount);
  }

  componentWillUpdate(nextProps) {
    // check if files have changed
    if (this.props.files[0].id !== nextProps.files[0].id) {
      // then need to make CodeMirror documents
      this.initializeDocuments(nextProps.files);
    }
    if (this.props.files.length !== nextProps.files.length) {
      this.initializeDocuments(nextProps.files);
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.file.content !== prevProps.file.content &&
        this.props.file.content !== this._cm.getValue()) {
      const oldDoc = this._cm.swapDoc(this._docs[this.props.file.id]);
      this._docs[prevProps.file.id] = oldDoc;
      this._cm.focus();
      if (!prevProps.unsavedChanges) {
        setTimeout(() => this.props.setUnsavedChanges(false), 400);
      }
    }
    if (this.props.fontSize !== prevProps.fontSize) {
      this._cm.getWrapperElement().style['font-size'] = `${this.props.fontSize}px`;
    }
    if (this.props.indentationAmount !== prevProps.indentationAmount) {
      this._cm.setOption('tabSize', this.props.indentationAmount);
    }
    if (this.props.isTabIndent !== prevProps.isTabIndent) {
      this._cm.setOption('indentWithTabs', this.props.isTabIndent);
    }
    if (this.props.theme !== prevProps.theme) {
      this._cm.setOption('theme', `p5-${this.props.theme}`);
    }
  }

  componentWillUnmount() {
    this._cm = null;
  }

  getFileMode(fileName) {
    let mode;
    if (fileName.match(/.+\.js$/i)) {
      mode = 'javascript';
    } else if (fileName.match(/.+\.css$/i)) {
      mode = 'css';
    } else if (fileName.match(/.+\.html$/i)) {
      mode = 'htmlmixed';
    } else if (fileName.match(/.+\.json$/i)) {
      mode = 'application/json';
    } else {
      mode = 'text/plain';
    }
    return mode;
  }

  initializeDocuments(files) {
    console.log('calling initialize documents');
    this._docs = {};
    files.forEach((file) => {
      if (file.name !== 'root') {
        this._docs[file.id] = CodeMirror.Doc(file.content, this.getFileMode(file.name)); // eslint-disable-line
      }
    });
  }

  tidyCode() {
    const beautifyOptions = {
      indent_size: this.props.indentationAmount,
      indent_with_tabs: this.props.isTabIndent
    };

    const mode = this._cm.getOption('mode');
    if (mode === 'javascript') {
      this._cm.doc.setValue(beautifyJS(this._cm.doc.getValue(), beautifyOptions));
    } else if (mode === 'css') {
      this._cm.doc.setValue(beautifyCSS(this._cm.doc.getValue(), beautifyOptions));
    } else if (mode === 'htmlmixed') {
      this._cm.doc.setValue(beautifyHTML(this._cm.doc.getValue(), beautifyOptions));
    }
  }

  toggleEditorOptions() {
    if (this.props.editorOptionsVisible) {
      this.props.closeEditorOptions();
    } else {
      this.optionsButton.focus();
      this.props.showEditorOptions();
    }
  }

  _cm: CodeMirror.Editor

  render() {
    const editorSectionClass = classNames({
      'editor': true,
      'sidebar--contracted': !this.props.isExpanded,
      'editor--options': this.props.editorOptionsVisible
    });

    return (
      <section
        title="code editor"
        role="main"
        className={editorSectionClass}
      >
        <header className="editor__header">
          <button
            aria-label="collapse file navigation"
            className="sidebar__contract"
            onClick={this.props.collapseSidebar}
          >
            <InlineSVG src={leftArrowUrl} />
          </button>
          <button
            aria-label="expand file navigation"
            className="sidebar__expand"
            onClick={this.props.expandSidebar}
          >
            <InlineSVG src={rightArrowUrl} />
          </button>
          <div className="editor__file-name">
            <span>
              {this.props.file.name}
              {this.props.unsavedChanges ? <InlineSVG src={unsavedChangesDotUrl} /> : null}
            </span>
            <Timer
              projectSavedTime={this.props.projectSavedTime}
              isUserOwner={this.props.isUserOwner}
            />
          </div>
          <button
            className="editor__options-button"
            aria-label="editor options"
            tabIndex="0"
            ref={(element) => { this.optionsButton = element; }}
            onClick={() => {
              this.toggleEditorOptions();
            }}
            onBlur={() => setTimeout(this.props.closeEditorOptions, 200)}
          >
            <InlineSVG src={downArrowUrl} />
          </button>
          <ul className="editor__options" title="editor options">
            <li>
              <button onClick={this.tidyCode}>Tidy</button>
            </li>
            <li>
              <button onClick={this.props.showKeyboardShortcutModal}>Keyboard shortcuts</button>
            </li>
          </ul>
        </header>
        <div ref={(element) => { this.codemirrorContainer = element; }} className="editor-holder" tabIndex="0">
        </div>
        <EditorAccessibility
          lintMessages={this.props.lintMessages}
        />
      </section>
    );
  }
}

Editor.propTypes = {
  lintWarning: PropTypes.bool.isRequired,
  lintMessages: PropTypes.arrayOf(PropTypes.shape({
    severity: PropTypes.string.isRequired,
    line: PropTypes.number.isRequired,
    message: PropTypes.string.isRequired,
    id: PropTypes.number.isRequired
  })).isRequired,
  updateLintMessage: PropTypes.func.isRequired,
  clearLintMessage: PropTypes.func.isRequired,
  indentationAmount: PropTypes.number.isRequired,
  isTabIndent: PropTypes.bool.isRequired,
  updateFileContent: PropTypes.func.isRequired,
  fontSize: PropTypes.number.isRequired,
  file: PropTypes.shape({
    name: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired
  }).isRequired,
  editorOptionsVisible: PropTypes.bool.isRequired,
  showEditorOptions: PropTypes.func.isRequired,
  closeEditorOptions: PropTypes.func.isRequired,
  showKeyboardShortcutModal: PropTypes.func.isRequired,
  setUnsavedChanges: PropTypes.func.isRequired,
  startRefreshSketch: PropTypes.func.isRequired,
  autorefresh: PropTypes.bool.isRequired,
  isPlaying: PropTypes.bool.isRequired,
  theme: PropTypes.string.isRequired,
  unsavedChanges: PropTypes.bool.isRequired,
  projectSavedTime: PropTypes.string.isRequired,
  files: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired
  })).isRequired,
  isExpanded: PropTypes.bool.isRequired,
  collapseSidebar: PropTypes.func.isRequired,
  expandSidebar: PropTypes.func.isRequired,
  isUserOwner: PropTypes.bool,
  clearConsole: PropTypes.func.isRequired
};

Editor.defaultProps = {
  isUserOwner: false
};

export default Editor;
