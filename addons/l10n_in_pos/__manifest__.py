# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Indian - Point of Sale',
    'version': '1.0',
    'description': """GST Point of Sale""",
    'category': 'Localization',
    'depends': [
        'l10n_in',
        'point_of_sale'
    ],
    'data': [
        'views/pos_config_views.xml'
    ],
    'auto_install': True,
}
