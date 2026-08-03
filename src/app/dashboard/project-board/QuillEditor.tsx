import React, { useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import 'quill-mention/dist/quill.mention.css';

if (typeof window !== 'undefined') {
  const { Mention, MentionBlot } = require('quill-mention');
  Quill.register({
    'blots/mention': MentionBlot,
    'modules/mention': Mention
  });
}
interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  onMentionClick?: (id: string, text: string) => void;
  apiTesterCollections?: any[];
}

export default function QuillEditor({ value, onChange, readOnly, placeholder, onMentionClick, apiTesterCollections }: QuillEditorProps) {
  const modules = useMemo(() => {
    return {
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
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
      mention: {
        allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
        mentionDenotationChars: ["@"],
        source: function (searchTerm: string, renderList: (arr: any[], searchTerm: string) => void, mentionChar: string) {
          let values: any[] = [];
          if (apiTesterCollections && apiTesterCollections.length > 0) {
            apiTesterCollections.forEach(folder => {
              if (folder.requests) {
                folder.requests.forEach((req: any) => {
                  values.push({
                    id: String(req.id),
                    value: req.name + ' (' + req.method + ')'
                  });
                });
              }
            });
          }

          if (searchTerm.length === 0) {
            renderList(values, searchTerm);
          } else {
            const matches = values.filter((item) =>
              item.value.toLowerCase().includes(searchTerm.toLowerCase())
            );
            renderList(matches, searchTerm);
          }
        },
        renderItem: function(item: any, searchTerm: string) {
          const div = document.createElement('div');
          div.style.display = 'flex';
          div.style.alignItems = 'center';
          div.style.gap = '8px';
          div.innerHTML = `
            <span class="material-symbols-outlined" style="font-size: 16px; color: #0ea5e9;">api</span>
            <span style="font-size: 13px;">${item.value}</span>
          `;
          return div;
        },
        onSelect: function(item: any, insertItem: (item: any) => void) {
          insertItem(item);
        }
      },
    };
  }, [apiTesterCollections]);

  // Handle clicking on mentions
  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const mentionNode = target.closest('.mention');
    if (mentionNode) {
      const id = mentionNode.getAttribute('data-id');
      const text = mentionNode.getAttribute('data-value');
      if (id && text && onMentionClick) {
        onMentionClick(id, text);
      }
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} onClick={handleClick}>
      <ReactQuill 
        theme="snow"
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        modules={modules}
        placeholder={placeholder}
        style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: 'none' }}
      />
    </div>
  );
}
