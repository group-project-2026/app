#!/bin/bash
python manage.py migrate
python manage.py seed_data_fermi
python manage.py runserver