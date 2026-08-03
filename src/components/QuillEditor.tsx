import React, { useEffect, useRef } from "react";
import ReactQuill, { Quill } from "react-quill-new";
import BlotFormatter from "quill-blot-formatter";
import "react-quill-new/dist/quill.snow.css";

// Only register once
const registered = Quill.imports["modules/blotFormatter"];
if (!registered) {
  Quill.register("modules/blotFormatter", BlotFormatter);
}

// Add SVG icons for table operations
const icons = ReactQuill.Quill.import("ui/icons");
icons["table"] = '<svg viewBox="0 0 18 18"><rect class="ql-stroke" height="12" width="12" x="3" y="3"></rect><rect class="ql-fill" height="2" width="12" x="3" y="8"></rect><rect class="ql-fill" height="12" width="2" x="8" y="3"></rect></svg>';
icons["insertRowBelow"] = '<svg viewBox="0 0 18 18"><path class="ql-stroke" d="M3,3 L15,3 L15,15 L3,15 L3,3 Z"></path><path class="ql-fill" d="M3,8 L15,8 L15,10 L3,10 L3,8 Z"></path><line class="ql-stroke" x1="9" x2="9" y1="12" y2="15"></line><line class="ql-stroke" x1="6" x2="9" y1="12" y2="15"></line><line class="ql-stroke" x1="12" x2="9" y1="12" y2="15"></line></svg>'; // approximate
icons["deleteRow"] = '<svg viewBox="0 0 18 18"><path class="ql-stroke" d="M3,3 L15,3 L15,15 L3,15 L3,3 Z"></path><line class="ql-stroke" x1="3" x2="15" y1="9" y2="9"></line><line class="ql-stroke" x1="6" x2="12" y1="6" y2="12"></line><line class="ql-stroke" x1="12" x2="6" y1="6" y2="12"></line></svg>';
icons["insertColRight"] = '<svg viewBox="0 0 18 18"><path class="ql-stroke" d="M3,3 L15,3 L15,15 L3,15 L3,3 Z"></path><path class="ql-fill" d="M8,3 L10,3 L10,15 L8,15 L8,3 Z"></path><line class="ql-stroke" x1="12" x2="15" y1="9" y2="9"></line><line class="ql-stroke" x1="12" x2="15" y1="6" y2="9"></line><line class="ql-stroke" x1="12" x2="15" y1="12" y2="9"></line></svg>';
icons["deleteCol"] = '<svg viewBox="0 0 18 18"><path class="ql-stroke" d="M3,3 L15,3 L15,15 L3,15 L3,3 Z"></path><line class="ql-stroke" x1="9" x2="9" y1="3" y2="15"></line><line class="ql-stroke" x1="6" x2="12" y1="6" y2="12"></line><line class="ql-stroke" x1="12" x2="6" y1="6" y2="12"></line></svg>';

const quillModules = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['table', 'insertRowBelow', 'deleteRow', 'insertColRight', 'deleteCol'],
      ['clean'],
    ],
    handlers: {
      table: function () {
        // @ts-ignore
        this.quill.getModule('table').insertTable(2, 2);
      },
      insertRowBelow: function () {
        // @ts-ignore
        this.quill.getModule('table').insertRowBelow();
      },
      deleteRow: function () {
        // @ts-ignore
        this.quill.getModule('table').deleteRow();
      },
      insertColRight: function () {
        // @ts-ignore
        this.quill.getModule('table').insertColumnRight();
      },
      deleteCol: function () {
        // @ts-ignore
        this.quill.getModule('table').deleteColumn();
      },
    }
  },
  table: true,
  blotFormatter: {}
};

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
}

export default function QuillEditor({ value, onChange, readOnly, placeholder, style }: QuillEditorProps) {
  return (
    <ReactQuill
      theme="snow"
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      modules={quillModules}
      placeholder={placeholder}
      style={style}
    />
  );
}
