from flask import Flask, render_template, request, jsonify,redirect, url_for, session, flash
import os
import json
import pandas as pd
from amlro.generate_reaction_conditions import get_reaction_scope
from amlro.generate_training_data import generate_training_data
from amlro.optimizer import get_optimized_parameters
import numpy as np
import os
import webbrowser
import threading

secret_key = os.urandom(16)
app = Flask(__name__)
app.secret_key = secret_key

def run_app():
    """Run Flask app."""
    app.run(host="127.0.0.1", port=5000, debug=False)

def launch():
    """Open browser + start Flask."""
    threading.Timer(1.0, lambda: webbrowser.open("http://127.0.0.1:5000/")).start()
    run_app()

@app.route('/')
def main_page():
    return render_template('main.html')

@app.route('/set_mode/<mode>')
def set_mode(mode):
    """Sets the optimization mode and redirects to the dashboard."""
    session['optimization_mode'] = mode  # 'new' or 'old'
    session['progress'] = {'reaction_scope': False, 'training_set': False, 'optimization': False}
    return redirect(url_for('amlro_dashboard'))

@app.route('/amlro_dashboard')
def amlro_dashboard():
    # Retrieve the optimization mode from the session
    optimization_mode = session.get('optimization_mode', 'new')
    progress = session.get('progress', {'reaction_scope': False, 'training_set': False, 'optimization': False})
    return render_template('dashboard.html', optimization_mode=optimization_mode, progress=progress)

@app.route('/upload_old_data', methods=['GET', 'POST'])
def upload_old_data():
    if request.method == 'POST':
        file = request.files['old_data']
        new_file_name = request.form.get('new_file_name', 'new_file.csv')
        new_exp_dir = request.form.get('new_exp_dir')
        df = pd.read_csv(file)
        session['old_data'] = df.to_dict()
        session['exp_dir'] = new_exp_dir
        session['file_name'] = new_file_name
        session['column_order'] = list(df.columns)
        return render_template('verify_data.html', df=df.to_html(classes='table table-striped table-bordered',index=True), new_file_name=new_file_name)
    return render_template('upload_data.html')

@app.route('/verify_data', methods=['POST'])
def verify_data():
    # Set optimization mode to 'old' and progress for two buttons
    if request.json.get('save_data'):
        session['optimization_mode'] = 'old'
        session['progress'] = {'reaction_scope': False, 'training_set': False, 'optimization': False}

        df = pd.DataFrame.from_dict(session['old_data'])
        df = df[session['column_order']]
        os.makedirs(session['exp_dir'], exist_ok=True)
        df.to_csv(os.path.join(session['exp_dir'],session['file_name']),index=False)
        return jsonify({'success': True, 'message': 'Data verified and saved!'})
    else:
        return jsonify({'success': False, 'message': 'Invalid request.'})

@app.route('/reaction_scope', methods=['GET', 'POST'])
def reaction_scope():
    if request.method == 'POST':
        config = request.json
        #config_dict = json.loads(config)
        exp_dir = config.pop('exp_dir', 'default_exp_dir')
        sampling_method = config['sampling']
        training_size = config['training_size']
        batch_size = config['batch_size']
        file_name = config['file_name']
        session['progress'] = {'reaction_scope': True, 'training_set': False, 'optimization': False}
        session['config'] = config
        session['exp_dir'] = exp_dir
        session['batch_size'] = batch_size
        session['file_name'] = file_name

        # Create experiment directory
        os.makedirs(exp_dir, exist_ok=True)

        # Write config to file
        with open(os.path.join(exp_dir, 'config.json'), 'w') as f:
            json.dump(config, f, indent=2)

        get_reaction_scope(config=config, sampling=sampling_method, write_files=True, exp_dir=exp_dir)

        return jsonify({"success": True, "message": "Reaction space created and files generated successfully"})

    return render_template('reaction_scope.html')

@app.route('/config_result')
def config_result():
    return render_template('config_result.html')

@app.route('/start_training')
def start_training():
    session['training_progress'] = {
        'current_iteration': 0,
        'parameters': [],
        'objectives': []
    }
    return redirect(url_for('training'))

