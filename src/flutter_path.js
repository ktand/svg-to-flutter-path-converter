class FlutterPath {
  constructor(operations, color, opacity, paintType, strokeWidth, closed) {
    this.operations = operations;
    this.color = color;
    this.opacity = opacity;
    this.paintType = paintType;
    this.strokeWidth = strokeWidth;
    this.closed = closed;
  }
}

const PaintType = {
  Fill: 'Fill',
  Stroke: 'Stroke',
}

class PathOperation {
  createSizeDependentToken(sizeProperty, number) {
    // const number = helpers.roundNumber(number);

    if (number == 0) {
      return '0';
    }

    if (number == 1) {
      return `size.${sizeProperty}`;
    }

    return `size.${sizeProperty} * ${number}`;
  }
}

class MoveToOperation extends PathOperation {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
  }

  toFlutterCommand(round = 10) {
    const x = this.createSizeDependentToken('width', this.x);
    const y = this.createSizeDependentToken('height', this.y);

    return `path.moveTo(${x}, ${y});`;
  }
}

class LineToOperation extends PathOperation {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
  }

  toFlutterCommand(round = 10) {
    const x = this.createSizeDependentToken('width', this.x);
    const y = this.createSizeDependentToken('height', this.y);

    return `path.lineTo(${x}, ${y});`;
  }
}

class CubicToOperation extends PathOperation {
  constructor(x1, y1, x2, y2, x3, y3) {
    super();
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.x3 = x3;
    this.y3 = y3;
  }

  toFlutterCommand(round = 10) {
    const x1 = this.createSizeDependentToken('width', this.x1);
    const y1 = this.createSizeDependentToken('height', this.y1);
    const x2 = this.createSizeDependentToken('width', this.x2);
    const y2 = this.createSizeDependentToken('height', this.y2);
    const x3 = this.createSizeDependentToken('width', this.x3);
    const y3 = this.createSizeDependentToken('height', this.y3);

    return `path.cubicTo(${x1}, ${y1}, ${x2}, ${y2}, ${x3}, ${y3});`;
  }
}

class AddOvalOperation extends PathOperation {
  constructor(x, y, radius) {
    super();
    this.x = x;
    this.y = y;
    this.radius = radius;
  }

  toFlutterCommand(round = 10) {
    const x = this.createSizeDependentToken('width', this.x);
    const y = this.createSizeDependentToken('height', this.y);
    const radius = this.createSizeDependentToken('width', this.radius);

    return `path.addOval(Rect.fromCircle(center: Offset(${x}, ${y}), radius: ${radius}));`;
  }
}

class FlutterPathPrinter {
  constructor(path) {
    this.path = path;
  }

  print() {
    return "TEST!";
  }
}

