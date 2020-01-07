# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': '',
    'version': '1.0',
    'category': 'Hidden',
    'summary': 'SO/PO links in case of MTO',
    'description': """
Add directly link between Sale Order and Purchase Order for when 
Make to Order is activated on a product in line of Sale Order.
""",
    'depends': ['sale_stock', 'purchase_stock', 'sale_purchase'],
    'data': [
        'views/purchase_order_views.xml',
        'views/sale_order_views.xml'
    ],
    'demo': [],
    'qweb': [],
    'installable': True,
    'auto_install': True,
}
