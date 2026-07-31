# amlro_interface

The original graphical interface for [AMLRO](https://github.com/RxnRover/amlro)
(Active Machine Learning Reaction Optimizer) — lets a bench chemist run a full
active-learning reaction-optimization campaign (define a reaction scope, collect
initial training data, then iteratively predict and record new conditions)
without writing Python.

This is the **initial version** of the AMLRO GUI. It has been superseded by
`amlro_gui`, a ground-up rewrite with the same underlying AMLRO integration but
a more robust architecture (file-backed experiment state instead of session
cookies, a proper JSON API, and a React/TypeScript frontend). This repo is kept
for reference and as the last version built the original way.

## Built with

- **Backend**: Flask, server-rendered with Jinja2 templates (`amlro_gui/templates/`)
- **Frontend**: vanilla JavaScript, hand-rolled `fetch` calls per page (`amlro_gui/static/js/`)
- **State**: experiment progress and uploaded data live in the Flask session
  cookie (client-side), not on disk
- **Optimization engine**: [AMLRO](https://github.com/RxnRover/amlro)
  (`amlro.generate_reaction_conditions`, `amlro.generate_training_data`,
  `amlro.optimizer`) — a dependency, not reimplemented here

## Running it

python -m venv venv
venv\Scripts\pip install -e .
venv\Scripts\python -m amlro_gui.main

Opens at `http://127.0.0.1:5000`.

`default_exp_dir/` may contain example experiment output
(config, generated reaction combinations, training/reaction data) from a past
run.