@app.route('/training', methods=['GET', 'POST'])
def training():

    config = session.get('config')
    exp_dir = session.get('exp_dir')
    training_progress = session.get('training_progress')

    if request.method == 'GET':
        # First time or refreshing the page
        parameters = generate_training_data(
            exp_dir=exp_dir,
            config=config,
            parameters=training_progress['parameters'],
            obj_values=training_progress['objectives']
        )

        training_progress['parameters'] = parameters
        session['training_progress'] = training_progress
        session['training_size'] = len(pd.read_csv(os.path.join(exp_dir, 'training_combo.csv')))


        return render_template('training.html',
                               parameters=parameters,
                               objective_names=config['objectives'],
                               current_iteration=training_progress['current_iteration'],
                               training_size=session['training_size'],
                               feature_names=config['continuous']['feature_names'] + config['categorical']['feature_names'])

    elif request.method == 'POST':
        data = request.json
        obj_values = data.get('obj_values', [])
        completed_data = data.get('completed_data',{})

        training_progress['objectives'] = obj_values
        training_progress['current_iteration'] += 1

        if training_progress['current_iteration'] == session['training_size']:
            # Training completed
            generate_training_data(
                exp_dir=exp_dir,
                config=config,
                parameters=training_progress['parameters'],
                obj_values=training_progress['objectives'],
                termination=True
            )
            session['progress'] = {'reaction_scope': True, 'training_set': True, 'optimization': False}
            return jsonify({"complete": True, "completed_data": completed_data, "message": "Training set generation complete!"})

        # Generate next set of parameters
        parameters = generate_training_data(
            exp_dir=exp_dir,
            config=config,
            parameters=training_progress['parameters'],
            obj_values=training_progress['objectives']
        )
        training_progress['parameters'] = parameters
        session['training_progress'] = training_progress

        return jsonify({
            "complete": False,
            "parameters": parameters,
            "completed_data": completed_data,
            "current_iteration": training_progress['current_iteration']
        })


@app.route('/update_batch_size', methods=['POST'])
def update_batch_size():
    data = request.json
    new_size = int(data['batch_size'])
    print(new_size)
    session['batch_size'] = new_size
    return jsonify({'success': True, 'new_batch_size':new_size})

@app.route('/start_prediction')
def start_prediction():
    session['prediction_progress'] = {
        'current_iteration': 0,
        'parameters': [],
        'objectives': []
    }
    session['progress'] = {'reaction_scope': True, 'training_set': True, 'optimization': False}
    return redirect(url_for('prediction'))

@app.route('/prediction', methods=['GET', 'POST'])
def prediction():

    #exp_dir = "D:/Reaction optimization/test"
    #with open("D:/Reaction optimization/test/config.json", 'r') as file:
    #config = json.load(file)
    config = session.get('config')
    exp_dir = session.get('exp_dir')

    prediction_progress = session.get('prediction_progress')
    batch_size = session['batch_size'] #session.get('batch_size')['size']
    #session['batch_size'] = 5
    #batch_size = 5
    print(int(batch_size))

    if request.method == 'GET':
        # First time or refreshing the page
        print('exp_dir',exp_dir)

        parameters = get_optimized_parameters(
            exp_dir=exp_dir,
            config=config,
            parameters_list=[],
            objectives_list=[],
            batch_size=batch_size
        )
        return render_template('prediction.html',
                               parameters=parameters,
                               objective_names=config['objectives'],
                               current_iteration=prediction_progress['current_iteration'],
                               feature_names=config['continuous']['feature_names'] + config['categorical']['feature_names'])

    elif request.method == 'POST':
        data = request.json
        objectives = data.get('objectives', [])
        parameters = data.get('parameters', [])

        prediction_progress['current_iteration'] += 1
        print(data.get('stop'))
        stop_optimization = data.get('stop', False)

        prediction_progress['objectives'] = objectives
        prediction_progress['parameters'] = parameters

        if stop_optimization:
            # Finalize optimization
            get_optimized_parameters(
                exp_dir=exp_dir,
                config=config,
                parameters_list=prediction_progress['parameters'],
                objectives_list=prediction_progress['objectives'],
                termination=True
            )
            session['progress']['optimization'] = True
            return jsonify({"complete": True, "message": "Optimization completed!"})

        # Generate next set of parameters
        parameters = get_optimized_parameters(
            exp_dir=exp_dir,
            config=config,
            parameters_list=prediction_progress['parameters'],
            objectives_list=prediction_progress['objectives'],
            batch_size=batch_size
        )

        session['prediction_progress'] = prediction_progress

        return jsonify({
            "complete": False,
            "parameters": parameters,
            "current_iteration": prediction_progress['current_iteration']
        })


if __name__ == '__main__':
    app.run(debug=True)