const commandPattern = /^(?:\$\s*)?(?:sudo\b|ssh(?:-keygen|-copy-id)?\b|scp\b|sftp\b|rsync\b|git\b|ip\s|ifconfig\b|ping\b|traceroute\b|mtr\b|dig\b|nslookup\b|systemctl\b|journalctl\b|dmesg\b|chmod\b|chown\b|chgrp\b|setfacl\b|getfacl\b|find\b|grep\b|cat\b|less\b|more\b|head\b|tail\b|ls\b|cd\b|mkdir\b|touch\b|rm\b|cp\b|mv\b|tar\b|gzip\b|gunzip\b|zip\b|unzip\b|upower\b|lsblk\b|blkid\b|df\b|du\b|free\b|nproc\b|lscpu\b|lsusb\b|mount\b|umount\b|hostname(?:ctl)?\b|whoami\b|uptime\b|timedatectl\b|resolvectl\b|arp\b|curl\b|wget\b|crontab\b|passwd\b|adduser\b|deluser\b|visudo\b|klist\b|getent\b|ps\b|ufw\b|apt\b|npm\b|node\b|python\b|pip\b|docker\b|nc\b|telnet\b|openssl\b|keytool\b|java\b|date\b|id\b|groups\b|tree\b|nl\b|wc\b|nano\b|vim\b|vi\b|emacs\b|which\b|whereis\b|man\b|echo\b|printf\b|env\b|export\b|source\b|bash\b|sh\b|zsh\b|awk\b|sed\b|sort\b|uniq\b|cut\b|xargs\b|tee\b|stat\b|file\b|realpath\b|readlink\b|route\b|netstat\b|ss\b|hostnamectl\b|\.\/|\/etc\/|\/home\/|[A-Z_]+=|Host\s)/i;
// Accept the informal list prefixes used throughout the source modules. The
// reader presents these as one consistent UI marker instead of echoing them.
const bulletPattern = /^\s*(?:(?:[•●▪◦*]|=>|->|>|[-–—](?=\s)|\d+[.)])\s*)+/;
const dividerPattern = /^\s*(?:={8,}|-{8,}|_{8,}|\*{8,})\s*$/;
const bannerPattern = /^\s*={8,}\s*(.*?)\s*={8,}\s*$/;
const tablePattern = /\t|\s{3,}\S/;

function nextVisibleLine(lines, start) {
  for (let index = start; index < lines.length; index += 1) {
    if (lines[index].trim()) return lines[index].trim();
  }
  return '';
}

function isHeadingLine(line, nextLine) {
  const value = line.trim();
  if (!value || value.length > 90 || commandPattern.test(value) || bulletPattern.test(value)) return false;
  if (/^(?:https?:\/\/|www\.|[\w./~$-]+\s+[-=]\s+)/i.test(value)) return false;
  if (/[.!?]$/.test(value) && !/\?$/.test(value)) return false;
  const words = value.split(/\s+/).length;
  const titleLike = /^[A-Z0-9][\w()&/.,:+ -]*$/.test(value) && words <= 12;
  const allCaps = value.length > 1 && value === value.toUpperCase() && /[A-Z]/.test(value);
  const leadsIntoContent = /^(?:=>|[-•●▪◦]|\d+[.)]|[A-Z].{24,})/.test(nextLine);
  const leadsIntoDescription = /^[a-z]/.test(nextLine);
  return allCaps || titleLike && (leadsIntoContent || leadsIntoDescription);
}

function isCommandLine(line) {
  const value = line.trim();
  if (!value || value.length > 180) return false;
  if (commandPattern.test(value)) return true;
  if (/[.!?]$/.test(value)) return false;
  return /^\s{2,}(?:--?[\w-]+|\[[\w -]+\]|\{[\w .,/-]+\}|[A-Z_]+\s*=|[a-zA-Z0-9_.-]+\s*:\s*\/\/)/.test(line);
}

function isTableRow(line) {
  return tablePattern.test(line) && line.trim().split(/\s{2,}|\t+/).filter(Boolean).length >= 3;
}

export function parseSourceText(source) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];
  let commands = [];
  let table = [];
  let id = 0;

  const add = (type, value, metadata = {}) => blocks.push({ id: `source-block-${id++}`, type, value, ...metadata });
  const flushParagraph = () => {
    if (paragraph.length) add('paragraph', paragraph.join('\n'));
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) add('list', list);
    list = [];
  };
  const flushCommands = () => {
    if (commands.length) add('commands', commands.join('\n'));
    commands = [];
  };
  const flushTable = () => {
    if (table.length) add('table', table);
    table = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushCommands();
    flushTable();
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushAll();
      return;
    }
    const markdownHeading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (markdownHeading) {
      flushAll();
      add('heading', markdownHeading[2].trim(), { level: markdownHeading[1].length > 1 ? 2 : 1 });
      return;
    }
    const banner = line.match(bannerPattern);
    if (banner?.[1].trim()) {
      flushAll();
      add('heading', banner[1].trim(), { level: 1 });
      return;
    }
    if (dividerPattern.test(line)) {
      flushAll();
      const previous = blocks.at(-1);
      if (previous?.type === 'paragraph' && previous.value.length <= 100 && !/[.!?]$/.test(previous.value)) {
        previous.type = 'heading';
      } else {
        add('divider', '');
      }
      return;
    }

    const nextLine = nextVisibleLine(lines, index + 1);
    if (isHeadingLine(line, nextLine)) {
      flushAll();
      add('heading', trimmed, { level: 1 });
      return;
    }
    if (bulletPattern.test(line)) {
      flushParagraph();
      flushTable();
      const match = line.match(bulletPattern);
      const text = line.slice(match[0].length).trim();
      if (isCommandLine(text)) {
        flushList();
        commands.push(text);
      } else {
        flushCommands();
        list.push({ marker: match[0].trim(), text, depth: line.search(/\S/) > 0 ? 1 : 0 });
      }
      return;
    }
    if (isTableRow(line) && !isCommandLine(line)) {
      flushAll();
      table.push(line.trim().split(/\t+|\s{3,}/).filter(Boolean));
      return;
    }
    if (isCommandLine(line)) {
      flushParagraph();
      flushList();
      flushTable();
      commands.push(line.trim());
      return;
    }

    flushList();
    flushCommands();
    flushTable();
    paragraph.push(trimmed);
  });
  flushAll();
  return blocks;
}

export function createSourceOutline(blocks) {
  return blocks
    .filter((block) => block.type === 'heading')
    .map((block, index) => ({ id: block.id, title: block.value, index: index + 1 }));
}
