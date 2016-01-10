const extend      = require('./utils/extend');
const getOriginXY = require('./utils/getOriginXY');
const defaults    = require('./defaultOptions');
const signals     = require('./utils/Signals').new();

class InteractEvent {
  constructor (interaction, event, action, phase, element, related) {
    const target      = interaction.target;
    const deltaSource = (target && target.options || defaults).deltaSource;
    const origin      = getOriginXY(target, element);
    const starting    = phase === 'start';
    const ending      = phase === 'end';
    const coords      = starting? interaction.startCoords : interaction.curCoords;

    element = element || interaction.element;

    const page   = extend({}, coords.page);
    const client = extend({}, coords.client);

    page.x -= origin.x;
    page.y -= origin.y;

    client.x -= origin.x;
    client.y -= origin.y;

    this.ctrlKey       = event.ctrlKey;
    this.altKey        = event.altKey;
    this.shiftKey      = event.shiftKey;
    this.metaKey       = event.metaKey;
    this.button        = event.button;
    this.buttons       = event.buttons;
    this.target        = element;
    this.currentTarget = element;
    this.relatedTarget = related || null;
    this.t0            = interaction.downTimes[interaction.downTimes.length - 1];
    this.type          = action + (phase || '');
    this.interaction   = interaction;
    this.interactable  = target;

    const signalArg = {
      interaction,
      event,
      action,
      phase,
      element,
      related,
      page,
      client,
      coords,
      starting,
      ending,
      deltaSource,
      iEvent: this,
    };

    signals.fire('set-xy', signalArg);

    if (ending) {
      const prevEvent = interaction.prevEvent;

      // use previous coords when ending
      this.pageX = prevEvent.pageX;
      this.pageY = prevEvent.pageY;
      this.clientX = prevEvent.clientX;
      this.clientY = prevEvent.clientY;
    }
    else {
      this.pageX     = page.x;
      this.pageY     = page.y;
      this.clientX   = client.x;
      this.clientY   = client.y;
    }

    this.x0        = interaction.startCoords.page.x - origin.x;
    this.y0        = interaction.startCoords.page.y - origin.y;
    this.clientX0  = interaction.startCoords.client.x - origin.x;
    this.clientY0  = interaction.startCoords.client.y - origin.y;

    signals.fire('set-delta', signalArg);

    this.timeStamp = coords.timeStamp;
    this.dt        = interaction.pointerDelta.timeStamp;
    this.duration  = this.timeStamp - interaction.downTimes[0];

    // speed and velocity in pixels per second
    this.speed = interaction.pointerDelta[deltaSource].speed;
    this.velocityX = interaction.pointerDelta[deltaSource].vx;
    this.velocityY = interaction.pointerDelta[deltaSource].vy;

    this.swipe = (ending || phase === 'inertiastart')? this.getSwipe() : null;

    signals.fire('new', signalArg);
  }

  getSwipe () {
    const interaction = this.interaction;

    if (interaction.prevEvent.speed < 600
        || this.timeStamp - interaction.prevEvent.timeStamp > 150) {
      return null;
    }

    let angle = 180 * Math.atan2(interaction.prevEvent.velocityY, interaction.prevEvent.velocityX) / Math.PI;
    const overlap = 22.5;

    if (angle < 0) {
      angle += 360;
    }

    const left = 135 - overlap <= angle && angle < 225 + overlap;
    const up   = 225 - overlap <= angle && angle < 315 + overlap;

    const right = !left && (315 - overlap <= angle || angle <  45 + overlap);
    const down  = !up   &&   45 - overlap <= angle && angle < 135 + overlap;

    return {
      up,
      down,
      left,
      right,
      angle,
      speed: interaction.prevEvent.speed,
      velocity: {
        x: interaction.prevEvent.velocityX,
        y: interaction.prevEvent.velocityY,
      },
    };
  }

  preventDefault () {}

  stopImmediatePropagation () {
    this.immediatePropagationStopped = this.propagationStopped = true;
  }

  stopPropagation () {
    this.propagationStopped = true;
  }
}

signals.on('set-delta', function ({ iEvent, interaction, ending, starting, deltaSource }) {
  if (starting) {
    iEvent.dx = 0;
    iEvent.dy = 0;
  }
  // end event dx, dy is difference between start and end points
  else if (ending) {
    if (deltaSource === 'client') {
      iEvent.dx = iEvent.clientX - interaction.startCoords.client.x;
      iEvent.dy = iEvent.clientY - interaction.startCoords.client.y;
    }
    else {
      iEvent.dx = iEvent.pageX - interaction.startCoords.page.x;
      iEvent.dy = iEvent.pageY - interaction.startCoords.page.y;
    }
  }
  else {
    if (deltaSource === 'client') {
      iEvent.dx = iEvent.clientX - interaction.prevEvent.clientX;
      iEvent.dy = iEvent.clientY - interaction.prevEvent.clientY;
    }
    else {
      iEvent.dx = iEvent.pageX - interaction.prevEvent.pageX;
      iEvent.dy = iEvent.pageY - interaction.prevEvent.pageY;
    }
  }
});

InteractEvent.signals = signals;

module.exports = InteractEvent;
