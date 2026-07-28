import { access, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(root, '../..');
const sourceDirectory = path.join(root, 'src');
const checkOnly = process.argv.includes('--check');
const outputs = {
  web: path.join(repository, 'apps/web/src/shared/icons/NookIcons.tsx'),
  ios: path.join(repository, 'apps/mobile/targets/share-target/NookIcons.generated.swift'),
  android: path.join(
    repository,
    'apps/mobile/modules/share-target/android/src/main/java/com/nook/app/share/ui/NookIcons.generated.kt',
  ),
};

const pathTokenPattern = /([MLHVCQZ])|(-?(?:\d+\.?\d*|\.\d+))/gi;

function typeName(fileName) {
  const name = fileName.replace(/\.svg$/i, '');
  const value = name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join('');
  return /^\d/.test(value) ? `Icon${value}` : value;
}

function caseName(type) {
  return type[0].toLowerCase() + type.slice(1);
}

function attributes(source) {
  return Object.fromEntries(
    [...source.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]),
  );
}

function parsePath(data, file) {
  const tokens = [...data.matchAll(pathTokenPattern)].map((match) => match[1] ?? Number(match[2]));
  const commands = [];
  let index = 0;
  let command;
  let x = 0;
  let y = 0;

  const number = () => {
    const value = tokens[index++];
    if (typeof value !== 'number') throw new Error(`${file}: malformed path`);
    return value;
  };

  while (index < tokens.length) {
    if (typeof tokens[index] === 'string') command = tokens[index++].toUpperCase();
    if (!command) throw new Error(`${file}: path must start with a command`);

    if (command === 'M' || command === 'L') {
      x = number();
      y = number();
      commands.push({ command, values: [x, y] });
      if (command === 'M') command = 'L';
    } else if (command === 'H') {
      x = number();
      commands.push({ command: 'L', values: [x, y] });
    } else if (command === 'V') {
      y = number();
      commands.push({ command: 'L', values: [x, y] });
    } else if (command === 'C') {
      const values = [number(), number(), number(), number(), number(), number()];
      x = values[4];
      y = values[5];
      commands.push({ command, values });
    } else if (command === 'Q') {
      const values = [number(), number(), number(), number()];
      x = values[2];
      y = values[3];
      commands.push({ command, values });
    } else if (command === 'Z') {
      commands.push({ command, values: [] });
      command = undefined;
    } else {
      throw new Error(`${file}: unsupported path command ${command}`);
    }
  }
  return commands;
}

function parseColor(value, fallback = 'none') {
  const color = value ?? fallback;
  if (color === 'none') return null;
  if (color === 'white') return '#FFFFFF';
  if (color === 'black') return '#000000';
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toUpperCase();
  throw new Error(`Unsupported color: ${color}`);
}

function parseViewBox(value, file) {
  const values =
    value
      ?.trim()
      .split(/[\s,]+/)
      .map(Number) ?? [];
  if (values.length !== 4 || values.some((item) => !Number.isFinite(item))) {
    throw new Error(`${file}: viewBox must contain four numbers`);
  }
  const [minX, minY, width, height] = values;
  if (width <= 0 || height <= 0) throw new Error(`${file}: viewBox size must be positive`);
  return { minX, minY, width, height, source: values.join(' ') };
}

function parseDimension(value, fallback, file, attribute) {
  if (value === undefined) return fallback;
  const match = value.trim().match(/^(\d+(?:\.\d+)?|\.\d+)(?:px)?$/);
  if (!match || Number(match[1]) <= 0) {
    throw new Error(`${file}: ${attribute} must be a positive number or px value`);
  }
  return Number(match[1]);
}

