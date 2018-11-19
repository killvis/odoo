# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import re
import logging
from odoo import api, fields, models
from odoo.exceptions import UserError, ValidationError
from psycopg2 import IntegrityError
from odoo.tools.translate import _
_logger = logging.getLogger(__name__)


@api.model
def location_name_search(self, name='', args=None, operator='ilike', limit=100):
    if args is None:
        args = []

    records = self.browse()
    if len(name) == 2:
        records = self.search([('code', 'ilike', name)] + args, limit=limit)

    search_domain = [('name', operator, name)]
    if records:
        search_domain.append(('id', 'not in', records.ids))
    records += self.search(search_domain + args, limit=limit)

    # the field 'display_name' calls name_get() to get its value
    return [(record.id, record.display_name) for record in records]


class Country(models.Model):
    _name = 'res.country'
    _description = 'Country'
    _order = 'name'

    name = fields.Char(
        string='Country Name', required=True, translate=True, help='The full name of the country.')
    code = fields.Char(
        string='Country Code', size=2,
        help='The ISO country code in two chars. \nYou can use this field for quick search.')
    address_format = fields.Text(string="Layout in Reports",
        help="Display format to use for addresses belonging to this country.\n\n"
             "You can use python-style string pattern with all the fields of the address "
             "(for example, use '%(street)s' to display the field 'street') plus"
             "\n%(state_name)s: the name of the state"
             "\n%(state_code)s: the code of the state"
             "\n%(country_name)s: the name of the country"
             "\n%(country_code)s: the code of the country",
        default='%(street)s\n%(street2)s\n%(city)s %(state_code)s %(zip)s\n%(country_name)s')
    address_view_id = fields.Many2one(
        comodel_name='ir.ui.view', string="Input View",
        domain=[('model', '=', 'res.partner'), ('type', '=', 'form')],
        help="Use this field if you want to replace the usual way to encode a complete address. "
             "Note that the address_format field is used to modify the way to display addresses "
             "(in reports for example), while this field is used to modify the input form for "
             "addresses.")
    currency_id = fields.Many2one('res.currency', string='Currency')
    image = fields.Binary(attachment=True)
    phone_code = fields.Integer(string='Country Calling Code')
    country_group_ids = fields.Many2many('res.country.group', 'res_country_res_country_group_rel',
                         'res_country_id', 'res_country_group_id', string='Country Groups')
    state_ids = fields.One2many('res.country.state', 'country_id', string='States')
    name_position = fields.Selection([
            ('before', 'Before Address'),
            ('after', 'After Address'),
        ], string="Customer Name Position", default="before",
        help="Determines where the customer/company name should be placed, i.e. after or before the address.")
    vat_label = fields.Char(string='Vat Label', translate=True, help="Use this field if you want to change vat label.")
    is_l10_base_install = fields.Boolean(string="Module Installed", compute='_compute_l10_base_install', inverse='_inverse_l10_base_install', help="Toggle button which allow possibility to activate/deactivate a country, \
        and install appropriate l10n_base_ module (which contain all of it's country specific data) if it exists.")
    is_l10_base_available = fields.Boolean(string="Module Install", compute="_compute_is_l10_base_available")

    _sql_constraints = [
        ('name_uniq', 'unique (name)',
            'The name of the country must be unique !'),
        ('code_uniq', 'unique (code)',
            'The code of the country must be unique !')
    ]

    name_search = location_name_search

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('code'):
                vals['code'] = vals['code'].upper()
        return super(Country, self).create(vals_list)

    @api.multi
    def write(self, vals):
        if vals.get('code'):
            vals['code'] = vals['code'].upper()
        return super(Country, self).write(vals)

    @api.multi
    def get_address_fields(self):
        self.ensure_one()
        return re.findall(r'\((.+?)\)', self.address_format)

    def _compute_l10_base_install(self):
        installed_l10n_modules = self.env['ir.module.module'].search([('name', 'ilike', 'l10n_base_'), ('state', '=', 'installed')])
        for country in self:
            if country.code:
                module_name = 'l10n_base_%s' % country.code.lower()
                country.is_l10_base_install = module_name in installed_l10n_modules.mapped('name')

    @api.depends('is_l10_base_install')
    def _compute_is_l10_base_available(self):
        for country in self:
            module_name = 'l10n_base_%s' % country.code.lower()
            base_module = self.env['ir.module.module'].search([('name', '=', module_name)])
            country.is_l10_base_available = bool(base_module)

    def _inverse_l10_base_install(self):
        for country in self:
            if not country.code:
                raise ValidationError('You should define country code to load localisation data')
            module_name = 'l10n_base_%s' % country.code.lower()
            base_module = self.env['ir.module.module'].search([('name', '=', module_name)])
            if base_module:
                if country.is_l10_base_install:
                    base_module.button_immediate_install()
                else:
                    base_module.button_immediate_uninstall()
            else:
                raise UserError('Localisation module is not available')

class CountryGroup(models.Model):
    _description = "Country Group"
    _name = 'res.country.group'

    name = fields.Char(required=True, translate=True)
    country_ids = fields.Many2many('res.country', 'res_country_res_country_group_rel',
                                   'res_country_group_id', 'res_country_id', string='Countries')


class CountryState(models.Model):
    _description = "Country state"
    _name = 'res.country.state'
    _order = 'code'

    country_id = fields.Many2one('res.country', string='Country', required=True)
    name = fields.Char(string='State Name', required=True,
               help='Administrative divisions of a country. E.g. Fed. State, Departement, Canton')
    code = fields.Char(string='State Code', help='The state code.', required=True)

    _sql_constraints = [
        ('name_code_uniq', 'unique(country_id, code)', 'The code of the state must be unique by country !')
    ]

    @api.model
    def _name_search(self, name, args=None, operator='ilike', limit=100, name_get_uid=None):
        if args is None:
            args = []
        if self.env.context.get('country_id'):
            args = args + [('country_id', '=', self.env.context.get('country_id'))]
        first_state_ids = self._search([('code', '=ilike', name)] + args, limit=limit, access_rights_uid=name_get_uid)
        search_domain = [('name', operator, name)]
        search_domain.append(('id', 'not in', first_state_ids))
        state_ids = first_state_ids + self._search(search_domain + args, limit=limit, access_rights_uid=name_get_uid)
        return [(state.id, state.display_name) for state in self.browse(state_ids)]
