// Simple HTML to Markdown converter (no dependencies needed)

function htmlToMarkdown(html) {
  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Remove unwanted elements
  const unwanted = temp.querySelectorAll('script, style, noscript, iframe');
  unwanted.forEach(el => el.remove());
  
  let markdown = '';
  
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        markdown += text + ' ';
      }
      return;
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    const tag = node.tagName.toLowerCase();
    
    switch (tag) {
      case 'h1':
        markdown += '\n\n# ' + node.textContent.trim() + '\n\n';
        break;
      case 'h2':
        markdown += '\n\n## ' + node.textContent.trim() + '\n\n';
        break;
      case 'h3':
        markdown += '\n\n### ' + node.textContent.trim() + '\n\n';
        break;
      case 'h4':
        markdown += '\n\n#### ' + node.textContent.trim() + '\n\n';
        break;
      case 'h5':
        markdown += '\n\n##### ' + node.textContent.trim() + '\n\n';
        break;
      case 'h6':
        markdown += '\n\n###### ' + node.textContent.trim() + '\n\n';
        break;
      case 'p':
        markdown += '\n\n';
        node.childNodes.forEach(processNode);
        markdown += '\n\n';
        break;
      case 'strong':
      case 'b':
        markdown += '**' + node.textContent.trim() + '**';
        break;
      case 'em':
      case 'i':
        markdown += '_' + node.textContent.trim() + '_';
        break;
      case 'a':
        markdown += '[' + node.textContent.trim() + '](' + (node.href || '#') + ')';
        break;
      case 'ul':
      case 'ol':
        markdown += '\n\n';
        Array.from(node.children).forEach((li, index) => {
          const prefix = tag === 'ul' ? '- ' : `${index + 1}. `;
          markdown += prefix + li.textContent.trim() + '\n';
        });
        markdown += '\n';
        break;
      case 'code':
        if (node.parentElement?.tagName !== 'PRE') {
          markdown += '`' + node.textContent.trim() + '`';
        }
        break;
      case 'pre':
        markdown += '\n\n```\n' + node.textContent.trim() + '\n```\n\n';
        break;
      case 'br':
        markdown += '\n';
        break;
      case 'hr':
        markdown += '\n\n---\n\n';
        break;
      default:
        node.childNodes.forEach(processNode);
    }
  }
  
  temp.childNodes.forEach(processNode);
  
  // Clean up excessive whitespace
  markdown = markdown
    .replace(/\n{3,}/g, '\n\n')
    .replace(/  +/g, ' ')
    .trim();
  
  return markdown;
}