async function loadIcons() {
  const files = (await readdir(sourceDirectory)).filter((file) => file.endsWith('.svg')).sort();
  return Promise.all(
    files.map(async (file) => {
      const svg = await readFile(path.join(sourceDirectory, file), 'utf8');
      const rootAttributes = attributes(svg.match(/<svg\b([^>]*)>/)?.[1] ?? '');
      const viewBox = parseViewBox(rootAttributes.viewBox, file);
      const defaultWidth = parseDimension(rootAttributes.width, viewBox.width, file, 'width');
      const defaultHeight = parseDimension(rootAttributes.height, viewBox.height, file, 'height');
      const elements = [...svg.matchAll(/<(path|circle)\b([^>]*)\/>/g)].map((match) => {
        const elementAttributes = attributes(match[2]);
        const common = {
          fill: parseColor(elementAttributes.fill, rootAttributes.fill),
          fillRule: elementAttributes['fill-rule'] ?? 'nonzero',
          stroke: parseColor(elementAttributes.stroke),
          strokeWidth: Number(elementAttributes['stroke-width'] ?? 1),
          lineCap: elementAttributes['stroke-linecap'] ?? 'butt',
        };
        if (match[1] === 'circle') {
          return {
            kind: 'circle',
            cx: Number(elementAttributes.cx),
            cy: Number(elementAttributes.cy),
            radius: Number(elementAttributes.r),
            ...common,
          };
        }
        if (!elementAttributes.d) throw new Error(`${file}: path is missing d`);
        return {
          kind: 'path',
          data: elementAttributes.d,
          commands: parsePath(elementAttributes.d, file),
          ...common,
        };
      });
      if (elements.length === 0) throw new Error(`${file}: no supported path or circle elements`);
      return {
        type: typeName(file),
        case: caseName(typeName(file)),
        viewBox,
        defaultWidth,
        defaultHeight,
        elements,
      };
    }),
  );
}

function webElement(element) {
  if (element.kind === 'circle') {
    if (!element.stroke) {
      return `      <circle cx="${element.cx}" cy="${element.cy}" r="${element.radius}" fill="${element.fill ?? 'none'}" />`;
    }
    return `      <circle
        cx="${element.cx}"
        cy="${element.cy}"
        r="${element.radius}"
        fill="${element.fill ?? 'none'}"
        stroke="${element.stroke}"
        strokeWidth="${element.strokeWidth}"
        strokeLinecap="${element.lineCap}"
      />`;
  }
  const style = [
    `        fill="${element.fill ?? 'none'}"`,
    element.fillRule === 'evenodd' && '        fillRule="evenodd"',
    element.stroke && `        stroke="${element.stroke}"`,
    element.stroke && `        strokeWidth="${element.strokeWidth}"`,
    element.stroke && `        strokeLinecap="${element.lineCap}"`,
  ].filter(Boolean);
  const compact = `      <path d="${element.data}" ${style.map((attribute) => attribute.trim()).join(' ')} />`;
  if (compact.length <= 100) return compact;
  return `      <path
        d="${element.data}"
${style.join('\n')}
      />`;
}

function generateWeb(icons) {
  const components = icons
    .map(
      (icon) => `export function ${icon.type}({ size, width, height, ...props }: NookIconProps) {
  const renderedWidth = width ?? size ?? ${icon.defaultWidth};
  const renderedHeight = height ?? (size === undefined ? ${icon.defaultHeight} : size * ${icon.defaultHeight / icon.defaultWidth});
  return (
    <svg
      viewBox="${icon.viewBox.source}"
      width={renderedWidth}
      height={renderedHeight}
      fill="none"
      role="presentation"
      aria-hidden="true"
      {...props}
    >
${icon.elements.map(webElement).join('\n')}
    </svg>
  );
}`,
    )
    .join('\n\n');
  return `// Generated by packages/icons/generate.mjs. Do not edit directly.
import type { SVGAttributes } from 'react';

export interface NookIconProps extends Omit<SVGAttributes<SVGSVGElement>, 'width' | 'height'> {
  size?: number;
  width?: number;
  height?: number;
}

${components}
`;
}

