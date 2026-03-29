#!/bin/bash
python manage.py migrate
python manage.py seed_data
python manage.py runserver