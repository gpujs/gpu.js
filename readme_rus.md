[![Logo](http://gpu.rocks/img/ogimage.png)](http://gpu.rocks/)


# GPU.js
GPU.js это библиотека ускорения JavaScript для GPGPU (Вычисления общего назначения на графических процессорах) написанная на JavaScript. GPU.js автоматически скомпилирует простые JavaScript функции в язык шейдеров и запустит их на GPU. При недоступности GPU функции продолжат исполняться в обычном JavaScript.

[![Присоединяйтесь к чату по адресу https://gitter.im/gpujs/gpu.js](https://badges.gitter.im/gpujs/gpu.js.svg)](https://gitter.im/gpujs/gpu.js?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Slack](https://slack.bri.im/badge.svg)](https://slack.bri.im)

# Что за шаманство?

Перемножение матриц в GPU.js:

```js
const gpu = new GPU();

// Create the GPU accelerated function from a kernel
// function that computes a single element in the
// 512 x 512 matrix (2D array). The kernel function
// is run in a parallel manner in the GPU resulting
// in very fast computations! (...sometimes)
const matMult = gpu.createKernel(function(a, b) {
    var sum = 0;
    for (var i = 0; i < 512; i++) {
        sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
}).setOutput([512, 512]);

// Perform matrix multiplication on 2 matrices of size 512 x 512
const c = matMult(a, b);
```

Вы можете запустить тест  [здесь](http://gpu.rocks). Обычно это работает в 1-15 раз быстрее в зависимости от железа.

Или вы можете поэкспериментировать с этим [здесь](http://gpu.rocks/playground)

# Содержание

ПРИМЕЧАНИЕ: документация слегка устарела относительно предстоящего релиза v2.  Мы это исправим!  В целом, если хотите посодействовать (ПОЖАЛУЙСТА) дайте нам знать.

* [Установка](#installation)
* [`GPU` Настройки](#gpu-settings)
* [`gpu.createKernel` Настройки](#gpu-createkernel-settings)
* [Создание и запуск функций](#creating-and-running-functions)
* [Захват ввода](#accepting-input)
* [Графический вывод Graphical Output](#graphical-output)
* [Комбинирование ядер (Combining Kernels)](#combining-kernels)
* [Создание карты ядра (Kernel Map)](#create-kernel-map)
* [Добавление заказных функций](#adding-custom-functions)
* [Добавление заказных функций прямо в ядро](#adding-custom-functions-directly-to-kernel)
* [Циклы](#loops)
* [Конвейеризация](#pipelining)
* [Внеэкранный холст](#offscreen-canvas)
* [Очистка](#cleanup)
* [Поддержка плоских массивов (Flattened typed array)](#flattened-typed-array-support)
* [Поддерживаемые математические функции](#supported-math-functions)
* [Полная справка по API](#full-api-reference)
* [Автоcборная документация](#automatically-built-documentation)
* [Конрибьюторы](#contributors)
* [Содействие](#contributing)
* [Термины](#terms-explained)
* [License](#license)

## Установка

### npm

```bash
npm install gpu.js --save
```

### yarn

```bash
yarn add gpu.js
```

[npm package](https://www.npmjs.com/package/gpu.js)

### Браузер

Скачайте посследнюю версию GPU.js и включите файлы в вашу HTML страницу, используяследующие тэги:

```html
<script src="/path/to/js/gpu-browser.min.js"></script>
```

В JavaScript инициируйте библиотеку:

```js
const gpu = new GPU();
```

## `GPU` Настройки
Настройки это объект, используемый для создания экземпляра `GPU`.  Пример: `new GPU(settings)`
* `canvas`: `HTMLCanvasElement`.  Опционально. Для расшаривания холста.  Пример: использование THREE.js и GPU.js на одном холсте.
* `webGl`: `WebGL2RenderingContext` или `WebGLRenderingContext`.  Для расшаривания контекста рендеринга.  Пример: использование THREE.js и GPU.js в едином контексте.

## `gpu.createKernel` Настройки
Настройки это объект, используемый для создания `kernel` или `kernelMap`.  Example: `gpu.createKernel(settings)`
* `output`: массив или объект, описывающий вывод ядра.
  * как массив : `[width]`, `[width, height]`, или `[width, height, depth]`
  * как объект: `{ x: width, y: height, z: depth }`
* pipeline: boolean
* graphical: boolean
* loopMaxIterations: number
* constants: object
* wraparound: boolean
* hardcodeConstants: boolean
* floatTextures: boolean - входная/рабочая использует float32 на каждый цветовой канал
* floatOutput: boolean - выходная текстура использует float32 на каждый цветовой канал
* fixIntegerDivisionAccuracy: boolean - некоторые видеокарты имеют ошибки точности при делении на степени тройки и некоторые другие (most apple kit?). По умолчанию включено для заданных видеокарт, отключена если точность не требуется.
* functions: массив или объект
* nativeFunctions: объект
* subKernels: массив
* immutable: булево
  * по умолчанию `false`



## Создание и запуск функций
В зависимости от типа вывода, определите ожидаемый размер вашего вывода (выходных данных). Вы не можете получить ускоренную функцию без определенного размера вывода.

Размерность         	 |	Как задается размерность | Как сослаться из ядра (kernel) 
-----------------------|-------------------------------|--------------------------------
1D			               |	`[length]`                   |	`myVar[this.thread.x]`
2D		            	   |	`[width, height]`            |	`myVar[this.thread.y][this.thread.x]`
3D		            	   |	`[width, height, depth]`     |	`myVar[this.thread.z][this.thread.y][this.thread.x]`

```js
const opt = {
    output: [100]
};
```

или

```js
// You can also use x, y, and z
const opt = {
    output: { x: 100 }
};
```

Создайте функцию,которую хотите запускать на GPU. Для `createKernel` первый входной параметр это функция ядра (kernel-функция) которая будет рассчитывать одно число в выводе (массиве выходных данных). Идентификаторы потока (это `this.thread.x`, `this.thread.y` или `this.thread.z`) позволят вам задать правильное поведение  kernel-функции для отдельной позиции вывода.

```js
const myFunc = gpu.createKernel(function() {
    return this.thread.x;
}, opt);
```

Созданная функция это обычная JS функция и вы можете использовать ее примерно так.

```js
myFunc();
// Result: [0, 1, 2, 3, ... 99]
```

Примечание: Вместо создания объекта можно использовать цепной синтаксис задания параметров. Так красивее.

```js
const myFunc = gpu.createKernel(function() {
    return this.thread.x;
}).setOutput([100]);

myFunc();
// Result: [0, 1, 2, 3, ... 99]
```

### Объявление переменных

GPU.js облегчает объявление переменных внутри kernel-функций.  Поддерживаются следующие типы:
Numbers
Array(2)
Array(3)
Array(4)

Пример Numbers :
```js
 const myFunc = gpu.createKernel(function() {
     const i = 1;
     const j = 0.89;
     return i + j;
 }).setOutput([100]);
```

Пример Array(2) :
С объявлением

```js
 const myFunc = gpu.createKernel(function() {
     const array2 = [0.08, 2];
     return array2;
 }).setOutput([100]);
```

Прямой возврат
```js
 const myFunc = gpu.createKernel(function() {
     return [0.08, 2];
 }).setOutput([100]);
```

Пример Array(3):
С объявлением

```js
 const myFunc = gpu.createKernel(function() {
     const array2 = [0.08, 2, 0.1];
     return array2;
 }).setOutput([100]);
```

Прямой возврат
```js
 const myFunc = gpu.createKernel(function() {
     return [0.08, 2, 0.1];
 }).setOutput([100]);
```

Пример Array(4) :
С объявлением

```js
 const myFunc = gpu.createKernel(function() {
     const array2 = [0.08, 2, 0.1, 3];
     return array2;
 }).setOutput([100]);
```

Прямой возврат 
```js
 const myFunc = gpu.createKernel(function() {
     return [0.08, 2, 0.1, 3];
 }).setOutput([100]);
```

## Ввод данных
### Поддерживаемые типы входных данных
* Numbers
* 1d Array
* 2d Array
* 3d Array
* HTML изображение
* Массив HTML изображений
Чтобы задать аргумент, просто добавьте его в kernel-функцию как в обычном JS.

### Пример ввода
```js
const myFunc = gpu.createKernel(function(x) {
    return x;
}).setOutput([100]);

myFunc(42);
// Result: [42, 42, 42, 42, ... 42]
```

Аналогично с вводом массивов:

```js
const myFunc = gpu.createKernel(function(x) {
    return x[this.thread.x % 3];
}).setOutput([100]);

myFunc([1, 2, 3]);
// Result: [1, 2, 3, 1, ... 1 ]
```

HTML Image:

```js
const myFunc = gpu.createKernel(function(image) {
    const pixel = image[this.thread.y][this.thread.x];
    this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
})
  .setGraphical(true)
  .setOutput([100]);

const image = new document.createElement('img');
image.src = 'my/image/source.png';
image.onload = () => {
  myFunc(image);
  // Result: colorful image
};
```

массив HTML изображений:

```js
const myFunc = gpu.createKernel(function(image) {
    const pixel = image[this.thread.z][this.thread.y][this.thread.x];
    this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
})
  .setGraphical(true)
  .setOutput([100]);

const image1 = new document.createElement('img');
image1.src = 'my/image/source1.png';
image1.onload = onload;
const image2 = new document.createElement('img');
image2.src = 'my/image/source2.png';
image2.onload = onload;
const image3 = new document.createElement('img');
image3.src = 'my/image/source3.png';
image3.onload = onload;
const totalImages = 3;
let loadedImages = 0;
function onload() {
  loadedImages++;
  if (loadedImages === totalImages) {
    myFunc([image1, image2, image3]);
    // Result: colorful image composed of many images
  }
};
```

## Графический вывод

Возможно вам понадобится создать `canvas` картинку вместо выполнения численных расчетов. Для этого установите флаг `graphical` в `true` и задайте размерность вывода через `[width, height]`.  Идентификаторы потока теперь будут определяться координатами пикселя `x` и `y`. Внутри kernel-функции испоьзуйте `this.color(r,g,b)` или `this.color(r,g,b,a)` чтобы задать цвет. Из соображений производительности возвращаемые значения вашей функции будут далее бесполезны. Взамен, для формирования изображения, получите DOM-ноду `canvas` и вставьте ее в страницу.

```js
const render = gpu.createKernel(function() {
    this.color(0, 0, 0, 1);
})
  .setOutput([20, 20])
  .setGraphical(true);

render();

const canvas = render.canvas;
document.getElementsByTagName('body')[0].appendChild(canvas);
```

Примечание: Для анимации рендеринга используйте `requestAnimationFrame` вместо `setTimeout` для оптимальной производительности. больше информации смотри [здесь](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame).


### Alpha -канал

На настоящий момент если нужен alpha-канал - включите `premultipliedAlpha` на вашем gl контексте:
```js
const canvas = DOM.canvas(500, 500);
const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });

const gpu = new GPU({
  canvas,
  context: gl
});
const krender = gpu.createKernel(function(x) {
  this.color(this.thread.x / 500, this.thread.y / 500, x[0], x[1]);
})
  .setOutput([500, 500])
  .setGraphical(true);
```

## Комбинирование ядер (Combining kernels)

Иногда вам может понадобиться выполнять матю операции на gpu без потерь на циклы передач данных между cpu и gpu. чтобы этого избежать есть метод `combineKernels`.

_**Примечание:**_ ядра могут иметь разный размер вывода.

```js
const add = gpu.createKernel(function(a, b) {
	return a + b;
}).setOutput([20]);

const multiply = gpu.createKernel(function(a, b) {
	return a * b;
}).setOutput([20]);

const superKernel = gpu.combineKernels(add, multiply, function(a, b, c) {
	return multiply(add(a[this.thread.x], b[this.thread.x]), c[this.thread.x]);
});

superKernel(a, b, c);
```
Это дает вам гибкость использовать множество преобразований без трафов производительности получая НАМНОГО больую производительность.

## Создание карты ядер (Kernel Map)

Возможно вы захотите выполнять множество операций в одном ядре и сохранить результат каждой из них. Например **Machine Learning** где предыдущий вывод используется для  обратного распространения (обратное распространение ошибки - метод обучения нейросетей. Прим. перев.). Для этого есть метод `createKernelMap`.

### вывод объектов
```js
const megaKernel = gpu.createKernelMap({
  addResult: function add(a, b) {
    return a + b;
  },
  multiplyResult: function multiply(a, b) {
    return a * b;
  },
}, function(a, b, c) {
	return multiply(add(a[this.thread.x], b[this.thread.x]), c[this.thread.x]);
});

megaKernel(a, b, c);
// Result: { addResult: [], multiplyResult: [], result: [] }
```
### вывод массивов
```js
const megaKernel = gpu.createKernelMap([
  function add(a, b) {
    return a + b;
  },
  function multiply(a, b) {
    return a * b;
  }
], function(a, b, c) {
	return multiply(add(a[this.thread.x], b[this.thread.x]), c[this.thread.x]);
});

megaKernel(a, b, c);
// Result: [ [], [] ].result []
```
Это дает гибкость при использовании составных частей в одном преобразовании без штрафов производительности, получая значительное ускорение.

## Добавление заказных функций
Используйте `gpu.addFunction(function() {}, settings)`  для добавления заказных функций.

Пример:


```js
gpu.addFunction(function mySuperFunction(a, b) {
	return a - b;
});
function anotherFunction(value) {
	return value + 1;
}
gpu.addFunction(anotherFunction);
const kernel = gpu.createKernel(function(a, b) {
	return anotherFunction(mySuperFunction(a[this.thread.x], b[this.thread.x]));
}).setOutput([20]);
```

### Добавление сильно типизированных функций

(ориг. _strong typed functions_. Имеется в виду либо строгая либо статическая типизация. Подробнее см  [вики](https://ru.wikipedia.org/wiki/%D0%A1%D0%B8%D0%BB%D1%8C%D0%BD%D0%B0%D1%8F_%D0%B8_%D1%81%D0%BB%D0%B0%D0%B1%D0%B0%D1%8F_%D1%82%D0%B8%D0%BF%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F). Для более корректной оценки см примеры кода. Прим перев.)

Для сильной типизации вы можете использовать объект `settings`. Он принимает опционально следующие значения:
`returnType`: оционально, по умолчанию float, значение, которое вы хотите вернуть из функции
`argumentTypes`: оционально, по умолчанию float, для каждого параметра, a hash of param names with values of the return types

Типы: могут быть использованы для `returnType` или для каждого свойства из `argumentTypes`:
* 'Array'
* 'Array(2)'
* 'Array(3)'
* 'Array(4)'
* 'HTMLImage'
* 'HTMLImageArray'
* 'Number'
* 'NumberTexture'
* 'ArrayTexture(4)'

Пример:
```js
gpu.addFunction(function mySuperFunction(a, b) {
	return [a - b[1], b[0] - a];
}, { argumentTypes: { a: 'Number', b: 'Array(2)'}, returnType: 'Array(2)' });
```


## Прямое добавление заказных функций в ядро
```js
function mySuperFunction(a, b) {
	return a - b;
}
const kernel = gpu.createKernel(function(a, b) {
	return mySuperFunction(a[this.thread.x], b[this.thread.x]);
})
  .setOutput([20])
  .setFunctions([mySuperFunction]);

```

## Циклы
* Все циклы, определяемые внутри ядра дожны иметь счетчик итераций, ограниченный опцией  loopMaxIterations.
* В отличие от ограничения итерирования константой или фиксированным значением как показано в [Dynamic sized via constants](dynamic-sized-via-constants), вы также можете передать количество итераций в ядро как переменную (сомнительный перевод)

### Динамически ограничение константой 
```js
const matMult = gpu.createKernel(function(a, b) {
    var sum = 0;
    for (var i = 0; i < this.constants.size; i++) {
        sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
}, {
  constants: { size: 512 },
  output: [512, 512],
});
```

### Фиксированное ограничение
```js
const matMult = gpu.createKernel(function(a, b) {
    var sum = 0;
    for (var i = 0; i < 512; i++) {
        sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
}).setOutput([512, 512]);
```

## Конвейеризация
[Конвейер](https://en.wikipedia.org/wiki/Pipeline_(computing)) это особенность при использовании которой данные передаются напрямую между ядрами посредством текстур.
Это приводит к предельно быстрым вычислениям. Это достигается использованием опции ядра `pipeline: boolean` или вызовом `kernel.pipeline(true)`.

## Внеэкранный холст (Offscreen Canvas) 
GPU.js поддерживает внеэкранный холст где это возможно. Вот пример использования в двух файлах, `gpu-worker.js`, и `index.js`:

файл: `gpu-worker.js`
```js
importScripts('path/to/gpu.js');
onmessage = function() {
  // define gpu instance
  const gpu = new GPU();

  // input values
  const a = [1,2,3];
  const b = [3,2,1];

  // setup kernel
  const kernel = gpu.createKernel(function(a, b) {
    return a[this.thread.x] - b[this.thread.x];
  })
    .setOutput([3]);

  // output some results!
  postMessage(kernel(a, b));
};
```

файл: `index.js`
```js
var worker = new Worker('gpu-worker.js');
worker.onmessage = function(e) {
  var result = e.data;
  console.log(result);
};
```

## Очистка
* для экземпляров  `GPU` используйте метод `destroy` . Пример: `gpu.destroy()`
* для экземпляров  `Kernel` используйте метод `destroy` . Пример: `kernel.destroy()`

## Поддержка развернутых массивов
Для использования  `x`, `y`, `z` `thread` смотри api внутри GPU.js, и еще использую развернутые массивы, есть специальный тип `Input` .
В общем случае это намного быстрее при передаче данных в gpu, особенно для больших датасетов.

Пример использования:

```js
import GPU, { input } from 'gpu.js';
const gpu = new GPU();
const kernel = gpu.createKernel(function(a, b) {
  return a[this.thread.y][this.thread.x] + b[this.thread.y][this.thread.x];
}).setOutput([3,3]);


kernel(input(new Float32Array([1,2,3,4,5,6,7,8,9]), [3, 3]), input(new Float32Array([1,2,3,4,5,6,7,8,9]), [3, 3]));
```

Примечание: `GPU.input(value, size)` это простой указатель на `new GPU.Input(value, size)`

## Поддерживаемые мат. функции

Поскольку код, запускаемый в ядре в действительности скомпилирован в GLSL ,не все функции модуля JavaScript Math поддерживаются.

Вот список поддерживаемых:

```
abs
acos
asin
atan
atan2
ceil
cos
exp
floor
log
log2
max
min
round
sign
sin
sqrt
tan
```


## Полная справка по API

вы можете найти  [полную справку по API здесь](https://doxdox.org/gpujs/gpu.js/1.2.0).

## Автосборная документация

Документация кодовой базы [собирается автоматически](https://github.com/gpujs/gpu.js/wiki/Automatic-Documentation).

## Контрибьюторы

* Fazli Sapuan
* Eugene Cheah
* Matthew Saw
* Robert Plummer
* Abhishek Soni
* Juan Cazala
* Daniel X Moore
* Mark Theng
* Varun Patro

## Содействие

Помощьники приветствуются! создайте merge request на ветку `develop` и мы с радостью посмотрим его. Если хотите доступ на запись в репозиторий отправляйте email, мы посмотрим и возможно дадим доступ к ветке `develop` .

Мы обещаем никогда не присваивать авторство кода.

## Пояснения терминов
* Ядро (Kernel) - Функция, сильно связанная с программой, испольняемой на графическом процессоре
* Текстура- Графический артефакт, содержащий данные. В случае GPU.js это побитно сдвинутые части 32-битного десятичного с плавающей точкой

## License

The MIT License

Copyright (c) 2018 GPU.js Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