class FlutterCustomPaintPrinter {
  print(paths, config) {
    let definition = [`class ${config?.name ?? 'MyPainter'} extends CustomPainter {`];

    if (config?.pathTracing) {
      definition = definition.concat([
        '',
        '\tfinal double progress;',
        '',
        '\tMyPainter({this.progress = 1.0});'
      ]);
    }

    const linesBefore = [
      '\t@override',
      '\tvoid paint(Canvas canvas, Size size) {',
      '\t\tPath path = Path();',
      '\t\tfinal Paint paint = Paint();'
    ];

    const linesAfter = [
      '\t}',
      '',
      '\t@override',
      '\tbool shouldRepaint(CustomPainter oldDelegate) {',
      '\t\treturn true;',
      '\t}',
      '}'
    ];

    let linesPaths = [];

    paths.forEach((path, index) => {
      linesPaths.push('');
      linesPaths.push(`\t\t// Path ${index + 1} ${path.paintType}`);

      if (index > 0) {
        linesPaths.push('\t\tpath = Path();');
      }


      let color = path.color;

      if (color == null) {
        color = '000000';
      }

      const opacityString = path.opacity ? `.withOpacity(${path.opacity})` : '';
      const colorCommand = "paint.color = const Color(0xff" + color + ")" + opacityString + ";"
      const colorCommandString = `\t\t${colorCommand}`;

      linesPaths.push(colorCommandString);
      if (path.paintType == PaintType.Stroke) {
        linesPaths.push('\t\tpaint.style = PaintingStyle.stroke;');
        linesPaths.push('\t\tpaint.strokeWidth = ' + (path.strokeWidth ? path.strokeWidth : '1') + ';');
      }

      path.operations.forEach((operation) => {
        linesPaths.push(`\t\t${operation.toFlutterCommand()}`);
      });

      if (path.paintType == PaintType.Stroke && path.closed) {
        linesPaths.push('\t\tpath.close();');
      }

      console.log("Config : " + JSON.stringify(config));
      if (config?.pathTracingAll) {
        linesPaths.push('\t\tPathMetrics pathMetrics = path.computeMetrics();');
        linesPaths.push('\t\tfor (PathMetric pathMetric in pathMetrics) {');
        linesPaths.push('\t\t\tPath extractPath = pathMetric.extractPath(');
        linesPaths.push('\t\t\t\t0.0,');
        linesPaths.push('\t\t\t\tpathMetric.length * progress,');
        linesPaths.push('\t\t\t);');

        linesPaths.push('\t\t\tcanvas.drawPath(extractPath, paint);');
        linesPaths.push('\t\t}');
      } else if (config?.pathTracing) {
        linesPaths.push('');
        linesPaths.push('\t\tList<PathMetric> pathMetrics = path.computeMetrics().toList();');
        linesPaths.push('');
        
        linesPaths.push('\t\tfinal numberOfOperations = pathMetrics.length;');
        linesPaths.push('\t\tfinal singleOperationTime = 1.0 / numberOfOperations;');
        linesPaths.push('\t\tfinal index = (progress / singleOperationTime).floor();');
        linesPaths.push('');

        linesPaths.push('\t\tif(index > 0) {');
        linesPaths.push('\t\t\tList<PathMetric> completePaths = pathMetrics.sublist(0, index);');
        linesPaths.push('\t\t\tfor (final path in completePaths) {');
        linesPaths.push('\t\t\t\tPath extractPath = path.extractPath(');
        linesPaths.push('\t\t\t\t\t0.0,');
        linesPaths.push('\t\t\t\t\tpath.length,');
        linesPaths.push('\t\t\t\t);');
        linesPaths.push('\t\t\t\tcanvas.drawPath(extractPath, paint);');
        linesPaths.push('\t\t\t}');
        linesPaths.push('\t\t}');
        
        linesPaths.push('');      

        linesPaths.push('\t\tif(index >= numberOfOperations) {');
        linesPaths.push('\t\t\treturn;');
        linesPaths.push('\t\t}');

        linesPaths.push('');

        linesPaths.push('\t\tfinal actualMetric = pathMetrics.elementAt(index);');
        linesPaths.push('\t\tfinal localProgress = (progress - (singleOperationTime * index)) / singleOperationTime;');
        linesPaths.push('\t\tPath extractPath = actualMetric.extractPath(');
        linesPaths.push('\t\t\t0.0,');
        linesPaths.push('\t\t\tactualMetric.length * localProgress,');
        linesPaths.push('\t\t);');
        linesPaths.push('\t\tcanvas.drawPath(extractPath, paint);');
      } else {
        linesPaths.push('\t\tcanvas.drawPath(path, paint);');
      }
    });

    return definition
      .concat(linesBefore)
      .concat(linesPaths)
      .concat(linesAfter).join('\n');
  }
}

module.exports = {
  FlutterCustomPaintPrinter,
  FlutterPath,
  MoveToOperation,
  LineToOperation,
  CubicToOperation,
  AddOvalOperation,
  PaintType,
};