function swiftColor(color) {
  if (!color) return null;
  const red = Number.parseInt(color.slice(1, 3), 16) / 255;
  const green = Number.parseInt(color.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(color.slice(5, 7), 16) / 255;
  return `Color(red: ${red.toFixed(6)}, green: ${green.toFixed(6)}, blue: ${blue.toFixed(6)})`;
}

function offsetValues(values, minX, minY) {
  return values.map((value, index) => value - (index % 2 === 0 ? minX : minY));
}

function swiftPathCommand(command, viewBox) {
  const value = offsetValues(command.values, viewBox.minX, viewBox.minY);
  if (command.command === 'M') return `path.move(to: CGPoint(x: ${value[0]}, y: ${value[1]}))`;
  if (command.command === 'L') return `path.addLine(to: CGPoint(x: ${value[0]}, y: ${value[1]}))`;
  if (command.command === 'C') {
    return `path.addCurve(to: CGPoint(x: ${value[4]}, y: ${value[5]}), control1: CGPoint(x: ${value[0]}, y: ${value[1]}), control2: CGPoint(x: ${value[2]}, y: ${value[3]}))`;
  }
  if (command.command === 'Q') {
    return `path.addQuadCurve(to: CGPoint(x: ${value[2]}, y: ${value[3]}), control: CGPoint(x: ${value[0]}, y: ${value[1]}))`;
  }
  return 'path.closeSubpath()';
}

function swiftElement(element, index, viewBox) {
  const path =
    element.kind === 'circle'
      ? `let path${index} = Path(ellipseIn: CGRect(x: ${element.cx - viewBox.minX - element.radius}, y: ${element.cy - viewBox.minY - element.radius}, width: ${element.radius * 2}, height: ${element.radius * 2}))`
      : `var path${index} = Path()
${element.commands.map((command) => `            ${swiftPathCommand(command, viewBox).replaceAll('path.', `path${index}.`)}`).join('\n')}`;
  const drawing = [];
  if (element.fill) {
    const fillStyle = element.fillRule === 'evenodd' ? ', style: FillStyle(eoFill: true)' : '';
    drawing.push(
      `context.fill(path${index}, with: .color(${swiftColor(element.fill)})${fillStyle})`,
    );
  }
  if (element.stroke) {
    const cap =
      element.lineCap === 'square' ? 'square' : element.lineCap === 'round' ? 'round' : 'butt';
    drawing.push(
      `context.stroke(path${index}, with: .color(${swiftColor(element.stroke)}), style: StrokeStyle(lineWidth: ${element.strokeWidth}, lineCap: .${cap}))`,
    );
  }
  return `${path}
            ${drawing.join('\n            ')}`;
}

function generateIos(icons) {
  const cases = icons.map((icon) => `case ${icon.case}`).join('\n    ');
  const metrics = icons
    .map(
      (icon) => `case .${icon.case}:
            return (CGSize(width: ${icon.viewBox.width}, height: ${icon.viewBox.height}), CGSize(width: ${icon.defaultWidth}, height: ${icon.defaultHeight}))`,
    )
    .join('\n        ');
  const switches = icons
    .map(
      (icon) => `case .${icon.case}:
            ${icon.elements.map((element, index) => swiftElement(element, index, icon.viewBox)).join('\n            ')}`,
    )
    .join('\n        ');
  return `// Generated by packages/icons/generate.mjs. Do not edit directly.
import SwiftUI

enum NookIconName {
    ${cases}

    fileprivate var metrics: (viewBox: CGSize, defaultSize: CGSize) {
        switch self {
        ${metrics}
        }
    }
}

struct NookIcon: View {
    let name: NookIconName
    var size: CGFloat?

    var body: some View {
        let metrics = name.metrics
        let width = size ?? metrics.defaultSize.width
        let height = size.map { $0 * metrics.defaultSize.height / metrics.defaultSize.width } ?? metrics.defaultSize.height
        Canvas { context, canvasSize in
            context.scaleBy(x: canvasSize.width / metrics.viewBox.width, y: canvasSize.height / metrics.viewBox.height)
            switch name {
        ${switches}
            }
        }
        .frame(width: width, height: height)
    }
}
`;
}

function kotlinColor(color) {
  return `Color(0xFF${color.slice(1)})`;
}

function kotlinPathCommand(command, viewBox) {
  const value = offsetValues(command.values, viewBox.minX, viewBox.minY);
  if (command.command === 'M') return `moveTo(${value[0]}f, ${value[1]}f)`;
  if (command.command === 'L') return `lineTo(${value[0]}f, ${value[1]}f)`;
  if (command.command === 'C') return `cubicTo(${value.map((item) => `${item}f`).join(', ')})`;
  if (command.command === 'Q') return `quadraticTo(${value.map((item) => `${item}f`).join(', ')})`;
  return 'close()';
}

function kotlinElement(element, index, viewBox) {
  const path =
    element.kind === 'circle'
      ? null
      : `val path${index} = Path().apply {
${element.fillRule === 'evenodd' ? '                fillType = PathFillType.EvenOdd\n' : ''}
${element.commands.map((command) => `                ${kotlinPathCommand(command, viewBox)}`).join('\n')}
            }`;
  const target =
    element.kind === 'circle'
      ? `center = Offset(${element.cx - viewBox.minX}f, ${element.cy - viewBox.minY}f), radius = ${element.radius}f`
      : `path = path${index}`;
  const calls = [];
  if (element.fill) {
    calls.push(
      element.kind === 'circle'
        ? `drawCircle(color = ${kotlinColor(element.fill)}, ${target})`
        : `drawPath(${target}, color = ${kotlinColor(element.fill)})`,
    );
  }
  if (element.stroke) {
    const cap =
      element.lineCap === 'square' ? 'Square' : element.lineCap === 'round' ? 'Round' : 'Butt';
    const style = `Stroke(width = ${element.strokeWidth}f, cap = StrokeCap.${cap})`;
    calls.push(
      element.kind === 'circle'
        ? `drawCircle(color = ${kotlinColor(element.stroke)}, ${target}, style = ${style})`
        : `drawPath(${target}, color = ${kotlinColor(element.stroke)}, style = ${style})`,
    );
  }
  return [path, ...calls].filter(Boolean).join('\n            ');
}

function generateAndroid(icons) {
  const entries = icons.map((icon) => icon.type).join(',\n    ');
  const switches = icons
    .map(
      (icon) => `NookIconName.${icon.type} -> {
            ${icon.elements.map((element, index) => kotlinElement(element, index, icon.viewBox)).join('\n            ')}
        }`,
    )
    .join('\n        ');
  return `// Generated by packages/icons/generate.mjs. Do not edit directly.
package com.nook.app.share.ui

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke

enum class NookIconName {
    ${entries},
}

@Composable
fun NookIcon(name: NookIconName, modifier: Modifier = Modifier) {
    Canvas(modifier) {
        val viewBox = when (name) {
            ${icons.map((icon) => `NookIconName.${icon.type} -> ${icon.viewBox.width}f to ${icon.viewBox.height}f`).join('\n            ')}
        }
        drawContext.canvas.save()
        drawContext.canvas.scale(size.width / viewBox.first, size.height / viewBox.second)
        when (name) {
        ${switches}
        }
        drawContext.canvas.restore()
    }
}
`;
}

async function emit(file, content) {
  if (checkOnly) {
    let current = '';
    try {
      current = await readFile(file, 'utf8');
    } catch {}
    if (current !== content) {
      throw new Error(`${path.relative(repository, file)} is out of date; run pnpm icons:generate`);
    }
  } else {
    await writeFile(file, content);
  }
}

const icons = await loadIcons();
if (icons.length === 0) {
  for (const file of Object.values(outputs)) {
    if (checkOnly) {
      try {
        await access(file);
        throw new Error(`${path.relative(repository, file)} is stale; run pnpm icons:generate`);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    } else {
      try {
        await unlink(file);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
  }
  console.log(`${checkOnly ? 'Checked' : 'Generated'} an empty icon set.`);
} else {
  await Promise.all([
    emit(outputs.web, generateWeb(icons)),
    emit(outputs.ios, generateIos(icons)),
    emit(outputs.android, generateAndroid(icons)),
  ]);
  console.log(`${checkOnly ? 'Checked' : 'Generated'} ${icons.length} icons.`);
}
